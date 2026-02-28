from typing import Dict, Any
from langgraph.graph import StateGraph, END
from workflow.states import GrievanceState
from workflow import nodes

def should_continue_processing(state: Dict[str, Any]) -> str:
    """Conditional edge: only continue if validation passes."""
    if state.get("is_validated", True):  # Default to True if no validation
        return "continue"
    return "reject"

def build_graph():
    graph = StateGraph(GrievanceState)
    
    # Add all nodes
    graph.add_node("validate_image", nodes.NODE_validate_image)
    graph.add_node("extract_location", nodes.NODE_extract_location)
    graph.add_node("describe_image", nodes.NODE_describe_image)
    graph.add_node("enhance_query", nodes.NODE_enhance_query)
    graph.add_node("create_described_query", nodes.NODE_create_described_query)
    graph.add_node("embed_query", nodes.NODE_embed_query)
    graph.add_node("run_agents", nodes.NODE_run_agents)
    graph.add_node("policy_queries", nodes.NODE_Policy_Queries)
    graph.add_node("tavily_search", nodes.NODE_tavily_search)
    graph.add_node("allocate_department", nodes.NODE_allocate_department)
    graph.add_node("generate_report", nodes.NODE_generate_report)
    
    # Set entry point - validation first
    graph.set_entry_point("validate_image")
    
    # Conditional routing after validation
    graph.add_conditional_edges(
        "validate_image",
        should_continue_processing,
        {
            "continue": "extract_location",
            "reject": END  # Stop processing if validation fails
        }
    )
    
    # Continue with location extraction and rest of pipeline
    graph.add_edge("extract_location", "describe_image")
    graph.add_edge("describe_image", "enhance_query")
    graph.add_edge("enhance_query", "create_described_query")
    graph.add_edge("create_described_query", "embed_query")
    graph.add_edge("embed_query", "run_agents")
    graph.add_edge("run_agents", "policy_queries")
    graph.add_edge("policy_queries", "tavily_search")
    graph.add_edge("tavily_search", "allocate_department")
    graph.add_edge("allocate_department", "generate_report")
    graph.add_edge("generate_report", END)
    
    return graph.compile()

       