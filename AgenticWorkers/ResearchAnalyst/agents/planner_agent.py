from langchain_groq import ChatGroq
from typing import Dict, Any, List

class PlannerAgent:
    def __init__(self, groq_api_key: str, model: str = "llama-3.1-8b-instant"):
        self.llm = ChatGroq(
            api_key=groq_api_key,
            model=model,
            temperature=0.3
        )
    
    def create_research_plan(self, grievance_data: Dict[str, Any], similar_grievances: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Create a research plan based on grievance data
        """
        grievance_text = grievance_data.get('grievance_text', '')
        category = grievance_data.get('category', {})
        location = grievance_data.get('extracted_location', {})
        department = grievance_data.get('department_info', {})
        
        prompt = f"""
You are a research planner for government grievance analysis. Analyze the grievance and create a comprehensive research plan.

GRIEVANCE DETAILS:
- Text: {grievance_text}
- Category: {category}
- Location: {location}
- Department: {department}

SIMILAR PAST GRIEVANCES:
{self._format_similar_grievances(similar_grievances)}

Create a research plan that includes:
1. Key search queries for government schemes/programs
2. Budget allocation areas to investigate
3. Development plans to review
4. Resources and guidelines to find
5. Specific government departments/ministries to focus on

Return a structured plan with specific, actionable search queries.
"""
        
        try:
            response = self.llm.invoke(prompt)
            return {
                'plan': response.content,
                'grievance_id': grievance_data.get('grievance_id'),
                'category': category,
                'location': location
            }
        except Exception as e:
            print(f"Error creating research plan: {e}")
            return {
                'plan': 'Default research plan',
                'error': str(e)
            }
    
    def _format_similar_grievances(self, grievances: List[Dict[str, Any]]) -> str:
        """Format similar grievances for the prompt"""
        if not grievances:
            return "No similar grievances found."
        
        formatted = []
        for g in grievances[:3]:  # Limit to top 3
            formatted.append(
                f"- {g.get('grievance_text', 'N/A')[:100]}... "
                f"(Status: {g.get('status', 'N/A')}, "
                f"Resolution Time: {g.get('resolution_time', 'N/A')} days)"
            )
        return "\n".join(formatted)
