import json
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from utils.config import CRAWLED_RESULTS_FILE

class CrawlerTool:
    def __init__(self):
        self.browser_config = BrowserConfig()
        self.run_config = CrawlerRunConfig(
            word_count_threshold=10,
            remove_overlay_elements=True,
            exclude_external_links=False
        )
    
    async def crawl_urls(self, sources):
        """Crawl URLs from sources list"""
        results = []
        
        async with AsyncWebCrawler(config=self.browser_config) as crawler:
            for item in sources:
                url = item["url"]
                print(f"Crawling: {url}")
                
                try:
                    result = await crawler.arun(url=url, config=self.run_config)
                    
                    crawled_data = {
                        "title": item["title"],
                        "url": url,
                        "snippet": item["snippet"],
                        "success": result.success,
                        "markdown_content": result.markdown if result.success else None,
                        "error_message": result.error_message if not result.success else None
                    }
                    results.append(crawled_data)
                    
                    if result.success:
                        print(f"✓ Successfully crawled: {url}")
                    else:
                        print(f"✗ Failed to crawl: {url}")
                        
                except Exception as e:
                    print(f"✗ Error crawling {url}: {str(e)}")
                    results.append({
                        "title": item["title"],
                        "url": url,
                        "snippet": item["snippet"],
                        "success": False,
                        "markdown_content": None,
                        "error_message": str(e)
                    })
        
        with open(CRAWLED_RESULTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"\nCrawling completed! Results saved to: {CRAWLED_RESULTS_FILE}")
        return results