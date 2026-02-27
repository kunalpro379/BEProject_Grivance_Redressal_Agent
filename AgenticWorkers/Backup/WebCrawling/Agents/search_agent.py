from Workflow.states import GrievanceState
from tools.InternetSearch import TavilySearchTool
from prompts.search import generate_search_variations


class SearchAgent:
    """Agent responsible for searching government sources"""
    
    def __init__(self):
        self.search_tool = TavilySearchTool()
    
    def search_sources(self, state: GrievanceState) -> GrievanceState:
        """Search for government sources"""
        print("\n" + "="*80)
        print("NODE: Searching Sources")
        print("="*80)
        
        search_topics = state["search_topics"]
        category = state["grievance_category"]
        
        all_sources = []
        
        for topic in search_topics:
            search_variations = generate_search_variations(topic, category)
            
            for i, search_query in enumerate(search_variations[:10], 1):
                print(f"   [{i}] Searching: '{search_query}'")
                results = self.search_tool.search(search_query, max_results=2)
                all_sources.extend(results)
                print(f"       Found {len(results)} results")
        
        # Remove duplicates
        seen_urls = set()
        unique_sources = []
        for source in all_sources:
            if source['url'] not in seen_urls:
                unique_sources.append(source)
                seen_urls.add(source['url'])
        
        state["sources"] = unique_sources
        state["status"] = "searched"
        
        print(f"\n✓ Total unique sources found: {len(unique_sources)}")
        return state
