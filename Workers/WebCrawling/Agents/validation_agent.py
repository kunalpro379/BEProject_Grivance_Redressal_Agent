import json
from Workflow.states import GrievanceState
from tools.LLM import LLMTool
from prompts.analysis import get_validation_prompt
from utils.config import MIN_SOURCES_REQUIRED, INDIAN_GOV_SOURCES_FILE


class ValidationAgent:
    """Agent responsible for validating source relevance"""
    
    def __init__(self):
        self.llm_tool = LLMTool()
    
    def validate_sources(self, state: GrievanceState) -> GrievanceState:
        """Validate source relevance"""
        print("\n" + "="*80)
        print("NODE: Validating Sources")
        print("="*80)
        
        sources = state["sources"]
        query = state["user_query"]
        
        relevant_sources = []
        
        for i, source in enumerate(sources, 1):
            print(f"   [{i}/{len(sources)}] Validating: {source['title'][:60]}...")
            
            prompt = get_validation_prompt(source, query)
            response = self.llm_tool.generate(prompt).strip().upper()
            
            if "RELEVANT" in response:
                relevant_sources.append(source)
                print(f"       ✓ RELEVANT")
            else:
                print(f"       ✗ IRRELEVANT")
        
        state["sources"] = relevant_sources
        state["validation_passed"] = len(relevant_sources) >= MIN_SOURCES_REQUIRED
        state["status"] = "validated"
        
        print(f"\n✓ Relevant sources: {len(relevant_sources)}")
        print(f"✓ Validation passed: {state['validation_passed']}")
        
        # Save sources
        with open(INDIAN_GOV_SOURCES_FILE, "w", encoding="utf-8") as f:
            json.dump(relevant_sources, f, ensure_ascii=False, indent=4)
        
        return state
