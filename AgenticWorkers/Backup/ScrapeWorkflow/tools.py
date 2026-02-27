from langchain.tools import Tool
from tavily import TavilyClient
from typing import List, Dict, Optional
import asyncio
import re
import json
import os
import sys
import requests
import urllib.parse
from datetime import datetime
from config import Config
from crawl4ai import AsyncWebCrawler
from crawl4ai.extraction_strategy import LLMExtractionStrategy

# Initialize Tavily client
tavily_client = None
if Config.TAVILY_API_KEY:
    tavily_client = TavilyClient(api_key=Config.TAVILY_API_KEY)

async def crawl_url_async(url: str, grievance_id: str = None) -> Dict[str, str]:
    """
    Asynchronously crawl URL using crawl4ai and save immediately
    
    Args:
        url: URL to crawl
        grievance_id: Grievance ID for saving files
        
    Returns:
        Dict with url, content, and status
    """
    try:
        print(f"  🌐 Crawling: {url[:60]}...", end='', flush=True)
        # Performance optimizations: disable images, media, and unnecessary resources
        browser_config = {
            'headless': True,
            'verbose': False,
            'extra_args': [
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
                '--no-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--blink-settings=imagesEnabled=false',  # Disable images for speed
                '--disable-remote-fonts',
                '--disable-default-apps'
            ]
        }
        
        async with AsyncWebCrawler(**browser_config) as crawler:
            # Reduce timeout to 5 seconds for faster processing
            result = await asyncio.wait_for(
                crawler.arun(
                    url=url,
                    bypass_cache=True,
                    wait_for=None,  # Don't wait for specific elements
                    delay_before_return_html=0.3  # Minimal delay
                ),
                timeout=5
            )
            
            if result.success:
                # Prefer markdown, fallback to cleaned_html
                content = result.markdown or result.cleaned_html or result.html
                print(f" {len(content)} chars", end='', flush=True)
                
                # Save immediately if grievance_id provided
                saved_filepath = None
                if grievance_id and content:
                    try:
                        saved_filepath = save_scraped_content(
                            content=content[:Config.MAX_TOKENS_PER_DOC],
                            url=url,
                            grievance_id=grievance_id,
                            title=result.title or ''
                        )
                        if saved_filepath:
                            print(f" → 💾 Saved!", flush=True)
                        else:
                            print(f" →  Save failed", flush=True)
                    except Exception as e:
                        print(f" → ❌ Save error: {str(e)[:50]}", flush=True)
                else:
                    print(flush=True)
                
                return {
                    'url': url,
                    'content': content[:Config.MAX_TOKENS_PER_DOC],
                    'status': 'success',
                    'title': result.title or '',
                    'saved_filepath': saved_filepath,
                    'links_count': len(result.links) if hasattr(result, 'links') else 0
                }
            else:
                print(f" ❌ Failed", flush=True)
                return {
                    'url': url,
                    'content': '',
                    'status': 'failed',
                    'error': result.error_message if hasattr(result, 'error_message') else 'Unknown error'
                }
    except asyncio.TimeoutError:
        print(f" ⏱️ Timeout", flush=True)
        return {'url': url, 'content': '', 'status': 'timeout', 'error': 'Timeout after 5s'}
    except Exception as e:
        print(f" ❌ Error: {str(e)[:50]}", flush=True)
        return {
            'url': url,
            'content': '',
            'status': 'failed',
            'error': str(e)[:200]
        }

def search_internet_tavily(query: str, max_results: int = None) -> List[Dict]:
    """
    Search internet using Tavily API
    
    Args:
        query: Search query string
        max_results: Maximum number of results (default from config)
        
    Returns:
        List of search results with url, title, content
    """
    if not tavily_client:
        print(" Tavily client not initialized (missing API key)")
        return []
    
    if max_results is None:
        max_results = Config.MAX_URLS_PER_SEARCH
    
    try:
        print(f" Tavily search: '{query[:100]}'")
        response = tavily_client.search(
            query=query,
            max_results=max_results,
            search_depth=Config.SEARCH_DEPTH,
            include_domains=None,
            exclude_domains=['facebook.com', 'twitter.com', 'instagram.com']
        )
        
        results = response.get('results', [])
        print(f"Found {len(results)} search results")
        
        return [
            {
                'url': r.get('url', ''),
                'title': r.get('title', ''),
                'content': r.get('content', ''),
                'score': r.get('score', 0.0)
            }
            for r in results
        ]
    except Exception as e:
        print(f"❌ Tavily search error: {e}")
        return []

def scrape_urls_batch(urls: List[str], grievance_id: str = None) -> List[Dict]:
    """
    Scrape multiple URLs using crawl4ai and save immediately
    
    Args:
        urls: List of URLs to scrape
        grievance_id: Grievance ID for saving files
        
    Returns:
        List of scraped documents
    """
    if not urls:
        return []
    
    print(f"🌐 Scraping {len(urls)} URLs (saving as we go)...")
    
    async def scrape_all():
        tasks = [crawl_url_async(url, grievance_id) for url in urls[:Config.MAX_URLS_PER_SEARCH]]
        # Use return_exceptions=True to prevent one failure from blocking others
        return await asyncio.gather(*tasks, return_exceptions=True)
    
    # Run async scraping
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    try:
        # Add global timeout of 20 seconds for entire batch
        results = loop.run_until_complete(asyncio.wait_for(scrape_all(), timeout=20))
    except asyncio.TimeoutError:
        print(f" Batch timeout after 20s - some URLs may be incomplete")
        return []
    except Exception as e:
        print(f"❌ Batch scrape error: {e}")
        return []
    
    # Filter successful scrapes and handle exceptions
    successful = []
    for r in results:
        if isinstance(r, Exception):
            print(f" Skipped URL due to error: {str(r)[:100]}")
            continue
        if isinstance(r, dict) and r.get('status') == 'success' and r.get('content'):
            successful.append(r)
    
    print(f"Scraped & saved: {len(successful)}/{len(urls)} URLs")
    
    return successful

def extract_keywords_from_text(text: str, top_n: int = 10) -> List[str]:
    """
    Extract important keywords from text
    
    Args:
        text: Input text
        top_n: Number of top keywords to return
        
    Returns:
        List of keywords
    """
    if not text:
        return []
    
    # Simple keyword extraction using word frequency
    # Remove common stopwords
    stopwords = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
        'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    }
    
    # Extract words (4+ characters)
    words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
    
    # Filter stopwords and count frequency
    word_freq = {}
    for word in words:
        if word not in stopwords:
            word_freq[word] = word_freq.get(word, 0) + 1
    
    # Sort by frequency and return top N
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    return [word for word, freq in sorted_words[:top_n]]

def format_search_results_for_llm(results: List[Dict]) -> str:
    """
    Format search results as string for LLM consumption
    
    Args:
        results: List of search results
        
    Returns:
        Formatted string
    """
    if not results:
        return "No search results found."
    
    formatted = "Search Results:\n\n"
    for i, result in enumerate(results, 1):
        formatted += f"{i}. {result.get('title', 'Untitled')}\n"
        formatted += f"   URL: {result.get('url', 'N/A')}\n"
        formatted += f"   {result.get('content', '')[:200]}...\n\n"
    
    return formatted

def is_downloadable_file(url: str) -> bool:
    """
    Check if URL points to a downloadable document
    
    Args:
        url: URL to check
        
    Returns:
        True if URL is a downloadable file
    """
    url_lower = url.lower()
    return any(url_lower.endswith(ext) for ext in Config.SUPPORTED_DOC_EXTENSIONS)

def download_file(url: str, grievance_id: int, folder: str = None) -> Optional[Dict]:
    """
    Download file from URL
    
    Args:
        url: URL to download
        grievance_id: ID of grievance (for organizing files)
        folder: Custom folder path (default: FILES_DIR)
        
    Returns:
        Dict with download info or None if failed
    """
    try:
        # Create grievance-specific folder
        if folder is None:
            folder = Config.FILES_DIR
        
        grievance_folder = os.path.join(folder, f"grievance_{grievance_id}")
        os.makedirs(grievance_folder, exist_ok=True)
        
        # Get filename from URL
        parsed_url = urllib.parse.urlparse(url)
        filename = os.path.basename(parsed_url.path)
        
        # Generate filename if not present or invalid
        if not filename or not os.path.splitext(filename)[1]:
            ext = '.pdf'  # default to PDF
            for supported_ext in Config.SUPPORTED_DOC_EXTENSIONS:
                if supported_ext in url.lower():
                    ext = supported_ext
                    break
            filename = f"downloaded_file_{abs(hash(url))}{ext}"
        
        # Sanitize filename
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        filepath = os.path.join(grievance_folder, filename)
        
        # Download with timeout and size limit
        print(f"   Downloading: {filename}")
        response = requests.get(
            url, 
            timeout=Config.DOWNLOAD_TIMEOUT,
            stream=True,
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        response.raise_for_status()
        
        # Check file size
        content_length = response.headers.get('content-length')
        if content_length and int(content_length) > Config.MAX_FILE_SIZE:
            print(f"   File too large: {int(content_length) / 1024 / 1024:.1f} MB")
            return None
        
        # Save file
        downloaded_size = 0
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                downloaded_size += len(chunk)
                if downloaded_size > Config.MAX_FILE_SIZE:
                    print(f"   File exceeded size limit during download")
                    os.remove(filepath)
                    return None
                f.write(chunk)
        
        print(f"  Downloaded: {filename} ({downloaded_size / 1024:.1f} KB)")
        
        return {
            'url': url,
            'filepath': filepath,
            'filename': filename,
            'file_type': os.path.splitext(filename)[1].lower(),
            'size_bytes': downloaded_size,
            'downloaded_at': datetime.now().isoformat(),
            'grievance_id': grievance_id
        }
        
    except requests.Timeout:
        print(f"  ⏱️ Download timeout: {url[:60]}")
        return None
    except requests.RequestException as e:
        print(f"  ❌ Download failed: {str(e)[:100]}")
        return None
    except Exception as e:
        print(f"  ❌ Error downloading {url}: {str(e)[:100]}")
        return None

def save_scraped_content(content: str, url: str, grievance_id: int, title: str = "") -> Optional[str]:
    """
    Save scraped content to text file
    
    Args:
        content: Scraped content
        url: Source URL
        grievance_id: ID of grievance
        title: Page title
        
    Returns:
        Filepath if saved successfully, None otherwise
    """
    try:
        # Create grievance-specific folder
        grievance_folder = os.path.join(Config.FILES_DIR, f"grievance_{grievance_id}")
        os.makedirs(grievance_folder, exist_ok=True)
        
        # Create filename from URL
        url_hash = abs(hash(url))
        safe_title = re.sub(r'[<>:"/\\|?*]', '_', title)[:50] if title else "scraped"
        filename = f"{safe_title}_{url_hash}.txt"
        filepath = os.path.join(grievance_folder, filename)
        
        # Save content
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(f"Source: {url}\n")
            f.write(f"Title: {title}\n")
            f.write(f"Scraped at: {datetime.now().isoformat()}\n")
            f.write(f"{'='*80}\n\n")
            f.write(content)
        
        print(f"  💾 Saved content: {filename}")
        return filepath
        
    except Exception as e:
        print(f"  ❌ Error saving content: {str(e)[:100]}")
        return None

def scrape_with_download(urls: List[str], grievance_id: int) -> Dict:
    """
    Scrape URLs and download any files found
    
    Args:
        urls: List of URLs to process
        grievance_id: ID of grievance
        
    Returns:
        Dict with scraped content and downloaded files
    """
    downloaded_files = []
    scraped_content = []
    
    print(f"📋 Processing {len(urls)} URLs...")
    
    for idx, url in enumerate(urls[:Config.MAX_URLS_PER_SEARCH], 1):
        # Check if URL is a downloadable file
        if is_downloadable_file(url):
            print(f"  {idx}.  File detected: {url[:70]}")
            file_info = download_file(url, grievance_id)
            if file_info:
                downloaded_files.append(file_info)
        else:
            print(f"  {idx}. 🌐 Web page: {url[:70]}")
            # Will process with batch scraping
    
    # Scrape non-file URLs and save immediately
    non_file_urls = [u for u in urls if not is_downloadable_file(u)]
    if non_file_urls:
        print(f"\n📡 Scraping {len(non_file_urls)} web pages...")
        scraped_results = scrape_urls_batch(non_file_urls, grievance_id)
        scraped_content.extend(scraped_results)
    
    total = len(scraped_content) + len(downloaded_files)
    print(f"\nComplete: {len(scraped_content)} pages + {len(downloaded_files)} files = {total} total")
    sys.stdout.flush()
    
    return {
        'scraped_content': scraped_content,
        'downloaded_files': downloaded_files,
        'total_items': total
    }

# Define LangChain Tools
search_tool = Tool(
    name="search_internet",
    func=lambda query: json.dumps(search_internet_tavily(query)),
    description="""Search the internet for information using Tavily.
    Input: A search query string.
    Output: JSON string of search results with URLs, titles, and content snippets.
    Use this to find latest information about government policies, department actions, news, etc."""
)

scrape_tool = Tool(
    name="scrape_urls",
    func=lambda urls_json: json.dumps(scrape_urls_batch(json.loads(urls_json) if isinstance(urls_json, str) else urls_json)),
    description="""Scrape content from web URLs using crawl4ai.
    Input: JSON array of URL strings.
    Output: JSON string of scraped documents with URL and full content.
    Use this after searching to get detailed content from relevant URLs."""
)

keywords_tool = Tool(
    name="extract_keywords",
    func=lambda text: json.dumps(extract_keywords_from_text(text)),
    description="""Extract important keywords from text.
    Input: Text string.
    Output: JSON array of keyword strings.
    Use this to identify key topics and themes from content."""
)

# Tool list for agent
ALL_TOOLS = [search_tool, scrape_tool, keywords_tool]
