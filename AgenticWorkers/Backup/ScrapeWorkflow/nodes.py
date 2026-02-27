from langchain_groq import ChatGroq
from langchain.agents import create_react_agent, AgentExecutor
from langchain.prompts import PromptTemplate
from langchain.schema import HumanMessage, SystemMessage
from state import ResearchState
from tools import ALL_TOOLS, search_internet_tavily, scrape_urls_batch, scrape_with_download
from database import GrievanceDatabase
from config import Config
from typing import Dict, List
import json
import sys
import os
from tools import save_scraped_content

# Initialize LLM
llm = ChatGroq(
    api_key=Config.GROQ_API_KEY,
    model=Config.GROQ_MODEL,
    temperature=Config.GROQ_TEMPERATURE,
    max_retries=2
)

# Initialize services
db = GrievanceDatabase()

def translate_to_english(text: str) -> Dict[str, str]:
    """
    Translate non-English text to English using LLM
    
    Args:
        text: Input text (may be in any language)
        
    Returns:
        Dict with 'original', 'translated', and 'language' keys
    """
    print(f"🌐 Detecting language and translating...")
    
    # Use LLM to detect and translate
    translation_prompt = f"""
Analyze this text and determine if it's in English or another language (likely Hindi, Marathi, or other Indian language).

Text: "{text}"

If the text is NOT in English:
1. Identify the language
2. Translate it to English accurately

Return a JSON object with this format:
{{
    "language": "detected language (e.g., Hindi, Marathi, English)",
    "is_english": true/false,
    "translated": "English translation (or same text if already English)"
}}

Return ONLY the JSON, nothing else.
"""
    
    try:
        response = llm.invoke([HumanMessage(content=translation_prompt)])
        content = response.content.strip()
        
        # Extract JSON
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        result = json.loads(content)
        
        if result.get('is_english', True):
            print(f"Text is in English")
            return {
                'original': text,
                'translated': text,
                'language': 'English'
            }
        else:
            print(f"Detected {result.get('language', 'Unknown')} → Translated to English")
            return {
                'original': text,
                'translated': result.get('translated', text),
                'language': result.get('language', 'Unknown')
            }
            
    except Exception as e:
        print(f" Translation failed: {e}, using original text")
        return {
            'original': text,
            'translated': text,
            'language': 'Unknown'
        }

# ReAct Agent Template
REACT_PROMPT = PromptTemplate.from_template("""
You are an intelligent research agent helping to gather comprehensive information about citizen grievances in India.

GRIEVANCE DETAILS:
Text: {grievance_text}
Category: {grievance_category}
Priority: {priority}
Enhanced Query: {enhanced_query}

RESEARCH PROGRESS:
Topics Covered: {topics_covered}
Current Loop: {loop_count}/{max_loops}
Documents Stored: {documents_stored}

YOUR MISSION:
Research the following areas to help resolve this grievance:
1. Government policies, subsidies, and schemes
2. Department jurisdiction and past actions
3. Cost allocation and budget information
4. Similar citizen complaints and their solutions
5. Latest news and regulatory updates
6. Legal compliance and regulations
7. Resource allocation and planning

Available tools:
{tools}

Tool Names: {tool_names}

INSTRUCTIONS:
- Generate specific search queries related to Indian government, policies, and the grievance topic
- Focus on official government sources (.gov.in), news sites, and policy documents
- Avoid already covered topics: {topics_covered}
- Be specific and actionable in your research

Use this format:
Thought: [Your reasoning about what to research next]
Action: [tool name]
Action Input: [input for the tool]
Observation: [tool result]
... (repeat Thought/Action/Observation as needed)
Thought: I have gathered useful information
Final Answer: [Brief summary of findings]

{agent_scratchpad}

Begin! What should we research next for this grievance?
""")

def initialize_research(state: ResearchState) -> ResearchState:
    """Initialize research state and plan research topics"""
    
    print(f"\n{'='*70}")
    print(f"🎯 Initializing Research for Grievance")
    print(f"{'='*70}")
    print(f"📝 Text: {state['grievance_text'][:150]}...")
    print(f"📂 Category: {state.get('grievance_category', 'N/A')}")
    print(f"⚡ Priority: {state.get('priority', 'medium')}")
    print(f"{'='*70}\n")
    
    # Translate grievance to English if needed
    translation_result = translate_to_english(state['grievance_text'])
    state['original_text'] = translation_result['original']
    state['english_text'] = translation_result['translated']
    state['detected_language'] = translation_result['language']
    
    # Use English text for research
    research_text = state['english_text']
    
    # Generate research topics using LLM
    topic_prompt = f"""
    For this citizen grievance in India:
    "{research_text}"
    Category: {state.get('grievance_category', 'General')}
    
    Generate 5-7 specific research topics focusing on:
    - Government policies and schemes (central and state)
    - Department responsibilities and jurisdiction
    - Budget allocation and costs
    - Similar past cases and resolutions
    - Latest regulatory updates
    - Legal compliance requirements
    - Resource planning
    
    Return ONLY a JSON array of topic strings, each being a specific search query IN ENGLISH.
    Example: ["Mumbai municipal corporation water supply scheme 2026", "Maharashtra state water policy budget allocation"]
    """
    
    try:
        response = llm.invoke([HumanMessage(content=topic_prompt)])
        content = response.content.strip()
        
        # Extract JSON array
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        topics = json.loads(content)
        
        if isinstance(topics, list) and len(topics) > 0:
            state['research_topics'] = topics[:5]
            print(f"Generated {len(state['research_topics'])} research topics:")
            for i, t in enumerate(state['research_topics'], 1):
                print(f"   {i}. {t}")
        else:
            # Fallback
            state['research_topics'] = [
                f"India government policy for {state.get('grievance_category', {}).get('primary', 'public service')}",
                f"Municipal corporation India {state.get('grievance_category', {}).get('primary', 'grievance')} resolution"
            ]
            print(f" Using fallback topics")
    except Exception as e:
        print(f" Topic generation failed: {e}")
        # Fallback topics
        state['research_topics'] = [
            "India local government grievance resolution policy",
            "Municipal corporation citizen complaint management"
        ]
        print(f" Using fallback topics")
    
    state['loop_count'] = 0
    state['should_continue'] = True
    state['documents_stored'] = 0
    state['total_urls_found'] = 0
    state['successful_scrapes'] = 0
    state['failed_scrapes'] = 0
    
    return state

def plan_next_research(state: ResearchState) -> ResearchState:
    """Use LLM to plan next research action"""
    
    print(f"\nPlanning Research (Loop {state['loop_count'] + 1}/{state['max_loops']})")
    
    # Safety checks
    if state['loop_count'] >= state['max_loops']:
        print("⏹️ Max loops reached")
        state['should_continue'] = False
        return state
    
    if db.get_total_files_count() >= Config.MAX_TOTAL_DOCUMENTS:
        print("⏹️ Max total documents reached")
        state['should_continue'] = False
        return state
    
    # Find uncovered topics
    covered = state.get('topics_covered', [])
    topics = state.get('research_topics', [])
    uncovered = [t for t in topics if t not in covered]
    
    if not uncovered:
        print("All research topics covered")
        state['should_continue'] = False
        return state
    
    # Use LLM to select and refine next query
    next_topic = uncovered[0]
    print(f"📍 Topic: {next_topic}")
    
    refine_prompt = f"""
Given this research topic about an Indian grievance:
"{next_topic}"

Original grievance context: {state.get('english_text', state['grievance_text'])[:200]}

Generate ONE specific, focused search query IN ENGLISH (max 10 words) that will find:
- Official government sources (.gov.in)
- Municipal corporation policies  
- News articles about similar cases
- Department contact information

Return ONLY the search query text in English, nothing else.
Example: "Maharashtra garbage collection policy 2026"
    """
    
    try:
        response = llm.invoke([HumanMessage(content=refine_prompt)])
        refined_query = response.content.strip().strip('"').strip("'")
        state['current_query'] = refined_query
        print(f" Refined query: {refined_query}")
    except Exception as e:
        print(f" Query refinement failed: {e}")
        state['current_query'] = next_topic
    
    state['loop_count'] += 1
    
    return state

def search_web(state: ResearchState) -> ResearchState:
    """Search internet using Tavily"""
    
    query = state['current_query']
    print(f"\n Searching: {query[:100]}")
    
    results = search_internet_tavily(query, max_results=Config.MAX_URLS_PER_SEARCH)
    
    state['search_results'] = results
    state['urls_to_scrape'] = [r['url'] for r in results if r.get('url')]
    state['total_urls_found'] = len(state['urls_to_scrape'])
    
    print(f"Found {len(state['urls_to_scrape'])} URLs to scrape")
    
    return state

def scrape_content(state: ResearchState) -> ResearchState:
    """Scrape content from URLs and download files"""
    
    urls = state.get('urls_to_scrape', [])
    processed = state.get('processed_urls', [])
    
    # Filter out already processed URLs and duplicates in database
    new_urls = [
        url for url in urls 
        if url not in processed and not db.check_url_exists(url)
    ]
    
    if not new_urls:
        print("⏭️ No new URLs to scrape")
        sys.stdout.flush()
        state['scraped_documents'] = []
        state['downloaded_files'] = []
        return state
    
    print(f"\n🕷️ Scraping {len(new_urls)} new URLs (includes file downloads)")
    sys.stdout.flush()
    
    # Use scrape_with_download to handle both web pages and files
    grievance_id = state.get('grievance_id', 0)
    result = scrape_with_download(new_urls, grievance_id)
    
    scraped = result['scraped_content']
    downloaded = result['downloaded_files']
    
    state['scraped_documents'] = scraped
    state['downloaded_files'] = downloaded
    state['processed_urls'] = new_urls
    state['successful_scrapes'] = len(scraped)
    state['failed_scrapes'] = len(new_urls) - len(scraped) - len(downloaded)
    
    print(f"\nScraping complete: {len(scraped)} web pages + {len(downloaded)} files")
    if downloaded:
        print(f" Downloaded files summary:")
        for f in downloaded:
            size_kb = f.get('size_bytes', 0) / 1024
            print(f"   • {f['filename']} ({size_kb:.1f} KB)")
    sys.stdout.flush()
    
    return state

def save_scraped_data(state: ResearchState) -> ResearchState:
    """Save scraped data to text and markdown files"""
    
    documents = state.get('scraped_documents', [])
    downloaded_files = state.get('downloaded_files', [])
    
    total_items = len(documents) + len(downloaded_files)
    
    if total_items == 0:
        print("⏭️ No documents to process")
        sys.stdout.flush()
        return state
    
    print(f"\n💾 Saving {len(documents)} web pages + {len(downloaded_files)} files = {total_items} items")
    sys.stdout.flush()
    
    saved_count = 0
    
    # Save web page content as markdown files
    for idx, doc in enumerate(documents, 1):
        try:
            content = doc.get('content', '')
            if not content or len(content) < 100:
                print(f"   {idx}. ⏭️ Skipping (too short)")
                sys.stdout.flush()
                continue
            
            url_display = doc.get('url', 'unknown')[:60]
            print(f"   {idx}/{len(documents)}. 💾 Saving: {url_display}...", end='', flush=True)
            
            # Save as markdown file
            filepath = doc.get('saved_filepath')
            if filepath and os.path.exists(filepath):
                # Already saved by scraper
                saved_count += 1
                print(f" Already saved")
            else:
                # Save now
                filepath = save_scraped_content(
                    content=content,
                    url=doc['url'],
                    grievance_id=state['grievance_id'],
                    title=doc.get('title', '')
                )
                if filepath:
                    saved_count += 1
                    print(f" Saved to {os.path.basename(filepath)}")
                else:
                    print(f"  Save failed")
            
            sys.stdout.flush()
        
        except Exception as e:
            print(f" → ❌ Error: {str(e)[:100]}")
            sys.stdout.flush()
            state['errors'] = [str(e)[:200]]
    
    # Downloaded files are already saved by the scraper
    if downloaded_files:
        print(f"\n Downloaded files already saved:")
        for idx, file_info in enumerate(downloaded_files, 1):
            filename = file_info.get('filename', 'unknown')
            filepath = file_info.get('filepath', '')
            print(f"   {idx}. {filename} → {filepath}")
            saved_count += 1
        sys.stdout.flush()
    
    state['documents_stored'] = state.get('documents_stored', 0) + saved_count
    state['topics_covered'] = [state['current_query']]
    
    print(f"\nTotal saved: {saved_count}/{total_items} items to disk")
    print(f" Session stats: {state['documents_stored']} files saved")
    sys.stdout.flush()
    
    return state

def check_continuation(state: ResearchState) -> str:
    """Decide whether to continue research loop"""
    
    # Safety checks
    if state['loop_count'] >= state['max_loops']:
        print("\n⏹️ Stopping: Max loops reached")
        return "end"
    
    if db.get_total_files_count() >= Config.MAX_TOTAL_DOCUMENTS:
        print("\n⏹️ Stopping: Max total documents reached")
        return "end"
    
    # Check if all topics covered
    covered = len(state.get('topics_covered', []))
    total = len(state.get('research_topics', []))
    
    if covered >= total and total > 0:
        print(f"\nStopping: All {total} topics covered")
        return "end"
    
    # Check if no results in last few loops
    if state.get('successful_scrapes', 0) == 0:
        if state['loop_count'] >= 3:
            print("\n⏹️ Stopping: No results in multiple loops")
            return "end"
    
    print(f"\n🔄 Continuing research ({covered}/{total} topics covered)")
    return "continue"

def finalize_research(state: ResearchState) -> ResearchState:
    """Finalize research and generate summary"""
    
    print(f"\n{'='*70}")
    print(f"Research Complete for Grievance {state['grievance_id']}")
    print(f"{'='*70}")
    print(f" Statistics:")
    print(f"   - Loops executed: {state['loop_count']}")
    print(f"   - Topics covered: {len(state.get('topics_covered', []))}/{len(state.get('research_topics', []))}")
    print(f"   - Files saved: {state.get('documents_stored', 0)}")
    print(f"   - URLs processed: {len(state.get('processed_urls', []))}")
    print(f"   - Successful scrapes: {state.get('successful_scrapes', 0)}")
    print(f"{'='*70}\n")
    
    # Generate summary using LLM
    summary_prompt = f"""
    Summarize the research findings for this grievance:
    "{state['grievance_text'][:200]}"
    
    Research conducted on:
    {', '.join(state.get('topics_covered', []))}
    
    {state.get('documents_stored', 0)} files were collected and saved.
    
    Provide a brief 2-3 sentence summary of what information was gathered to help resolve this grievance.
    """
    
    try:
        response = llm.invoke([HumanMessage(content=summary_prompt)])
        summary = response.content.strip()
        state['research_summary'] = summary
        
        print(f"📝 Summary: {summary}\n")
    except Exception as e:
        print(f" Summary generation failed: {e}")
        state['research_summary'] = f"Research completed with {state['documents_stored']} files saved."
    
    return state
