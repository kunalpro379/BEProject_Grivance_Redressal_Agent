import asyncio
import json
import nest_asyncio
from typing import Dict, Optional
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

nest_asyncio.apply()


class WebCrawler:
    """Crawl web pages and extract content"""
    
    def __init__(self):
        self.browser_config = BrowserConfig(
            headless=True,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
            viewport_width=1920,
            viewport_height=1080,
            verbose=False
        )
        
        self.run_config = CrawlerRunConfig(
            word_count_threshold=0,
            wait_for="css:body",
            delay_before_return_html=3,
            page_timeout=60000,
            exclude_external_links=False,
            remove_overlay_elements=True,
            process_iframes=True,
            simulate_user=True
        )
    
    async def crawl_url_async(self, url: str) -> Dict[str, any]:
        """Crawl a single URL and extract content"""
        try:
            print(f"   🕷️ Crawling URL: {url}")
            
            async with AsyncWebCrawler(config=self.browser_config) as crawler:
                result = await crawler.arun(url=url, config=self.run_config)
                
                if result.success:
                    # Extract data
                    data = {
                        'success': True,
                        'url': url,
                        'title': result.metadata.get('title', ''),
                        'markdown': result.markdown,
                        'text': result.markdown,  # Use markdown as text
                        'metadata': result.metadata,
                        'links': result.links.get('internal', []) if hasattr(result.links, 'get') else [],
                        'images': [img.get('src', '') for img in (result.media.get('images', []) if hasattr(result.media, 'get') else [])],
                    }
                    
                    print(f"   ✅ Successfully crawled: {data['title']}")
                    return data
                else:
                    print(f"   ❌ Crawl failed: {result.error_message}")
                    return {
                        'success': False,
                        'url': url,
                        'error': result.error_message
                    }
                    
        except Exception as e:
            print(f"   ❌ Error crawling URL: {e}")
            return {
                'success': False,
                'url': url,
                'error': str(e)
            }
    
    def crawl_url(self, url: str) -> Dict[str, any]:
        """Synchronous wrapper for crawl_url_async"""
        return asyncio.run(self.crawl_url_async(url))
    
    def remove_image_links(self, markdown: str) -> str:
        """Remove image links from markdown content"""
        import re
        # Remove markdown images: ![alt](url)
        markdown = re.sub(r'!\[([^\]]*)\]\([^\)]+\)', '', markdown)
        # Remove HTML images: <img src="..." />
        markdown = re.sub(r'<img[^>]+>', '', markdown)
        return markdown.strip()
