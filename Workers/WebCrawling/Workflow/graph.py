from langgraph.graph import StateGraph, END
from Workflow.states import GrievanceState
from Workflow.nodes import (
    classify_query_node,
    analyze_query_node,
    search_sources_node,
    validate_sources_node,
    download_files_node,
    crawl_pages_node,
    process_pdfs_node,
    create_vector_db_node
)
from utils.config import MAX_RETRIES


def should_retry_search(state: GrievanceState) -> str:
    """Decide whether to retry search"""
    if not state["validation_passed"] and state["retry_count"] < MAX_RETRIES:
        print(f"\n⚠️ Insufficient sources. Retrying... (Attempt {state['retry_count'] + 1}/{MAX_RETRIES})")
        return "retry"
    elif not state["validation_passed"]:
        print(f"\n⚠️ Max retries reached. Proceeding with available sources...")
        return "continue"
    else:
        return "continue"


def build_workflow():
    """Build the LangGraph workflow"""
    
    workflow = StateGraph(GrievanceState)
    
    # Add all nodes
    workflow.add_node("classify_query", classify_query_node)
    workflow.add_node("analyze_query", analyze_query_node)
    workflow.add_node("search_sources", search_sources_node)
    workflow.add_node("validate_sources", validate_sources_node)
    workflow.add_node("download_files", download_files_node)
    workflow.add_node("crawl_pages", crawl_pages_node)
    workflow.add_node("process_pdfs", process_pdfs_node)
    workflow.add_node("create_vector_db", create_vector_db_node)
    
    # Set entry point
    workflow.set_entry_point("classify_query")
    
    # Add edges
    workflow.add_edge("classify_query", "analyze_query")
    workflow.add_edge("analyze_query", "search_sources")
    workflow.add_edge("search_sources", "validate_sources")
    
    # Conditional edge for retry logic
    workflow.add_conditional_edges(
        "validate_sources",
        should_retry_search,
        {
            "retry": "search_sources",
            "continue": "download_files"
        }
    )
    
    workflow.add_edge("download_files", "crawl_pages")
    workflow.add_edge("crawl_pages", "process_pdfs")
    workflow.add_edge("process_pdfs", "create_vector_db")
    workflow.add_edge("create_vector_db", END)
    
    return workflow.compile()