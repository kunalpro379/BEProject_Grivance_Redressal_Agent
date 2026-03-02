import asyncio
import logging
from typing import Set, Dict, List
from urllib.parse import urlparse, urljoin
from crawl4ai import AsyncWebCrawler
from config.settings import settings

logger = logging.getLogger(__name__)

class WebCrawler:
    def __init__(self):
        # Updated for newer crawl4ai API - configuration is passed directly to AsyncWebCrawler
        self.crawler_kwargs = {
            "headless": True,
            "verbose": False,
        }
        
        # Crawl configuration options
        self.crawl_config = {
            "word_count_threshold": 10,
            "bypass_cache": True,
            "wait_until": "domcontentloaded",
            "page_timeout": settings.PAGE_TIMEOUT,
            "remove_overlay_elements": True,
        }
    
    async def crawl_website(self, start_url: str, max_pages: int = None, on_page_crawled=None) -> Dict[str, any]:
        """Crawl website and return all results
        
        Args:
            start_url: URL to start crawling from
            max_pages: Maximum number of pages to crawl
            on_page_crawled: Optional callback function called after each page is crawled
                            Signature: async def callback(url: str, result: CrawlResult) -> None
        """
        max_pages = max_pages or settings.MAX_PAGES
        
        logger.info(f"Starting crawl: {start_url} (max {max_pages} pages)")
        
        # Updated API - pass config directly to AsyncWebCrawler
        async with AsyncWebCrawler(**self.crawler_kwargs) as crawler:
            crawled_urls = set()
            to_crawl_urls = {start_url}
            all_results = {}
            
            try:
                while to_crawl_urls and len(crawled_urls) < max_pages:
                    current_batch = list(to_crawl_urls)[:settings.BATCH_SIZE]
                    to_crawl_urls -= set(current_batch)
                    
                    logger.info(f"Crawling batch: {len(current_batch)} URLs (Progress: {len(crawled_urls)}/{max_pages})")
                    
                    tasks = []
                    for url in current_batch:
                        # Updated API - pass config as kwargs
                        task = crawler.arun(url=url, **self.crawl_config)
                        tasks.append(task)
                    
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    for url, result in zip(current_batch, results):
                        if isinstance(result, Exception):
                            logger.error(f"Error crawling {url}: {result}")
                            continue
                        
                        if result and hasattr(result, 'success') and result.success:
                            logger.info(f"Crawled: {url}")
                            crawled_urls.add(url)
                            all_results[url] = result
                            
                            # Call callback if provided (for real-time upload)
                            if on_page_crawled:
                                try:
                                    await on_page_crawled(url, result)
                                except Exception as callback_error:
                                    logger.error(f"Callback error for {url}: {callback_error}")
                            
                            # Extract new links
                            new_links = self._extract_links(result, url)
                            new_links -= crawled_urls
                            new_links -= to_crawl_urls
                            to_crawl_urls.update(new_links)
                            
                            logger.debug(f"Found {len(new_links)} new URLs")
                        else:
                            logger.warning(f"Failed to crawl: {url}")
                
                logger.info(f"Crawling complete: {len(crawled_urls)} pages")
                return all_results
                
            except Exception as e:
                logger.error(f"Crawling error: {e}")
                return {}  # Return empty dict instead of raising
    
    def _extract_links(self, result, base_url: str) -> Set[str]:
        """Extract internal links from crawl result"""
        links = set()
        
        if hasattr(result, 'links') and result.links:
            for link in result.links.get('internal', []):
                if link and link.get('href'):
                    full_url = urljoin(base_url, link['href'])
                    if urlparse(full_url).netloc == urlparse(base_url).netloc:
                        links.add(full_url)
        
        return links
