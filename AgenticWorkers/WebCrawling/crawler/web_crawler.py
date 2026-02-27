import asyncio
import logging
from typing import Set, Dict, List
from urllib.parse import urlparse, urljoin
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from config.settings import settings

logger = logging.getLogger(__name__)

class WebCrawler:
    def __init__(self):
        self.browser_config = BrowserConfig(
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
        
        self.crawl_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            word_count_threshold=10,
            exclude_external_links=True,
            exclude_social_media_links=True,
            wait_until="domcontentloaded",
            page_timeout=settings.PAGE_TIMEOUT,
            scan_full_page=True,
            scroll_delay=0.3,
            screenshot=False,
            magic=True,
            remove_overlay_elements=True,
            process_iframes=False,
        )
    
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
        
        crawler = AsyncWebCrawler(config=self.browser_config)
        crawled_urls = set()
        to_crawl_urls = {start_url}
        all_results = {}
        
        try:
            await crawler.start()
            
            while to_crawl_urls and len(crawled_urls) < max_pages:
                current_batch = list(to_crawl_urls)[:settings.BATCH_SIZE]
                to_crawl_urls -= set(current_batch)
                
                logger.info(f"Crawling batch: {len(current_batch)} URLs (Progress: {len(crawled_urls)}/{max_pages})")
                
                tasks = []
                for url in current_batch:
                    session_id = f"session_{len(crawled_urls)}"
                    task = crawler.arun(
                        url=url,
                        config=self.crawl_config,
                        session_id=session_id
                    )
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
        finally:
            try:
                # Close with timeout to prevent hanging
                await asyncio.wait_for(crawler.close(), timeout=10)
                logger.info("Crawler closed successfully")
            except asyncio.TimeoutError:
                logger.warning("Crawler close timeout - forcing cleanup")
            except Exception as close_error:
                logger.warning(f"Error closing crawler: {close_error}")
    
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
