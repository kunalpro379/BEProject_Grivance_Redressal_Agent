from typing import TypedDict, List, Dict, Optional, Annotated
import operator

class ResearchState(TypedDict):
    """State for LangGraph research workflow"""
    
    # Grievance Information
    grievance_id: str
    grievance_text: str
    original_text: Optional[str]  # Original text if translated
    english_text: Optional[str]  # English translation for research
    detected_language: Optional[str]  # Detected language
    grievance_category: Optional[Dict]
    enhanced_query: Optional[str]
    priority: str
    
    # Research Planning
    research_topics: List[str]
    topics_covered: Annotated[List[str], operator.add]
    current_query: str
    
    # Search Results
    search_results: List[Dict]
    urls_to_scrape: List[str]
    
    # Scraped Content
    scraped_documents: List[Dict]
    downloaded_files: List[Dict]  # Downloaded PDFs/docs
    processed_urls: Annotated[List[str], operator.add]
    
    # Storage
    documents_stored: int
    
    # Loop Control
    loop_count: int
    max_loops: int
    should_continue: bool
    
    # Statistics
    total_urls_found: int
    successful_scrapes: int
    failed_scrapes: int
    
    # Agent Reasoning
    agent_thoughts: Annotated[List[str], operator.add]
    research_summary: str
    
    # Error Handling
    errors: Annotated[List[str], operator.add]
    last_error: Optional[str]
