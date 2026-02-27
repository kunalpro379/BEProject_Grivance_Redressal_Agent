from Workflow.states import GrievanceState
from tools.LLM import LLMTool
from prompts.analysis import get_query_classification_prompt


class ClassifierAgent:
    """Agent responsible for classifying grievance queries"""
    
    def __init__(self):
        self.llm_tool = LLMTool()
    
    def classify_query(self, state: GrievanceState) -> GrievanceState:
        """Classify the type of grievance"""
      
        query = state["user_query"]
        prompt = get_query_classification_prompt(query)
        category = self.llm_tool.generate(prompt).strip().upper()
        
        print(f"Query: {query}")
        print(f"Category: {category}")
        
        state["grievance_category"] = category
        state["status"] = "classified"
        return state
