from typing import TypedDict, Optional, Dict, Any, List
class GrievanceState(TypedDict, total=False):
    query: str
    image_path: Optional[str]
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

    embedding: List[float]
    retrieved_data: Dict[str, Any]

    agents_outputs: Dict[str, Any]
    policy_search: Dict[str, Any]

    final_report_md: str
    pdf_path: str
    json_result: Dict[str, Any]

