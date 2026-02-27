from tavily import TavilyClient
from utils.config import TAVILY_API_KEY, MAX_SEARCH_RESULTS

class TavilySearchTool:
    def __init__(self):
        self.client = TavilyClient(api_key=TAVILY_API_KEY)
    
    def search(self, query, max_results=MAX_SEARCH_RESULTS):
        """Search using Tavily API"""
        try:
            response = self.client.search(
                query=query,
                max_results=max_results,
                search_depth="advanced",
                include_domains=["gov.in", "nic.in", "india.gov.in"]
            )
            
            results = []
            for result in response.get('results', []):
                results.append({
                    'title': result.get('title', ''),
                    'url': result.get('url', ''),
                    'snippet': result.get('content', '')
                })
            
            return results
        except Exception as e:
            print(f"Search error for '{query}': {e}")
            return []