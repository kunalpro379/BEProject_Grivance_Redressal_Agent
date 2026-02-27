from langchain_groq import ChatGroq
from typing import Dict, Any, List

class AnalyzerAgent:
    def __init__(self, groq_api_key: str, model: str = "llama-3.1-8b-instant"):
        self.llm = ChatGroq(
            api_key=groq_api_key,
            model=model,
            temperature=0.2
        )
    
    def analyze_research_results(
        self, 
        grievance_data: Dict[str, Any],
        search_results: Dict[str, List[Dict[str, Any]]],
        patterns: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze all research results and generate comprehensive insights
        """
        
        prompt = f"""
You are an expert analyst for government grievance resolution. Analyze the research findings and provide actionable insights.

GRIEVANCE:
{grievance_data.get('grievance_text', '')}
Category: {grievance_data.get('category', {})}
Location: {grievance_data.get('extracted_location', {})}

GOVERNMENT SCHEMES FOUND:
{self._format_search_results(search_results.get('schemes', []))}

BUDGET ALLOCATIONS:
{self._format_search_results(search_results.get('budget', []))}

DEVELOPMENT PLANS:
{self._format_search_results(search_results.get('development', []))}

AVAILABLE RESOURCES:
{self._format_search_results(search_results.get('resources', []))}

GRIEVANCE PATTERNS:
{self._format_patterns(patterns)}

Provide a comprehensive analysis including:
1. **Relevant Government Schemes**: List applicable schemes with details
2. **Budget Allocation**: Available funds and allocation priorities
3. **Development Plans**: Ongoing or planned projects related to this grievance
4. **Resources Available**: Guidelines, departments, and implementation resources
5. **Pattern Analysis**: How this grievance fits into broader patterns
6. **Recommendations**: Specific actions and priority level
7. **Estimated Timeline**: Based on similar cases and available resources
8. **Cost Estimates**: If applicable, based on budget data

Format your response as a structured JSON-like analysis.
"""
        
        try:
            response = self.llm.invoke(prompt)
            return {
                'analysis': response.content,
                'grievance_id': grievance_data.get('grievance_id'),
                'timestamp': self._get_timestamp(),
                'sources': self._extract_sources(search_results)
            }
        except Exception as e:
            print(f"Error analyzing results: {e}")
            return {
                'analysis': 'Analysis failed',
                'error': str(e)
            }
    
    def _format_search_results(self, results: List[Dict[str, Any]]) -> str:
        """Format search results for the prompt"""
        if not results:
            return "No results found."
        
        formatted = []
        for r in results[:5]:  # Limit to top 5
            formatted.append(
                f"- {r.get('title', 'N/A')}\n"
                f"  URL: {r.get('url', 'N/A')}\n"
                f"  Summary: {r.get('content', 'N/A')[:200]}..."
            )
        return "\n\n".join(formatted)
    
    def _format_patterns(self, patterns: List[Dict[str, Any]]) -> str:
        """Format grievance patterns"""
        if not patterns:
            return "No patterns identified."
        
        formatted = []
        for p in patterns[:3]:
            formatted.append(
                f"- Type: {p.get('pattern_type', 'N/A')}\n"
                f"  Location: {p.get('location', 'N/A')}\n"
                f"  Frequency: {p.get('frequency', 0)} occurrences\n"
                f"  Avg Resolution: {p.get('avg_resolution_time', 'N/A')} days"
            )
        return "\n\n".join(formatted)
    
    def _extract_sources(self, search_results: Dict[str, List[Dict[str, Any]]]) -> List[str]:
        """Extract unique URLs from search results"""
        sources = set()
        for category in search_results.values():
            for result in category:
                if 'url' in result:
                    sources.add(result['url'])
        return list(sources)
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()
