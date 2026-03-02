"""
Escalation Analyzer - Determines if grievances need to be escalated to higher hierarchy
Analyzes department performance and individual grievances to identify escalation needs
"""
import json
from typing import Dict, Any, List
import config
from database import DatabaseService
from deepseek_client import DeepSeekClient

class EscalationAnalyzer:
    def __init__(self):
        self.ai_client = DeepSeekClient()
        self.db = DatabaseService()
        print(" Escalation Analyzer initialized")
    
    def analyze_escalation_needs(self, department_id: str, department_name: str, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze if grievances need escalation based on:
        - Overdue grievances
        - Stalled grievances
        - Critical priority issues
        - Poor performance metrics
        - Citizen feedback
        """
        print(f"\n{'='*60}")
        print(f"Analyzing Escalation Needs: {department_name}")
        print(f"{'='*60}")
        
        grievance_analysis = report_data.get("grievance_analysis", {})
        performance_metrics = report_data.get("performance_metrics", {})
        detailed_grievances = report_data.get("detailed_grievances", [])
        
        # Criteria for escalation
        escalation_triggers = []
        grievances_to_escalate = []
        
        # 1. Check overdue grievances
        overdue_count = grievance_analysis.get("overdue_count", 0)
        if overdue_count > 0:
            escalation_triggers.append({
                "type": "overdue_grievances",
                "severity": "high" if overdue_count > 10 else "medium",
                "count": overdue_count,
                "reason": f"{overdue_count} grievances are overdue (>30 days)"
            })
        
        # 2. Check stalled grievances
        stalled_count = grievance_analysis.get("stalled_count", 0)
        if stalled_count > 0:
            escalation_triggers.append({
                "type": "stalled_grievances",
                "severity": "high" if stalled_count > 5 else "medium",
                "count": stalled_count,
                "reason": f"{stalled_count} grievances are stalled (no update in 7+ days)"
            })
        
        # 3. Check critical priority issues
        critical_count = grievance_analysis.get("critical_count", 0)
        if critical_count > 0:
            escalation_triggers.append({
                "type": "critical_priority",
                "severity": "critical",
                "count": critical_count,
                "reason": f"{critical_count} high/urgent/emergency priority grievances"
            })
        
        # 4. Check poor performance
        performance_score = performance_metrics.get("performance_score", 0)
        if performance_score < 50:
            escalation_triggers.append({
                "type": "poor_performance",
                "severity": "high",
                "score": performance_score,
                "reason": f"Department performance score is critically low: {performance_score}/100"
            })
        
        # 5. Check resolution rate
        resolution_rate = performance_metrics.get("resolution_rate", 0)
        if resolution_rate < 40:
            escalation_triggers.append({
                "type": "low_resolution_rate",
                "severity": "high",
                "rate": resolution_rate,
                "reason": f"Resolution rate is critically low: {resolution_rate}%"
            })
        
        # 6. Identify specific grievances that need escalation
        for grievance in detailed_grievances:
            should_escalate = False
            escalation_reasons = []
            
            progress = grievance.get("progress_analysis", {})
            feedback = grievance.get("feedback_analysis", {})
            
            # Overdue
            if progress.get("is_overdue"):
                should_escalate = True
                escalation_reasons.append(f"Overdue: {progress.get('days_open')} days open")
            
            # Stalled
            if progress.get("is_stalled"):
                should_escalate = True
                escalation_reasons.append(f"Stalled: {progress.get('days_since_update')} days since update")
            
            # Critical priority
            if grievance.get("priority") in ["high", "urgent", "emergency"]:
                should_escalate = True
                escalation_reasons.append(f"Critical priority: {grievance.get('priority')}")
            
            # Negative feedback
            if feedback.get("sentiment") == "negative" and feedback.get("rating", 5) < 3:
                should_escalate = True
                escalation_reasons.append(f"Negative feedback: {feedback.get('rating')}/5 rating")
            
            # SLA breach
            if progress.get("sla_status") == "breached":
                should_escalate = True
                escalation_reasons.append("SLA deadline breached")
            
            if should_escalate:
                grievances_to_escalate.append({
                    "grievance_id": grievance.get("grievance_id"),
                    "id": grievance.get("id"),
                    "status": grievance.get("status"),
                    "priority": grievance.get("priority"),
                    "days_open": progress.get("days_open"),
                    "escalation_reasons": escalation_reasons
                })
        
        # Determine overall escalation recommendation
        needs_escalation = len(escalation_triggers) > 0 or len(grievances_to_escalate) > 0
        
        escalation_data = {
            "department_id": department_id,
            "department_name": department_name,
            "needs_escalation": needs_escalation,
            "escalation_level": self._determine_escalation_level(escalation_triggers),
            "escalation_triggers": escalation_triggers,
            "grievances_to_escalate": grievances_to_escalate,
            "total_triggers": len(escalation_triggers),
            "total_grievances_to_escalate": len(grievances_to_escalate)
        }
        
        # Generate AI-powered escalation recommendation
        if needs_escalation:
            print("   🚨 Escalation needed - generating AI recommendation...")
            ai_recommendation = self._generate_escalation_recommendation(escalation_data, report_data)
            escalation_data["ai_recommendation"] = ai_recommendation
        else:
            print("    No escalation needed - department performing adequately")
            escalation_data["ai_recommendation"] = "No escalation required. Department is managing grievances effectively."
        
        return escalation_data
    
    def _determine_escalation_level(self, triggers: List[Dict[str, Any]]) -> str:
        """Determine escalation level based on trigger severity"""
        if not triggers:
            return "none"
        
        severities = [t.get("severity") for t in triggers]
        
        if "critical" in severities:
            return "immediate"  # Escalate to highest authority immediately
        elif severities.count("high") >= 2:
            return "urgent"  # Escalate to senior management
        elif "high" in severities:
            return "priority"  # Escalate to department head
        else:
            return "standard"  # Standard escalation process
    
    def _generate_escalation_recommendation(self, escalation_data: Dict[str, Any], report_data: Dict[str, Any]) -> str:
        """Generate AI-powered escalation recommendation using DeepSeek"""
        try:
            prompt = f"""You are an expert government escalation analyst. Based on the following department performance data and escalation triggers, provide a comprehensive escalation recommendation.

DEPARTMENT: {escalation_data.get('department_name')}
ESCALATION LEVEL: {escalation_data.get('escalation_level')}

ESCALATION TRIGGERS:
{json.dumps(escalation_data.get('escalation_triggers', []), indent=2)}

GRIEVANCES REQUIRING ESCALATION:
{json.dumps(escalation_data.get('grievances_to_escalate', [])[:5], indent=2)}

PERFORMANCE METRICS:
{json.dumps(report_data.get('performance_metrics', {}), indent=2)}

Provide a structured recommendation with:

1. ESCALATION SUMMARY (2-3 sentences)
   - Why escalation is needed
   - Severity and urgency

2. RECOMMENDED ESCALATION PATH
   - Who should be notified (department head, senior management, minister, etc.)
   - Timeline for escalation

3. CRITICAL ISSUES TO HIGHLIGHT
   - Top 3-5 most critical problems
   - Impact on citizens and department

4. IMMEDIATE ACTIONS REQUIRED
   - What needs to be done urgently
   - Resource allocation needs

5. MONITORING RECOMMENDATIONS
   - How to track improvement
   - Success metrics

Write in a professional, urgent, and actionable tone. Be specific about numbers and timelines."""

            result = self.ai_client.generate_content(prompt, temperature=0.5, max_tokens=2000)
            
            if result:
                return result['candidates'][0]['content']['parts'][0]['text'].strip()
            else:
                print(f"   ❌ DeepSeek API error")
                return self._generate_fallback_recommendation(escalation_data)
                
        except Exception as e:
            print(f"   ❌ Error generating escalation recommendation: {e}")
            return self._generate_fallback_recommendation(escalation_data)
    
    def _generate_fallback_recommendation(self, escalation_data: Dict[str, Any]) -> str:
        """Generate basic escalation recommendation if AI fails"""
        level = escalation_data.get('escalation_level')
        triggers = escalation_data.get('total_triggers', 0)
        grievances = escalation_data.get('total_grievances_to_escalate', 0)
        
        return f"""# ESCALATION REQUIRED

**Level:** {level.upper()}
**Triggers:** {triggers}
**Grievances Affected:** {grievances}

## Immediate Action Required

This department requires escalation to higher authorities due to multiple performance issues.

## Recommended Path

- **{level.upper()} escalation** to appropriate authority
- Review within 24-48 hours
- Allocate additional resources

## Critical Issues

{chr(10).join(f"- {t.get('reason')}" for t in escalation_data.get('escalation_triggers', [])[:5])}

*Note: This is a fallback recommendation. Full AI analysis was unavailable.*
"""
    
    def save_escalation_to_database(self, escalation_data: Dict[str, Any]) -> bool:
        """Save escalation analysis to grievanceescalations table"""
        try:
            if not escalation_data.get("needs_escalation"):
                print("   ℹ️  No escalation needed - skipping database save")
                return True
            
            conn = self.db._get_connection()
            cur = conn.cursor()
            
            department_id = escalation_data.get("department_id")
            saved_count = 0
            
            # Save escalation for each grievance that needs it
            for grievance in escalation_data.get("grievances_to_escalate", []):
                grievance_id = grievance.get("id")
                saved_count += 1  # Increment before trying
                
                # Check if escalation already exists (not resolved)
                cur.execute("""
                    SELECT id FROM grievanceescalations 
                    WHERE grievance_id = %s AND is_resolved = false
                """, (grievance_id,))
                
                existing = cur.fetchone()
                
                if not existing:
                    # Get a default officer to escalate to (first available officer in department)
                    cur.execute("""
                        SELECT user_id FROM departmentofficers 
                        WHERE department_id = %s 
                        LIMIT 1
                    """, (department_id,))
                    
                    officer = cur.fetchone()
                    escalated_to_officer_id = officer[0] if officer else None
                    
                    if not escalated_to_officer_id:
                        print(f"   ⚠️  No officer found for department {department_id} - skipping escalation")
                        saved_count -= 1
                        continue
                    
                    # Map escalation level to database enum (lowercase only)
                    # Database enum accepts: low, medium, high, critical
                    level_mapping = {
                        "immediate": "critical",
                        "urgent": "high",
                        "priority": "medium",
                        "standard": "low",
                        "none": "low"
                    }
                    
                    db_level = level_mapping.get(escalation_data.get("escalation_level", "standard"), "medium")
                    
                    try:
                        # Create new escalation
                        cur.execute("""
                            INSERT INTO grievanceescalations (
                                grievance_id,
                                escalated_to_officer_id,
                                escalation_level,
                                reason,
                                is_resolved,
                                created_at
                            ) VALUES (
                                %s,
                                %s,
                                %s,
                                %s,
                                false,
                                NOW()
                            )
                        """, (
                            grievance_id,
                            escalated_to_officer_id,
                            db_level,
                            json.dumps(grievance.get("escalation_reasons", []))
                        ))
                    except Exception as e:
                        # Log but don't fail - escalation is informational
                        print(f"   ⚠️  Could not save escalation for grievance {grievance_id}: {str(e)}")
                        # Don't continue - just skip this grievance
                        saved_count -= 1  # Decrement counter
            
            conn.commit()
            cur.close()
            conn.close()
            
            print(f"   💾 Saved {saved_count} escalation(s) to database")
            return True
            
        except Exception as e:
            print(f"   ❌ Error saving escalations to database: {e}")
            import traceback
            traceback.print_exc()
            return False
