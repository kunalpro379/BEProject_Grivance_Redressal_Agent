from tavily import TavilyClient
from typing import List, Dict, Any
from config.settings import Config

class InternetSearchTool:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.TAVILY_API_KEY
        self.client = TavilyClient(api_key=self.api_key) if self.api_key else None
        self.max_results = Config.MAX_SEARCH_RESULTS
        
        # Comprehensive list of Indian government domains
        self.gov_domains = [
            "gov.in", "nic.in", "india.gov.in", "pib.gov.in", "niti.gov.in",
            "mygov.in", "india.gov.in", "uidai.gov.in", "meity.gov.in",
            "digital.india.gov.in", "pmindia.gov.in", "makeinindia.com",
            "swachhbharat.mygov.in", "smartcities.gov.in", "moud.gov.in"
        ]
    
    def search(self, query: str, max_results: int = None, include_answer: bool = True) -> List[Dict[str, Any]]:
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
                include_domains=self.gov_domains,
                include_answer=include_answer
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
        # Enhanced query with more keywords
        query = f"India government schemes programs benefits subsidies {grievance_category} 2024 2025 2026 ministry central state"
        return self.search(query)
    
    def search_budget_allocation(self, department: str, category: str) -> List[Dict[str, Any]]:
        """Search for budget allocations"""
        # Enhanced query with more budget-specific terms
        query = f"India {department} budget allocation funding expenditure {category} 2024 2025 2026 financial ministry"
        return self.search(query)
    
    def search_development_plans(self, location: str, category: str) -> List[Dict[str, Any]]:
        """Search for development plans"""
        # Enhanced query with more plan-specific terms
        query = f"{location} India development plan urban rural infrastructure project {category} 2024 2025 smart city"
        return self.search(query)
    
    def search_resources(self, grievance_type: str) -> List[Dict[str, Any]]:
        """Search for available resources"""
        # Enhanced query with more resource-specific terms
        query = f"India government resources guidelines procedures {grievance_type} implementation standards ministry"
        return self.search(query)
    
    def search_policies_and_regulations(self, category: str) -> List[Dict[str, Any]]:
        """Search for government policies and regulations"""
        query = f"India government policy regulations rules act {category} ministry notification gazette"
        return self.search(query)
    
    def search_case_studies(self, category: str, location: str = "") -> List[Dict[str, Any]]:
        """Search for case studies and success stories"""
        location_str = f"{location}" if location else "India"
        query = f"{location_str} government case study success story best practices {category} implementation"
        return self.search(query)
    
    def search_tenders_and_projects(self, department: str, category: str) -> List[Dict[str, Any]]:
        """Search for tenders and ongoing projects"""
        query = f"India {department} tender project contract {category} ongoing upcoming 2024 2025"
        return self.search(query)
    
    def search_ministries_and_departments(self, category: str) -> List[Dict[str, Any]]:
        """Search for relevant ministries and departments"""
        query = f"India ministry department authority responsible {category} contact information"
        return self.search(query)
    
    def comprehensive_search(self, grievance_data: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Perform comprehensive search across all categories
        Returns all search results organized by type
        """
        category = str(grievance_data.get('category', 'general'))
        department = grievance_data.get('department_info', {})
        dept_name = department.get('name', 'general') if isinstance(department, dict) else str(department)
        location = grievance_data.get('extracted_location', {})
        location_str = location.get('city', 'India') if isinstance(location, dict) else "India"
        
        print("🔍 Performing comprehensive search across all categories...")
        
        results = {
            'schemes': self.search_government_schemes(category),
            'budget': self.search_budget_allocation(dept_name, category),
            'development': self.search_development_plans(location_str, category),
            'resources': self.search_resources(category),
            'policies': self.search_policies_and_regulations(category),
            'case_studies': self.search_case_studies(category, location_str),
            'tenders': self.search_tenders_and_projects(dept_name, category),
            'ministries': self.search_ministries_and_departments(category)
        }
        
        total = sum(len(v) for v in results.values())
        print(f" Comprehensive search completed: {total} total results across {len(results)} categories")
        
        return results
