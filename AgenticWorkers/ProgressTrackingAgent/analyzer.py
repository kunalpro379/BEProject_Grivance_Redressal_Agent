"""
Analyzer module for processing grievances, feedback, and proofs using DeepSeek AI
"""
import requests
from typing import Dict, Any, List, Optional
import config
import json
from deepseek_client import DeepSeekClient

class GrievanceAnalyzer:
    def __init__(self):
        # Initialize DeepSeek AI
        self.ai_client = DeepSeekClient()
        print(" AI client initialized")
    
    def analyze_status_progress(self, grievance: Dict[str, Any], workflow: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze the progress status of a grievance"""
        status = grievance.get("status", "unknown")
        created_at = grievance.get("created_at")
        updated_at = grievance.get("updated_at")
        resolved_at = grievance.get("resolved_at")
        
        # Calculate time metrics
        import datetime
        
        # Helper function to parse datetime
        def parse_datetime(dt):
            if dt is None:
                return None
            if isinstance(dt, datetime.datetime):
                return dt if dt.tzinfo else dt.replace(tzinfo=datetime.timezone.utc)
            if isinstance(dt, str):
                return datetime.datetime.fromisoformat(dt.replace('Z', '+00:00'))
            return None
        
        created = parse_datetime(created_at)
        updated = parse_datetime(updated_at)
        resolved = parse_datetime(resolved_at)
        now = datetime.datetime.now(datetime.timezone.utc)
        
        days_open = (now - created).days if created else 0
        days_since_update = (now - updated).days if updated else 0
        resolution_time = (resolved - created).days if resolved and created else None
        
        # Analyze workflow completion
        total_steps = len(workflow)
        completed_steps = sum(1 for step in workflow if step.get("is_completed", False))
        progress_percentage = (completed_steps / total_steps * 100) if total_steps > 0 else 0
        
        # Determine health status
        health_status = "healthy"
        if status == "resolved":
            health_status = "completed"
        elif days_since_update > 7:
            health_status = "stalled"
        elif days_open > 30 and status != "resolved":
            health_status = "overdue"
        elif progress_percentage < 25 and days_open > 7:
            health_status = "at_risk"
        
        return {
            "status": status,
            "health_status": health_status,
            "days_open": days_open,
            "days_since_update": days_since_update,
            "resolution_time_days": resolution_time,
            "workflow_progress": {
                "total_steps": total_steps,
                "completed_steps": completed_steps,
                "progress_percentage": round(progress_percentage, 2)
            },
            "is_overdue": days_open > 30 and status != "resolved",
            "is_stalled": days_since_update > 7,
            "sla_status": self._check_sla_status(grievance)
        }
    
    def _check_sla_status(self, grievance: Dict[str, Any]) -> str:
        """Check if grievance is within SLA"""
        sla_deadline = grievance.get("sla_deadline")
        if not sla_deadline:
            return "no_sla"
        
        import datetime
        
        # Helper function to parse datetime
        def parse_datetime(dt):
            if dt is None:
                return None
            if isinstance(dt, datetime.datetime):
                return dt if dt.tzinfo else dt.replace(tzinfo=datetime.timezone.utc)
            if isinstance(dt, str):
                return datetime.datetime.fromisoformat(dt.replace('Z', '+00:00'))
            return None
        
        deadline = parse_datetime(sla_deadline)
        if not deadline:
            return "no_sla"
            
        now = datetime.datetime.now(datetime.timezone.utc)
        
        if grievance.get("status") == "resolved":
            resolved_at = grievance.get("resolved_at")
            if resolved_at:
                resolved = parse_datetime(resolved_at)
                if resolved:
                    return "met" if resolved <= deadline else "breached"
        
        return "within" if now <= deadline else "breached"
    
    def analyze_feedback(self, feedback: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze citizen feedback using sentiment analysis"""
        if not feedback:
            return {
                "has_feedback": False,
                "rating": None,
                "sentiment": "unknown",
                "satisfaction_level": "unknown",
                "key_points": []
            }
        
        rating = feedback.get("rating")
        feedback_text = feedback.get("feedback_text", "")
        additional_comments = feedback.get("additional_comments", "")
        
        # Combine text for analysis
        full_text = f"{feedback_text} {additional_comments}".strip()
        
        # Perform sentiment analysis if enabled
        sentiment_analysis = {}
        if config.ENABLE_FEEDBACK_SENTIMENT and full_text:
            sentiment_analysis = self._analyze_sentiment(full_text)
        
        return {
            "has_feedback": True,
            "rating": rating,
            "sentiment": sentiment_analysis.get("sentiment", "neutral"),
            "sentiment_score": sentiment_analysis.get("score", 0),
            "satisfaction_level": feedback.get("satisfaction_level", "unknown"),
            "would_recommend": feedback.get("would_recommend"),
            "key_points": sentiment_analysis.get("key_points", []),
            "feedback_text": feedback_text,
            "additional_comments": additional_comments
        }
    
    def _analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of feedback text using DeepSeek AI"""
        try:
            prompt = f"""Analyze the sentiment of this feedback and respond with ONLY valid JSON containing 'sentiment', 'score', and 'key_points' fields.

Feedback: {text}

Respond with JSON in this format:
{{
  "sentiment": "positive" or "negative" or "neutral",
  "score": number between -1 and 1,
  "key_points": ["point1", "point2", ...]
}}"""

            result = self.ai_client.generate_content(prompt, temperature=0.3, max_tokens=500)
            
            if result:
                content = result['candidates'][0]['content']['parts'][0]['text'].strip()
                
                # Try to extract JSON from response
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                
                return json.loads(content)
            else:
                return {"sentiment": "neutral", "score": 0, "key_points": []}
                
        except Exception as e:
            print(f"Error analyzing sentiment: {e}")
            return {"sentiment": "neutral", "score": 0, "key_points": []}
    
    def analyze_proof_documents(self, grievance: Dict[str, Any], cost_tracking: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze proof documents (image analysis disabled, only document metadata)"""
        image_path = grievance.get("image_path")
        image_description = grievance.get("image_description")
        proof_documents = cost_tracking.get("proof_documents", []) if cost_tracking else []
        
        analysis = {
            "has_proof": bool(image_path or proof_documents),
            "image_path": image_path,
            "image_description": image_description,
            "document_count": len(proof_documents),
            "documents": proof_documents,
            "note": "Image analysis disabled - using DeepSeek which doesn't support vision"
        }
        
        return analysis
    
    def generate_grievance_summary(self, grievance_data: Dict[str, Any]) -> str:
        """Generate a comprehensive summary of the grievance using DeepSeek AI"""
        try:
            # Create a concise representation
            summary_input = {
                "grievance_id": grievance_data.get("grievance_id"),
                "status": grievance_data.get("status"),
                "priority": grievance_data.get("priority"),
                "days_open": grievance_data.get("progress_analysis", {}).get("days_open"),
                "health_status": grievance_data.get("progress_analysis", {}).get("health_status"),
                "has_feedback": grievance_data.get("feedback_analysis", {}).get("has_feedback"),
                "rating": grievance_data.get("feedback_analysis", {}).get("rating"),
                "sentiment": grievance_data.get("feedback_analysis", {}).get("sentiment")
            }
            
            prompt = f"""Create a concise 2-3 sentence summary of this grievance highlighting key points:

{json.dumps(summary_input, indent=2)}"""

            result = self.ai_client.generate_content(prompt, temperature=0.5, max_tokens=200)
            
            if result:
                return result['candidates'][0]['content']['parts'][0]['text'].strip()
            else:
                return f"Grievance {grievance_data.get('grievance_id')} - Status: {grievance_data.get('status')}"
                
        except Exception as e:
            print(f"Error generating summary: {e}")
            return f"Grievance {grievance_data.get('grievance_id')} - Status: {grievance_data.get('status')}"
    
    def analyze_department_performance(self, grievances: List[Dict[str, Any]], feedbacks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze overall department performance"""
        total_grievances = len(grievances)
        if total_grievances == 0:
            return {"total_grievances": 0, "performance_score": 0}
        
        # Status distribution
        status_counts = {}
        for g in grievances:
            status = g.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        resolved_count = status_counts.get("resolved", 0)
        resolution_rate = (resolved_count / total_grievances) * 100
        
        # Average rating from feedbacks
        ratings = [f.get("rating") for f in feedbacks if f.get("rating")]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0
        
        # Calculate resolution times
        resolution_times = []
        for g in grievances:
            if g.get("status") == "resolved" and g.get("created_at") and g.get("resolved_at"):
                import datetime
                
                # Helper function to parse datetime
                def parse_datetime(dt):
                    if dt is None:
                        return None
                    if isinstance(dt, datetime.datetime):
                        return dt if dt.tzinfo else dt.replace(tzinfo=datetime.timezone.utc)
                    if isinstance(dt, str):
                        return datetime.datetime.fromisoformat(dt.replace('Z', '+00:00'))
                    return None
                
                created = parse_datetime(g["created_at"])
                resolved = parse_datetime(g["resolved_at"])
                if created and resolved:
                    resolution_times.append((resolved - created).days)
        
        avg_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else 0
        
        # Performance score (0-100)
        performance_score = (
            (resolution_rate * 0.4) +  # 40% weight on resolution rate
            (avg_rating * 20 * 0.3) +  # 30% weight on rating (scaled to 100)
            (max(0, 100 - avg_resolution_time * 2) * 0.3)  # 30% weight on speed
        )
        
        return {
            "total_grievances": total_grievances,
            "status_distribution": status_counts,
            "resolved_count": resolved_count,
            "resolution_rate": round(resolution_rate, 2),
            "average_rating": round(avg_rating, 2),
            "average_resolution_time_days": round(avg_resolution_time, 2),
            "performance_score": round(performance_score, 2)
        }
    
    def generate_comprehensive_department_report(self, department_data: Dict[str, Any]) -> str:
        """Generate a comprehensive natural language report using Gemini AI"""
        try:
            print("    Preparing data for AI analysis...")
            
            # Prepare concise data for AI analysis
            report_input = {
                "department_name": department_data.get("department_name"),
                "summary_counts": department_data.get("summary_counts", {}),
                "grievance_analysis": department_data.get("grievance_analysis", {}),
                "performance_metrics": department_data.get("performance_metrics", {}),
                "feedback_summary": department_data.get("feedback_summary", {}),
                "resource_utilization": {
                    "officers": department_data.get("resource_utilization", {}).get("officers", {}),
                    "budget": department_data.get("resource_utilization", {}).get("budget", {}),
                    "equipment": department_data.get("resource_utilization", {}).get("equipment", {}),
                    "materials": department_data.get("resource_utilization", {}).get("materials", {}),
                    "projects": department_data.get("resource_utilization", {}).get("projects", {}),
                    "tenders": department_data.get("resource_utilization", {}).get("tenders", {}),
                    "alerts": department_data.get("resource_utilization", {}).get("alerts", {})
                }
            }
            
            prompt = f"""You are an expert government department analyst. Generate a comprehensive, professional progress tracking report for the {department_data.get('department_name')} department.

Based on the following data, create a detailed report with these sections:

1. EXECUTIVE SUMMARY (2-3 paragraphs)
   - Overall department health and performance
   - Key achievements and concerns
   - Critical action items

2. GRIEVANCE MANAGEMENT ANALYSIS
   - Total grievances and resolution status
   - Performance trends and patterns
   - Citizen satisfaction levels
   - Areas needing attention

3. RESOURCE UTILIZATION ASSESSMENT
   - Officer workload and performance
   - Budget allocation and spending
   - Equipment and material status
   - Overall resource efficiency

4. PROJECTS AND TENDERS STATUS
   - Active projects and their progress
   - Tender management
   - Delays and risks

5. CRITICAL ISSUES AND ALERTS
   - High-priority concerns
   - Budget alerts
   - Resource constraints

6. RECOMMENDATIONS
   - Immediate action items
   - Strategic improvements
   - Resource optimization suggestions

DATA:
{json.dumps(report_input, indent=2)}

Write in a professional, clear, and actionable tone. Focus on insights and recommendations, not just data repetition. Be specific about numbers and percentages."""

            print("    Calling DeepSeek AI (this may take 30-60 seconds)...")
            
            # Call DeepSeek API
            result = self.ai_client.generate_content(prompt, temperature=0.7, max_tokens=3000)
            
            if result:
                ai_text = result['candidates'][0]['content']['parts'][0]['text']
                print("    AI report generated successfully")
                return ai_text.strip()
            else:
                print(f"   ❌ DeepSeek API error")
                return self._generate_fallback_report(department_data)
            
        except Exception as e:
            print(f"   ❌ Error generating comprehensive report: {e}")
            import traceback
            traceback.print_exc()
            
            # Return a basic report if AI fails
            return self._generate_fallback_report(department_data)
    
    def _generate_fallback_report(self, department_data: Dict[str, Any]) -> str:
        """Generate a basic report if AI fails"""
        dept_name = department_data.get('department_name', 'Unknown Department')
        summary = department_data.get('summary_counts', {})
        grievances = department_data.get('grievance_analysis', {})
        performance = department_data.get('performance_metrics', {})
        
        return f"""# {dept_name} - Progress Report

## Executive Summary

This is an automated fallback report generated due to AI service unavailability.

## Key Metrics

- **Total Grievances:** {grievances.get('total_grievances', 0)}
- **Resolved:** {grievances.get('resolved_count', 0)}
- **Resolution Rate:** {performance.get('resolution_rate', 0)}%
- **Total Officers:** {summary.get('total_officers', 0)}
- **Total Projects:** {summary.get('total_projects', 0)}

## Status

The department is operational. For detailed analysis, please retry when AI services are available.

## Recommendations

1. Review pending grievances
2. Monitor resource utilization
3. Address any critical alerts

*Note: This is a fallback report. Full AI analysis was unavailable.*
"""
