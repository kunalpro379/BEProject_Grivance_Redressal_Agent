from typing import TypedDict, List, Dict, Optional
from typing_extensions import Annotated
import operator

class GrievanceState(TypedDict):
    """State for the grievance redressal workflow"""
    
    # Input
    user_query: str
    
    # Classification
    grievance_category: str
    
    # Search results
    search_topics: List[str]
    sources: Annotated[List[Dict], operator.add]
    
    # Validation
    retry_count: int
    validation_passed: bool
    
    # Downloaded data
    downloaded_files: List[Dict]
    
    # Crawled data
    crawled_results: List[Dict]
    
    # PDF processing
    pdf_data: List[Dict]
    
    # Vector DB
    vector_db_collection: Optional[object]
    
    # Error handling
    error: Optional[str]
    
    # Status
    status: str