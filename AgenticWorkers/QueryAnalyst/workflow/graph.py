from typing import Dict, Any
from langgraph.graph import StateGraph, END
from workflow.states import GrievanceState
from workflow import nodes
def build_graph():
    graph= StateGraph(GrievanceState)
    graph.add_node("describe_image", nodes.NODE_describe_image)
    graph.add_node("enhance_query", nodes.NODE_enhance_query)
    graph.add_node("embed_query", nodes.NODE_embed_query)
    graph.add_node("run_agents", nodes.NODE_run_agents)
    graph.add_node("policy_queries", nodes.NODE_Policy_Queries)
    graph.add_node("generate_report", nodes.NODE_generate_report)
    graph.set_entry_point("describe_image")
    graph.add_edge("describe_image", "enhance_query")
    graph.add_edge("enhance_query", "embed_query")
    graph.add_edge("embed_query", "run_agents")
    graph.add_edge("run_agents", "policy_queries")
    graph.add_edge("policy_queries", "generate_report")
    graph.add_edge("generate_report", END)
    return graph.compile()

       