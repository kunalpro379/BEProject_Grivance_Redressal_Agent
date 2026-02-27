from langgraph.graph import StateGraph, END
from state import ResearchState
from nodes import (
    initialize_research,
    plan_next_research,
    search_web,
    scrape_content,
    save_scraped_data,
    check_continuation,
    finalize_research
)

def create_research_workflow():
    """
    Build LangGraph workflow for autonomous grievance research
    
    Workflow:
    1. Initialize - Set up research plan
    2. Plan - Decide what to research next (ReAct)
    3. Search - Find relevant URLs (Tavily)
    4. Scrape - Extract content (crawl4ai)
    5. Save - Save scraped data to files (txt/md)
    6. Check - Decide to continue or stop
    7. Loop back to Plan or Finalize
    """
    
    # Create workflow graph
    workflow = StateGraph(ResearchState)
    
    # Add all nodes
    workflow.add_node("initialize", initialize_research)
    workflow.add_node("plan", plan_next_research)
    workflow.add_node("search", search_web)
    workflow.add_node("scrape", scrape_content)
    workflow.add_node("save_files", save_scraped_data)
    workflow.add_node("finalize", finalize_research)
    
    # Set entry point
    workflow.set_entry_point("initialize")
    
    # Add sequential edges
    workflow.add_edge("initialize", "plan")
    workflow.add_edge("plan", "search")
    workflow.add_edge("search", "scrape")
    workflow.add_edge("scrape", "save_files")
    
    # Add conditional edge for loop control
    workflow.add_conditional_edges(
        "save_files",
        check_continuation,
        {
            "continue": "plan",  # Loop back to planning
            "end": "finalize"     # Finalize and end
        }
    )
    
    # Add final edge
    workflow.add_edge("finalize", END)
    
    # Compile the graph
    app = workflow.compile()
    
    print("Research workflow graph compiled successfully")
    
    return app

def visualize_workflow():
    """Print ASCII visualization of the workflow"""
    
    visualization = """
    
    ╔══════════════════════════════════════════════════════════════╗
    ║        AUTONOMOUS GRIEVANCE RESEARCH WORKFLOW                ║
    ║                  (LangGraph + ReAct)                         ║
    ╚══════════════════════════════════════════════════════════════╝
    
                         ┌─────────────┐
                         │ INITIALIZE  │
                         │   RESEARCH  │
                         └──────┬──────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   PLAN NEXT ACTION    │
                    │   (ReAct Agent)       │
                    └───────────┬───────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ SEARCH WEB   │
                         │  (Tavily)    │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ SCRAPE URLs  │
                         │ (crawl4ai)   │
                         └──────┬───────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   SAVE TO FILES       │
                    │   (txt/md files)      │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  CHECK CONTINUATION   │
                    │   - Max loops?        │
                    │   - Topics covered?   │
                    │   - Max docs?         │
                    └─────┬──────────┬──────┘
                          │          │
                     continue       end
                          │          │
                          ▼          ▼
                    ┌─────────┐  ┌──────────┐
                    │  PLAN   │  │ FINALIZE │
                    │ (LOOP)  │  │ RESEARCH │
                    └─────────┘  └─────┬────┘
                                       │
                                       ▼
                                    [ END ]
    
    """
    
    print(visualization)
    return visualization

# Create the compiled workflow
research_workflow = create_research_workflow()
