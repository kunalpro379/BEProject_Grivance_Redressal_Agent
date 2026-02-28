from typing import TypedDict, Optional, Dict, Any, List
class GrievanceState(TypedDict, total=False):
    query: str
    image_path: Optional[str]
    original_image_url: Optional[str]  # Blob/public URL to store in DB; image_path may be temp local path
    IMAGE_URL: Optional[str]
    citizen_id: Optional[str]  # ID of the citizen who submitted the grievance
    grievance_id: Optional[str]  # ID of the grievance to update
    
    # Validation fields
    validation_result: Dict[str, Any]
    is_validated: bool
    
    # Location extraction fields
    location_data: Dict[str, Any]
    
    # Image analysis
    image_analysis: Dict[str, Any]
    enhanced_query: str
    enhanced_query_described: str  # LLM-described version with image, location, category

    embedding: List[float]
    retrieved_data: Dict[str, Any]

    agents_outputs: Dict[str, Any]
    policy_search: Dict[str, Any]
    tavily_search_results: Dict[str, Any]  # Real-time search results
    allocated_department: Optional[Dict[str, Any]]  # Department allocation from Supabase

    final_report_md: str
    pdf_path: str
    json_result: Dict[str, Any]

