from Workflow.states import GrievanceState
from tools.Crawler import CrawlerTool


class CrawlerAgent:
    """Agent responsible for crawling web pages"""
    
    def __init__(self):
        self.crawler_tool = CrawlerTool()
    
    async def crawl_pages(self, state: GrievanceState) -> GrievanceState:
        """Crawl web pages"""
        print("\n" + "="*80)
        print("NODE: Crawling Web Pages")
        print("="*80)
        
        sources = state["sources"]
        crawled_results = await self.crawler_tool.crawl_urls(sources)
        
        state["crawled_results"] = crawled_results
        state["status"] = "pages_crawled"
        
        return state
