from Workflow.states import GrievanceState
from tools.VectorDB import VectorDBTool


class VectorDBAgent:
    """Agent responsible for creating vector database"""
    
    def __init__(self):
        self.vector_db_tool = VectorDBTool()
    
    def create_vector_db(self, state: GrievanceState) -> GrievanceState:
        """Create vector database"""
        print("\n" + "="*80)
        print("NODE: Creating Vector Database")
        print("="*80)
        
        collection = self.vector_db_tool.process_all_data()
        
        state["vector_db_collection"] = collection
        state["status"] = "completed"
        
        return state
