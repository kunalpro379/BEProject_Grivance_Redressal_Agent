"""
Database module for fetching department and grievance data from Supabase
"""
import psycopg2
import psycopg2.extras
import json
from decimal import Decimal
from typing import List, Dict, Any, Optional
import config

class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle Decimal types"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

class DatabaseService:
    def __init__(self):
        self.dsn = config.DATABASE_URL
    
    def _get_connection(self):
        """Create a new database connection"""
        return psycopg2.connect(self.dsn)
    
    def get_all_departments(self) -> List[Dict[str, Any]]:
        """Fetch all active departments"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM departments WHERE is_active = TRUE")
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        except Exception as e:
            print(f"Error fetching departments: {e}")
            return []
    
    def get_department_by_id(self, department_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a specific department by ID"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM departments WHERE id = %s", (department_id,))
            result = cur.fetchone()
            cur.close()
            conn.close()
            return dict(result) if result else None
        except Exception as e:
            print(f"Error fetching department {department_id}: {e}")
            return None
    
    def get_grievances_by_department(self, department_id: str) -> List[Dict[str, Any]]:
        """Fetch all grievances for a specific department"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT 
                    g.*,
                    c.full_name as citizen_name,
                    c.email as citizen_email,
                    c.phone as citizen_phone,
                    d.name as department_name,
                    u.full_name as officer_name
                FROM usergrievance g
                LEFT JOIN citizens c ON g.citizen_id = c.id
                LEFT JOIN departments d ON g.department_id = d.id
                LEFT JOIN users u ON g.assigned_officer_id = u.id
                WHERE g.department_id = %s
                ORDER BY g.created_at DESC
            """, (department_id,))
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        except Exception as e:
            print(f"Error fetching grievances for department {department_id}: {e}")
            return []
    
    def get_grievance_feedback(self, grievance_id: str) -> Optional[Dict[str, Any]]:
        """Fetch feedback for a specific grievance"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM grievancefeedback WHERE grievance_id = %s", (grievance_id,))
            result = cur.fetchone()
            cur.close()
            conn.close()
            return dict(result) if result else None
        except Exception as e:
            return None
    
    def get_grievance_workflow(self, grievance_id: str) -> List[Dict[str, Any]]:
        """Fetch workflow stages for a specific grievance"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT * FROM grievanceworkflow 
                WHERE grievance_id = %s 
                ORDER BY step_number
            """, (grievance_id,))
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        except Exception as e:
            print(f"Error fetching workflow for grievance {grievance_id}: {e}")
            return []
    
    def get_grievance_cost_tracking(self, grievance_id: str) -> Optional[Dict[str, Any]]:
        """Fetch cost tracking data for a specific grievance"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM grievancecosttracking WHERE grievance_id = %s", (grievance_id,))
            result = cur.fetchone()
            cur.close()
            conn.close()
            return dict(result) if result else None
        except Exception as e:
            return None
    
    def get_grievance_comments(self, grievance_id: str) -> List[Dict[str, Any]]:
        """Fetch comments for a specific grievance"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT 
                    gc.*,
                    u.full_name as user_name,
                    u.email as user_email,
                    u.role as user_role
                FROM grievancecomments gc
                LEFT JOIN users u ON gc.user_id = u.id
                WHERE gc.grievance_id = %s
                ORDER BY gc.created_at
            """, (grievance_id,))
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        except Exception as e:
            print(f"Error fetching comments for grievance {grievance_id}: {e}")
            return []
    
    def get_department_officers(self, department_id: str) -> List[Dict[str, Any]]:
        """Fetch all officers in a department"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT 
                    dept_off.id,
                    dept_off.department_id,
                    dept_off.user_id,
                    dept_off.role as officer_role,
                    dept_off.status,
                    dept_off.workload,
                    dept_off.specialization,
                    dept_off.performance_score,
                    dept_off.total_assigned,
                    dept_off.total_resolved,
                    u.full_name,
                    u.email,
                    u.role,
                    u.phone
                FROM departmentofficers dept_off
                LEFT JOIN users u ON dept_off.user_id = u.id
                WHERE dept_off.department_id = %s
            """, (department_id,))
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        except Exception as e:
            print(f"Error fetching officers for department {department_id}: {e}")
            return []
    
    def get_department_budget(self, department_id: str) -> List[Dict[str, Any]]:
        """Fetch budget allocations for a department"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT * FROM budget_allocations 
                WHERE department_id = %s AND is_active = TRUE
            """, (department_id,))
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        except Exception as e:
            print(f"Error fetching budget for department {department_id}: {e}")
            return []
    
    def get_department_equipment(self, department_id: str) -> List[Dict[str, Any]]:
        """Fetch equipment for a department"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM equipment WHERE department_id = %s", (department_id,))
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        except Exception as e:
            print(f"Error fetching equipment for department {department_id}: {e}")
            return []
    
    def get_department_materials(self, department_id: str) -> List[Dict[str, Any]]:
        """Fetch material inventory for a department"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM materialinventory WHERE department_id = %s", (department_id,))
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        except Exception as e:
            print(f"Error fetching materials for department {department_id}: {e}")
            return []
    
    def get_ai_insights(self, grievance_id: str) -> List[Dict[str, Any]]:
        """Fetch AI insights for a specific grievance"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM aiinsights WHERE grievance_id = %s", (grievance_id,))
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        except Exception as e:
            print(f"Error fetching AI insights for grievance {grievance_id}: {e}")
            return []
    
    def get_escalations(self, grievance_id: str) -> List[Dict[str, Any]]:
        """Fetch escalations for a specific grievance"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM grievanceescalations WHERE grievance_id = %s", (grievance_id,))
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        except Exception as e:
            print(f"Error fetching escalations for grievance {grievance_id}: {e}")
            return []
    
    def save_progress_report_insight(self, department_id: str, report_data: Dict[str, Any]) -> bool:
        """Save progress tracking report as an AI insight"""
        try:
            import datetime
            
            # Helper function to convert datetime objects to ISO strings
            def convert_datetime(obj):
                if isinstance(obj, datetime.datetime):
                    return obj.isoformat()
                elif isinstance(obj, datetime.date):
                    return obj.isoformat()
                elif isinstance(obj, Decimal):
                    return float(obj)
                elif isinstance(obj, dict):
                    return {k: convert_datetime(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [convert_datetime(item) for item in obj]
                return obj
            
            # Clean report_data to remove datetime objects
            clean_report_data = convert_datetime(report_data)
            
            conn = self._get_connection()
            cur = conn.cursor()
            
            # Extract key metrics for the insight
            performance = clean_report_data.get("performance_metrics", {})
            grievances = clean_report_data.get("grievance_analysis", {})
            
            title = f"Department Progress Report - {clean_report_data.get('department_name', 'Unknown')}"
            description = f"""
Automated progress tracking analysis:
- Total Grievances: {grievances.get('total_grievances', 0)}
- Resolution Rate: {performance.get('resolution_rate', 0)}%
- Performance Score: {performance.get('performance_score', 0)}/100
- Overdue: {grievances.get('overdue_count', 0)}
- Stalled: {grievances.get('stalled_count', 0)}
            """.strip()
            
            # Determine priority based on performance
            priority = "medium"
            if performance.get('performance_score', 0) < 50:
                priority = "high"
            elif performance.get('performance_score', 0) > 80:
                priority = "low"
            
            # Calculate confidence score
            confidence_score = min(1.0, performance.get('performance_score', 0) / 100)
            
            cur.execute("""
                INSERT INTO aiinsights (
                    grievance_id,
                    insight_type,
                    priority,
                    confidence_score,
                    title,
                    description,
                    ai_explanation,
                    recommended_action,
                    metrics
                ) VALUES (
                    NULL,
                    'department_progress_report',
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
            """, (
                priority,
                confidence_score,
                title,
                description,
                json.dumps(clean_report_data),
                json.dumps(clean_report_data.get('recommendations', [])),
                json.dumps(performance)
            ))
            
            conn.commit()
            cur.close()
            conn.close()
            print(f"✓ Progress report saved to aiinsights table for department {department_id}")
            return True
        except Exception as e:
            print(f"Error saving progress report to database: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def get_department_projects(self, department_id: str) -> List[Dict[str, Any]]:
        """Fetch projects for a department"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT * FROM projects 
                WHERE department_id = %s
                ORDER BY created_at DESC
            """, (department_id,))
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        except Exception as e:
            # Table might not exist - return empty list
            return []
    
    def get_department_tenders(self, department_id: str) -> List[Dict[str, Any]]:
        """Fetch tenders for a department"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT * FROM tenders 
                WHERE department_id = %s
                ORDER BY created_at DESC
            """, (department_id,))
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        except Exception as e:
            # Table might not exist - return empty list
            return []
    
    def get_department_announcements(self, department_id: str) -> List[Dict[str, Any]]:
        """Fetch announcements for a department"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT * FROM announcements 
                WHERE department_id = %s
                ORDER BY created_at DESC
                LIMIT 50
            """, (department_id,))
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        except Exception as e:
            # Table might not exist - return empty list
            return []
    
    def get_department_knowledge_base(self, department_id: str) -> List[Dict[str, Any]]:
        """Fetch knowledge base documents for a department"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT * FROM departmentknowledgebase 
                WHERE department_id = %s AND is_active = TRUE
                ORDER BY created_at DESC
            """, (department_id,))
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        except Exception as e:
            print(f"Error fetching knowledge base for department {department_id}: {e}")
            return []
    
    def get_department_alerts(self, department_id: str) -> List[Dict[str, Any]]:
        """Fetch budget alerts for a department"""
        try:
            conn = self._get_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT * FROM budget_alerts 
                WHERE department_id = %s AND is_resolved = FALSE
                ORDER BY created_at DESC
            """, (department_id,))
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        except Exception as e:
            print(f"Error fetching alerts for department {department_id}: {e}")
            return []
