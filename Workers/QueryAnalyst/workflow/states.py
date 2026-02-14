from typing import TypedDict, Optional, Dict, Any, List
class GrievanceState(TypedDict, total=False):
    query: str
    image_path: Optional[str]
    IMAGE_URL: Optional[str]
    image_analysis: Dict[str, Any]
    enhanced_query: str

    embedding: List[float]
    retrieved_data: Dict[str, Any]

    agents_outputs: Dict[str, Any]
    policy_search: Dict[str, Any]

    final_report_md: str
    pdf_path: str
    json_result: Dict[str, Any]

