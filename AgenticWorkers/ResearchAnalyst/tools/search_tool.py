from tavily import TavilyClient
from typing import List, Dict, Any
from config.settings import Config

class InternetSearchTool:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.TAVILY_API_KEY
        self.client = TavilyClient(api_key=self.api_key) if self.api_key else None
        self.max_results = Config.MAX_SEARCH_RESULTS
    
    def search(self, query: str, max_results: int = None) -> List[Dict[str, Any]]:
        """
        Search the internet for government plans, budgets, and resources
        """
        if not self.client:
            print("Warning: Tavily API key not configured")
            return []
        
        # Use configured max_results if not specified
        if max_results is None:
            max_results = self.max_results
        
        # FIX: Truncate query to max 400 characters (Tavily limit)
        if len(query) > 400:
            query = query[:397] + "..."
            print(f"⚠️  Query truncated to 400 chars")
        
        try:
            response = self.client.search(
                query=query,
                max_results=max_results,
                search_depth="advanced",
                include_domains=["gov.in", "india.gov.in", "pib.gov.in", "niti.gov.in"]
            )
            
            results = []
            for item in response.get('results', []):
                results.append({
                    'title': item.get('title', ''),
                    'url': item.get('url', ''),
                    'content': item.get('content', ''),
                    'score': item.get('score', 0),
                    'published_date': item.get('published_date', '')
                })
            
            return results
        except Exception as e:
            print(f"Search error: {e}")
            return []
    
    def search_government_schemes(self, grievance_category: str) -> List[Dict[str, Any]]:
        """Search for relevant government schemes"""
        query = f"India government schemes programs {grievance_category} 2024 2025 2026"
        return self.search(query)
    
    def search_budget_allocation(self, department: str, category: str) -> List[Dict[str, Any]]:
        """Search for budget allocations"""
        query = f"India {department} budget allocation {category} 2024 2025 2026"
        return self.search(query)
    
    def search_development_plans(self, location: str, category: str) -> List[Dict[str, Any]]:
        """Search for development plans"""
        query = f"{location} India development plan {category} infrastructure 2024 2025"
        return self.search(query)
    
    def search_resources(self, grievance_type: str) -> List[Dict[str, Any]]:
        """Search for available resources"""
        query = f"India government resources {grievance_type} implementation guidelines"
        return self.search(query)
