import os
from pathlib import Path
from dotenv import load_dotenv

# Load local .env for API keys and DB URLs
# override=True ensures the .env values replace any older system env values
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

# Disable LangSmith tracing prompt so runs are non-interactive/fast
os.environ.setdefault("LANGSMITH_SKIP_TRACING_PROMPT", "true")
os.environ.setdefault("LANGSMITH_TRACING", "false")
os.environ.setdefault("LANGCHAIN_TRACING_V2", "false")

from typing import Optional, Dict, Any
from workflow.graph import build_graph

def analysis(
    query: str,
    image_path: Optional[str] = None,
    original_image_url: Optional[str] = None,
    citizen_id: Optional[str] = None,
    grievance_id: Optional[str] = None,
) -> Dict[str, Any]:
    app = build_graph()
    initial_state = {
        "query": query,
        "image_path": image_path,
        "IMAGE_URL": image_path,
        "original_image_url": original_image_url or image_path,
        "citizen_id": citizen_id,
        "grievance_id": grievance_id,
    }
    final_state=app.invoke(initial_state)
    return final_state

if __name__=="__main__":
    grievance_query="""There is a huge garbage pile near my apartment in Mumbai.
    It has been there for 2 weeks and is causing health issues.
    The BBMP workers are not cleaning it despite multiple complaints.
    Children are getting sick and the smell is unbearable."""

    image_path = "garbage.jpeg" 
    result_state=analysis(grievance_query, image_path)
    print(result_state)
    print("PDF report saved at:", result_state.get("pdf_path"))
    print("JSON analysis saved at:", result_state.get("json_result"))
