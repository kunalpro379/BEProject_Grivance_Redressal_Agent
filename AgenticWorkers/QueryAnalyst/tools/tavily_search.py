"""
Tavily Search Tool for real-time data retrieval.
Fetches news, government policies, Twitter data, and other real-time information.
"""
import os
from typing import Dict, Any, List
from tavily import TavilyClient
from configs.config import Config


class TavilySearchEngine:
    def __init__(self):
        api_key = Config.TAVILY_API_KEY or os.environ.get("TAVILY_API_KEY")
        if not api_key:
            raise ValueError("TAVILY_API_KEY not found in environment or config")
        self.client = TavilyClient(api_key=api_key)
    
    def search_realtime_data(
        self,
        queries: List[str],
        max_results_per_query: int = 3
    ) -> Dict[str, Any]:
        """
        Search for real-time data using Tavily.
        
        Args:
            queries: List of search queries
            max_results_per_query: Maximum results per query
            
        Returns:
            Dictionary with search results organized by query
        """
        all_results = {}
        
        for query in queries:
            try:
                print(f"   🔍 Searching: {query}")
                response = self.client.search(
                    query=query,
                    max_results=max_results_per_query,
                    search_depth="advanced",
                    include_domains=[],
                    exclude_domains=[]
                )
                
                results = []
                for item in response.get("results", []):
                    results.append({
                        "title": item.get("title", ""),
                        "url": item.get("url", ""),
                        "content": item.get("content", ""),
                        "score": item.get("score", 0),
                        "published_date": item.get("published_date", "")
                    })
                
                all_results[query] = {
                    "results": results,
                    "answer": response.get("answer", ""),
                    "query": query
                }
                
                print(f"      Found {len(results)} results")
                
            except Exception as e:
                print(f"      Error searching '{query}': {e}")
                all_results[query] = {
                    "results": [],
                    "answer": "",
                    "query": query,
                    "error": str(e)
                }
        
        return all_results
    
    def search_government_policies(
        self,
        category: str,
        location: str,
        department: str
    ) -> Dict[str, Any]:
        """
        Search for relevant government policies and schemes.
        
        Args:
            category: Grievance category (e.g., "Sanitation", "Roads")
            location: Location information
            department: Recommended department
            
        Returns:
            Search results for government policies
        """
        query = f"{category} government policy scheme {location} {department} India"
        
        try:
            response = self.client.search(
                query=query,
                max_results=5,
                search_depth="advanced",
                include_domains=["gov.in", "nic.in"]
            )
            
            return {
                "query": query,
                "results": response.get("results", []),
                "answer": response.get("answer", "")
            }
        except Exception as e:
            print(f"   Error searching government policies: {e}")
            return {
                "query": query,
                "results": [],
                "answer": "",
                "error": str(e)
            }
