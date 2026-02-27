import os
import sys
import psutil
import asyncio
import requests
import argparse
import json
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
import re
import time
from typing import Set, Dict
from pathlib import Path

# Add parent directory to path
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from pdf_processor_pinecone import (
    chunk_text, create_embeddings, store_in_pinecone,
    build_knowledge_base, upload_to_azure_blob
)

__location__ = os.path.dirname(os.path.abspath(__file__))
__output__ = os.path.join(__location__, "output")
os.makedirs(__output__, exist_ok=True)


def clean_filename(url: str) -> str:
    """Convert URL to a safe filename"""
    filename = url.replace('https://', '').replace('http://', '')
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    if len(filename) > 200:
        filename = filename[:200]
    return filename + '.md'


async def crawl_with_depth(start_url: str, max_pages: int = 50, department_id: str = None):
    """Crawl website and extract content"""
    print(f"\n=== Crawling {start_url} ===")
    print(f"Max pages: {max_pages}")
    print(f"Department ID: {department_id or 'Not specified'}")
    
    # Track memory
    process = psutil.Process(os.getpid())
    initial_memory = process.memory_info().rss // (1024 * 1024)
    print(f"Initial Memory: {initial_memory} MB")
    
    # Browser config
    browser_config = BrowserConfig(
        headless=True,
        verbose=False,
        extra_args=[
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
        ],
        ignore_https_errors=True,
    )
    
    # Crawl config
    crawl_config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        word_count_threshold=10,
        wait_until="domcontentloaded",
        page_timeout=30000,
        verbose=False,
    )
    
    crawler = AsyncWebCrawler(config=browser_config)
    
    try:
        print("Starting crawler...")
        await crawler.start()
        
        # Track URLs
        crawled_urls: Set[str] = set()
        to_crawl_urls: Set[str] = {start_url}
        failed_urls: Set[str] = set()
        all_content: Dict = {}
        
        domain = urlparse(start_url).netloc.replace('www.', '')
        domain_dir = os.path.join(__output__, domain)
        os.makedirs(domain_dir, exist_ok=True)
        
        crawl_count = 0
        
        while to_crawl_urls and crawl_count < max_pages:
            current_url = to_crawl_urls.pop()
            if current_url in crawled_urls or current_url in failed_urls:
                continue
            
            print(f"\n📌 Crawling ({crawl_count + 1}/{max_pages}): {current_url}")
            
            try:
                result = await crawler.arun(
                    url=current_url,
                    config=crawl_config,
                    session_id=f"session_{crawl_count}"
                )
                
                if result and hasattr(result, 'success') and result.success:
                    print("   ✅ Success!")
                    crawled_urls.add(current_url)
                    crawl_count += 1
                    
                    # Extract content
                    content = await save_clean_content(result, current_url, domain_dir)
                    if content:
                        all_content[current_url] = content
                    
                    # Extract links
                    new_links = await extract_links_fallback(result, current_url, domain)
                    for link in new_links:
                        if link not in crawled_urls and link not in to_crawl_urls and link not in failed_urls:
                            to_crawl_urls.add(link)
                    
                    print(f"   Found {len(new_links)} new URLs")
                    print(f"   Queue: {len(to_crawl_urls)} URLs remaining")
                else:
                    print("   ❌ Failed to crawl")
                    failed_urls.add(current_url)
                    await fallback_crawl(current_url, domain_dir, all_content)
            
            except Exception as e:
                print(f"   ❌ Error: {e}")
                failed_urls.add(current_url)
            
            await asyncio.sleep(1)
        
        # Summary
        print(f"\n{'='*60}")
        print("CRAWLING COMPLETE")
        print(f"{'='*60}")
        print(f"✅ Successfully crawled: {len(crawled_urls)} pages")
        print(f"❌ Failed: {len(failed_urls)} pages")
        print(f"📁 Output directory: {domain_dir}")
        
        # Process all content for embeddings
        if all_content and department_id:
            print("\n=== Processing content for embeddings ===")
            await process_crawled_content(all_content, domain, department_id)
        
        # Memory usage
        final_memory = process.memory_info().rss // (1024 * 1024)
        print(f"📊 Memory: {initial_memory} MB → {final_memory} MB (Δ{final_memory - initial_memory} MB)")
        
        return all_content
    
    except Exception as e:
        print(f"\n❌ Error during crawling: {e}")
        import traceback
        traceback.print_exc()
        return {}
    finally:
        print("\nClosing crawler...")
        await crawler.close()


async def extract_links_fallback(result, base_url: str, target_domain: str) -> Set[str]:
    """Extract links using multiple methods"""
    links = set()
    
    # Method 1: From crawl result
    if hasattr(result, 'links') and result.links:
        for link in result.links.get('internal', []):
            if link and link.get('href'):
                full_url = urljoin(base_url, link['href'])
                parsed = urlparse(full_url)
                if parsed.netloc.replace('www.', '') == target_domain:
                    links.add(full_url)
    
    # Method 2: BeautifulSoup
    if hasattr(result, 'html') and result.html:
        soup = BeautifulSoup(result.html, 'html.parser')
        for a in soup.find_all('a', href=True):
            href = a['href']
            if href and not href.startswith(('#', 'mailto:', 'tel:', 'javascript:')):
                full_url = urljoin(base_url, href)
                parsed = urlparse(full_url)
                if parsed.netloc.replace('www.', '') == target_domain:
                    links.add(full_url)
    
    return links


async def fallback_crawl(url: str, output_dir: str, all_content: Dict):
    """Fallback using requests"""
    try:
        print(f"   🔄 Trying fallback for: {url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        for script in soup(["script", "style", "nav", "header", "footer"]):
            script.decompose()
        
        text = soup.get_text()
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        title = soup.title.string if soup.title else "Untitled"
        filename = clean_filename(url)
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(f"# {title}\n\n")
            f.write(text)
        
        all_content[url] = {"title": title, "text": text}
        print(f"   💾 Saved (fallback): {filename}")
        return True
    except Exception as e:
        print(f"   ❌ Fallback failed: {e}")
        return False


async def save_clean_content(result, url: str, output_dir: str):
    """Save clean content"""
    try:
        parsed_url = urlparse(url)
        path = parsed_url.path.strip('/')
        filename = (path.replace('/', '_') or 'index') + '.md'
        if len(filename) > 100:
            filename = filename[:100]
        
        filepath = os.path.join(output_dir, filename)
        
        title = "Untitled"
        if hasattr(result, 'metadata') and result.metadata:
            title = result.metadata.get('title', 'Untitled')
        
        content = ""
        if hasattr(result, 'markdown') and result.markdown:
            content = clean_markdown_content(result.markdown)
        elif hasattr(result, 'html') and result.html:
            soup = BeautifulSoup(result.html, 'html.parser')
            for script in soup(["script", "style", "nav", "header", "footer"]):
                script.decompose()
            content = soup.get_text()
            content = clean_text_content(content)
        else:
            content = "*No content extracted*"
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(f"# {title}\n\n")
            f.write(content)
        
        print(f"   💾 Saved: {filename}")
        return {"title": title, "text": content}
    except Exception as e:
        print(f"   ❌ Error saving: {e}")
        return None


def clean_markdown_content(markdown: str) -> str:
    """Clean markdown content"""
    if not markdown:
        return ""
    markdown = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', markdown)
    markdown = re.sub(r'https?://[^\s<>"{}|\\^`\[\]]+', '', markdown)
    markdown = re.sub(r'www\.[^\s<>"{}|\\^`\[\]]+', '', markdown)
    markdown = re.sub(r'!\[[^\]]*\]\([^\)]+\)', '', markdown)
    markdown = re.sub(r'\n\s*\n\s*\n', '\n\n', markdown)
    return markdown.strip()


def clean_text_content(text: str) -> str:
    """Clean text content"""
    lines = text.split('\n')
    cleaned = []
    for line in lines:
        line = line.strip()
        if line and not line.startswith(('http://', 'https://', 'www.')):
            cleaned.append(line)
    return '\n'.join(cleaned)


async def process_crawled_content(all_content: Dict, domain: str, department_id: str):
    """Process crawled content for embeddings and knowledge base"""
    print("\n=== Processing crawled content ===")
    
    # Combine all text
    combined_text = ""
    for url, content in all_content.items():
        combined_text += f"\n\n=== {content.get('title', 'Untitled')} ===\n"
        combined_text += content.get('text', '')
    
    # Create pages structure
    pages = [{"page": 0, "text": combined_text}]
    
    # Chunk
    print("Chunking...")
    chunks = chunk_text(pages, chunk_size=1000, overlap=200)
    print(f"Created {len(chunks)} chunks")
    
    # Embed
    print("Creating embeddings...")
    chunks = create_embeddings(chunks)
    
    # Store in Pinecone
    print("Storing in Pinecone...")
    store_in_pinecone(chunks, department_id)
    
    # Build knowledge base
    print("Building knowledge base...")
    knowledge = build_knowledge_base(chunks)
    
    # Upload to Azure
    print("Uploading to Azure...")
    knowledge_json = json.dumps(knowledge, indent=2, ensure_ascii=False)
    knowledge_url = upload_to_azure_blob(
        knowledge_json,
        f"web_crawl_{domain}_knowledge.json",
        department_id
    )
    
    print(f"\n✅ Processing complete!")
    print(f"   Knowledge URL: {knowledge_url}")


async def main():
    parser = argparse.ArgumentParser(description='Enhanced web crawler with embeddings')
    parser.add_argument('url', nargs='?', help='Starting URL to crawl')
    parser.add_argument('-d', '--depth', type=int, default=50, help='Max pages (default: 50)')
    parser.add_argument('--dept-id', type=str, help='Department ID for Azure storage')
    args = parser.parse_args()
    
    print(f"📁 Output directory: {__output__}")
    
    if args.url:
        url = args.url
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        await crawl_with_depth(url, max_pages=args.depth, department_id=args.dept_id)
    else:
        print("=== Enhanced Web Crawler ===")
        url = input("Enter starting URL: ").strip()
        if url:
            if not url.startswith(('http://', 'https://')):
                url = 'https://' + url
            dept_id = input("Enter department ID (optional): ").strip() or None
            max_pages = input("Max pages (default 50): ").strip()
            max_pages = int(max_pages) if max_pages.isdigit() else 50
            await crawl_with_depth(url, max_pages=max_pages, department_id=dept_id)
        else:
            print("No URL provided. Exiting.")


if __name__ == "__main__":
    asyncio.run(main())
