"""
Research Workflow Graph
"""
from langgraph.graph import StateGraph, END
from workflow.state import ResearchState
from workflow.nodes import WorkflowNodes
from config.db import DatabaseManager

class ResearchWorkflow:
    def __init__(self, groq_api_key: str, db_manager: DatabaseManager):
        self.nodes = WorkflowNodes(groq_api_key, db_manager)
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """Build the workflow graph"""
        workflow = StateGraph(ResearchState)
        
        # Add nodes
        workflow.add_node("fetch_data", self.nodes.fetch_grievance_data)
        workflow.add_node("create_plan", self.nodes.create_plan)
        workflow.add_node("search_schemes", self.nodes.search_schemes)
        workflow.add_node("search_budget", self.nodes.search_budget)
        workflow.add_node("search_development", self.nodes.search_development_plans)
        workflow.add_node("search_resources", self.nodes.search_resources)
        workflow.add_node("analyze", self.nodes.analyze_results)
        workflow.add_node("generate_report", self.nodes.generate_report)
        workflow.add_node("handle_error", self.nodes.handle_error)
        
        # Define edges
        workflow.set_entry_point("fetch_data")
        workflow.add_edge("fetch_data", "create_plan")
        workflow.add_edge("create_plan", "search_schemes")
        workflow.add_edge("search_schemes", "search_budget")
        workflow.add_edge("search_budget", "search_development")
        workflow.add_edge("search_development", "search_resources")
        workflow.add_edge("search_resources", "analyze")
        workflow.add_edge("analyze", "generate_report")
        workflow.add_edge("generate_report", END)
        workflow.add_edge("handle_error", END)
        
        return workflow.compile()
    
    def run(self, grievance_id: str, grievance_data: dict) -> dict:
        """Run the workflow"""
        try:
            initial_state = ResearchState(
                grievance_id=grievance_id,
                grievance_data=grievance_data,
                similar_grievances=[],
                patterns=[],
                research_plan=None,
                schemes_results=[],
                budget_results=[],
                development_results=[],
                resources_results=[],
                analysis=None,
                final_report=None,
                error=None
            )
            
            result = self.graph.invoke(initial_state)
            return result.get('final_report', {})
            
        except Exception as e:
            print(f"Workflow error: {e}")
            return {
                'error': str(e),
                'grievance_id': grievance_id
            }
