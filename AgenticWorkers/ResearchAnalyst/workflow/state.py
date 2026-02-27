"""
Research Workflow State
"""
from typing import TypedDict, List, Dict, Any, Optional

class ResearchState(TypedDict):
    """State for research workflow"""
    grievance_id: str
    grievance_data: Dict[str, Any]
    similar_grievances: List[Dict[str, Any]]
    patterns: List[Dict[str, Any]]
    research_plan: Optional[Dict[str, Any]]
    schemes_results: List[Dict[str, Any]]
    budget_results: List[Dict[str, Any]]
    development_results: List[Dict[str, Any]]
    resources_results: List[Dict[str, Any]]
    analysis: Optional[Dict[str, Any]]
    final_report: Optional[Dict[str, Any]]
    error: Optional[str]
