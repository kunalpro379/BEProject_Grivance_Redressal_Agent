from Workflow.states import GrievanceState
from tools.LLM import LLMTool
from prompts.analysis import get_analysis_prompt
from utils.config import MAX_SEARCH_TOPICS


class AnalyzerAgent:
    """Agent responsible for analyzing queries and extracting search topics"""
    
    def __init__(self):
        self.llm_tool = LLMTool()
    
    def analyze_query(self, state: GrievanceState) -> GrievanceState:
        """Analyze query and extract search topics"""
        print("\n" + "="*80)
        print("NODE: Analyzing Query")
        print("="*80)
        
        query = state["user_query"]
        prompt = get_analysis_prompt(query)
        analysis_result = self.llm_tool.generate(prompt)
        
        print(f"Analysis Result:\n{analysis_result}")
        
        search_topics = []
        for line in analysis_result.split('\n'):
            line = line.strip()
            if line and any(c.isalnum() for c in line):
                clean_string = line.lstrip('1234567890. -•')
                if clean_string and len(clean_string) > 5:
                    search_topics.append(clean_string)
        
        state["search_topics"] = search_topics[:MAX_SEARCH_TOPICS]
        state["status"] = "analyzed"
        
        print(f"Extracted {len(state['search_topics'])} search topics")
        return state
