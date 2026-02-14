import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Load .env before any config/LLM imports
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

from Workflow.graph import build_workflow
from Workflow.states import GrievanceState
from IPython.display import Image, display


def visualize():
    """Visualize the LangGraph workflow"""
    workflow = build_workflow()
    
    try:
        # Generate visualization
        display(Image(workflow.get_graph().draw_mermaid_png()))
    except Exception as e:
        print(f"Could not visualize: {e}")
        print("Install graphviz: pip install pygraphviz")


async def run_grievance_workflow(user_query: str):
    """Run the complete grievance redressal workflow"""
    
    print("\n")
    print("🇮🇳 " + "="*76 + " 🇮🇳")
    print("   GRIEVANCE REDRESSAL AGENT - LANGGRAPH WORKFLOW")
    print("🇮🇳 " + "="*76 + " 🇮🇳")
    print(f"\nQuery: {user_query}\n")
    
    # Initialize state
    initial_state: GrievanceState = {
        "user_query": user_query,
        "grievance_category": "",
        "search_topics": [],
        "sources": [],
        "retry_count": 0,
        "validation_passed": False,
        "downloaded_files": [],
        "crawled_results": [],
        "pdf_data": [],
        "vector_db_collection": None,
        "error": None,
        "status": "initialized"
    }
    
    # Build and run workflow
    workflow = build_workflow()
    
    # Execute workflow
    final_state = None
    async for state in workflow.astream(initial_state):
        final_state = state
        # Update retry count if we're back at search
        if "search_sources" in state and state.get("retry_count", 0) > 0:
            state["retry_count"] += 1
    
    
    if final_state:
        state_dict = final_state[list(final_state.keys())[-1]]
        print(f"   Category: {state_dict.get('grievance_category', 'N/A')}")
        print(f"   Search Topics: {len(state_dict.get('search_topics', []))}")
        print(f"   Sources Found: {len(state_dict.get('sources', []))}")
        print(f"   Files Downloaded: {len(state_dict.get('downloaded_files', []))}")
        print(f"   Pages Crawled: {len(state_dict.get('crawled_results', []))}")
        print(f"   PDF Chunks: {len(state_dict.get('pdf_data', []))}")
        print(f"   Retry Count: {state_dict.get('retry_count', 0)}")
        print(f"   Final Status: {state_dict.get('status', 'unknown')}")
    
    print("\n" + "="*80 + "\n")
    
    return final_state


if __name__ == "__main__":
    # Test queries
    test_queries = [
        "Sewage Drainage Problems in Mumbai"
    ]
    
    for query in test_queries:
        result = asyncio.run(run_grievance_workflow(query))
        print("\n" + "="*80 + "\n")
    visualize()