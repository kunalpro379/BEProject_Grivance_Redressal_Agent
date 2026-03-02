"""
Main worker for Progress Tracking Agent
Fetches department data, analyzes grievances, and generates reports every hour
"""
import schedule
import time
import datetime
from typing import Dict, Any, List
from database import DatabaseService
from analyzer import GrievanceAnalyzer
from vector_store import VectorStoreService
from report_generator import ReportGenerator
from escalation_analyzer import EscalationAnalyzer
import config

class ProgressTrackingWorker:
    def __init__(self):
        self.db = DatabaseService()
        self.analyzer = GrievanceAnalyzer()
        self.vector_store = VectorStoreService()
        self.report_gen = ReportGenerator()
        self.escalation_analyzer = EscalationAnalyzer()
        print("Progress Tracking Worker initialized")
    
    def process_department(self, department: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single department and ALL its connected data"""
        department_id = department["id"]
        department_name = department["name"]
        
        print(f"\n{'='*60}")
        print(f"Processing Department: {department_name} ({department_id})")
        print(f"{'='*60}")
        
        # Fetch ALL department-related data
        print("Fetching department data...")
        grievances = self.db.get_grievances_by_department(department_id)
        officers = self.db.get_department_officers(department_id)
        budget = self.db.get_department_budget(department_id)
        equipment = self.db.get_department_equipment(department_id)
        materials = self.db.get_department_materials(department_id)
        projects = self.db.get_department_projects(department_id)
        tenders = self.db.get_department_tenders(department_id)
        announcements = self.db.get_department_announcements(department_id)
        knowledge_base = self.db.get_department_knowledge_base(department_id)
        alerts = self.db.get_department_alerts(department_id)
        
        print(f"  - Grievances: {len(grievances)}")
        print(f"  - Officers: {len(officers)}")
        print(f"  - Budget Allocations: {len(budget)}")
        print(f"  - Equipment: {len(equipment)}")
        print(f"  - Materials: {len(materials)}")
        print(f"  - Projects: {len(projects)}")
        print(f"  - Tenders: {len(tenders)}")
        print(f"  - Announcements: {len(announcements)}")
        print(f"  - Knowledge Base: {len(knowledge_base)}")
        print(f"  - Active Alerts: {len(alerts)}")
        
        # Process each grievance
        detailed_grievances = []
        all_feedbacks = []
        
        for grievance in grievances:
            grievance_id = grievance["id"]
            
            # Fetch related data
            feedback = self.db.get_grievance_feedback(grievance_id)
            workflow = self.db.get_grievance_workflow(grievance_id)
            cost_tracking = self.db.get_grievance_cost_tracking(grievance_id)
            comments = self.db.get_grievance_comments(grievance_id)
            ai_insights = self.db.get_ai_insights(grievance_id)
            escalations = self.db.get_escalations(grievance_id)
            
            # Analyze grievance
            progress_analysis = self.analyzer.analyze_status_progress(grievance, workflow)
            feedback_analysis = self.analyzer.analyze_feedback(feedback)
            proof_analysis = self.analyzer.analyze_proof_documents(grievance, cost_tracking)
            
            # Compile grievance data
            grievance_data = {
                "grievance_id": grievance.get("grievance_id"),
                "id": grievance_id,
                "status": grievance.get("status"),
                "priority": grievance.get("priority"),
                "created_at": grievance.get("created_at"),
                "updated_at": grievance.get("updated_at"),
                "resolved_at": grievance.get("resolved_at"),
                "progress_analysis": progress_analysis,
                "feedback_analysis": feedback_analysis,
                "proof_analysis": proof_analysis,
                "workflow_stages": len(workflow),
                "comments_count": len(comments),
                "ai_insights_count": len(ai_insights),
                "escalations_count": len(escalations),
                "cost_tracking": {
                    "total_cost": cost_tracking.get("total_cost") if cost_tracking else 0,
                    "budget_allocated": cost_tracking.get("budget_allocated") if cost_tracking else 0,
                    "status": cost_tracking.get("status") if cost_tracking else "unknown"
                },
                "analyzed_at": datetime.datetime.now().isoformat()
            }
            
            # Generate summary
            grievance_data["summary"] = self.analyzer.generate_grievance_summary(grievance_data)
            
            # Store in vector store
            self.vector_store.store_grievance_data(
                grievance_id=grievance_id,
                department_id=department_id,
                analysis_data=grievance_data
            )
            
            detailed_grievances.append(grievance_data)
            
            if feedback:
                all_feedbacks.append(feedback_analysis)
        
        # Analyze department performance
        performance_metrics = self.analyzer.analyze_department_performance(grievances, all_feedbacks)
        
        # Compile grievance analysis
        grievance_analysis = {
            "total_grievances": len(grievances),
            "resolved_count": sum(1 for g in grievances if g.get("status") == "resolved"),
            "overdue_count": sum(1 for g in detailed_grievances if g["progress_analysis"].get("is_overdue")),
            "stalled_count": sum(1 for g in detailed_grievances if g["progress_analysis"].get("is_stalled")),
            "critical_count": sum(1 for g in grievances if g.get("priority") in ["high", "urgent", "emergency"]),
            "status_distribution": performance_metrics.get("status_distribution", {})
        }
        
        # Compile feedback summary
        feedback_summary = {
            "total_feedback": len(all_feedbacks),
            "average_rating": performance_metrics.get("average_rating", 0),
            "positive_count": sum(1 for f in all_feedbacks if f.get("sentiment") == "positive"),
            "negative_count": sum(1 for f in all_feedbacks if f.get("sentiment") == "negative"),
            "neutral_count": sum(1 for f in all_feedbacks if f.get("sentiment") == "neutral")
        }
        
        # Analyze officers
        total_officers = len(officers)
        active_officers = sum(1 for o in officers if o.get("status") == "available")
        total_workload = sum(o.get("workload", 0) for o in officers)
        avg_performance = sum(float(o.get("performance_score", 0) or 0) for o in officers) / total_officers if total_officers > 0 else 0
        
        officer_analysis = {
            "total_officers": total_officers,
            "active_officers": active_officers,
            "busy_officers": sum(1 for o in officers if o.get("status") == "busy"),
            "on_leave_officers": sum(1 for o in officers if o.get("status") == "on_leave"),
            "total_workload": total_workload,
            "average_workload": total_workload / total_officers if total_officers > 0 else 0,
            "average_performance_score": round(avg_performance, 2),
            "total_assigned": sum(o.get("total_assigned", 0) for o in officers),
            "total_resolved": sum(o.get("total_resolved", 0) for o in officers),
            "officer_utilization": (total_workload / (total_officers * 10) * 100) if total_officers > 0 else 0
        }
        
        # Analyze budget
        total_allocated = sum(float(b.get("allocation_amount", 0) or 0) for b in budget)
        active_allocations = sum(1 for b in budget if b.get("status") == "Active")
        
        budget_analysis = {
            "total_allocations": len(budget),
            "active_allocations": active_allocations,
            "total_allocated": round(total_allocated, 2),
            "budget_used": float(department.get("budget_used", 0) or 0),
            "budget_remaining": round(total_allocated - float(department.get("budget_used", 0) or 0), 2),
            "utilization_percent": round((float(department.get("budget_used", 0) or 0) / total_allocated * 100), 2) if total_allocated > 0 else 0,
            "exhausted_allocations": sum(1 for b in budget if b.get("status") == "Exhausted"),
            "on_hold_allocations": sum(1 for b in budget if b.get("status") == "On Hold")
        }
        
        # Analyze equipment
        equipment_analysis = {
            "total_equipment": len(equipment),
            "available_equipment": sum(1 for e in equipment if e.get("status") == "available"),
            "in_use_equipment": sum(1 for e in equipment if e.get("status") == "in_use"),
            "under_maintenance": sum(1 for e in equipment if e.get("status") == "maintenance"),
            "damaged_equipment": sum(1 for e in equipment if e.get("status") == "damaged"),
            "availability_percent": round((sum(1 for e in equipment if e.get("status") == "available") / len(equipment) * 100), 2) if len(equipment) > 0 else 0
        }
        
        # Analyze materials
        materials_analysis = {
            "total_materials": len(materials),
            "adequate_stock": sum(1 for m in materials if m.get("status") == "adequate"),
            "low_stock": sum(1 for m in materials if m.get("status") == "low"),
            "critical_stock": sum(1 for m in materials if m.get("status") == "critical"),
            "out_of_stock": sum(1 for m in materials if m.get("status") == "out_of_stock")
        }
        
        # Analyze projects
        projects_analysis = {
            "total_projects": len(projects),
            "active_projects": sum(1 for p in projects if p.get("status") == "In Progress"),
            "completed_projects": sum(1 for p in projects if p.get("status") == "Completed"),
            "delayed_projects": sum(1 for p in projects if p.get("status") == "Delayed"),
            "on_hold_projects": sum(1 for p in projects if p.get("status") == "On Hold"),
            "at_risk_projects": sum(1 for p in projects if p.get("risk_level") in ["High", "Critical"])
        }
        
        # Analyze tenders
        tenders_analysis = {
            "total_tenders": len(tenders),
            "active_tenders": sum(1 for t in tenders if t.get("status") == "Active"),
            "closed_tenders": sum(1 for t in tenders if t.get("status") == "Closed"),
            "awarded_tenders": sum(1 for t in tenders if t.get("status") == "Awarded"),
            "cancelled_tenders": sum(1 for t in tenders if t.get("status") == "Cancelled")
        }
        
        # Analyze knowledge base
        knowledge_base_analysis = {
            "total_documents": len(knowledge_base),
            "total_views": sum(kb.get("view_count", 0) for kb in knowledge_base),
            "total_downloads": sum(kb.get("download_count", 0) for kb in knowledge_base),
            "categories": list(set(kb.get("category") for kb in knowledge_base if kb.get("category")))
        }
        
        # Analyze alerts
        alerts_analysis = {
            "total_active_alerts": len(alerts),
            "high_severity": sum(1 for a in alerts if a.get("severity") == "High"),
            "critical_severity": sum(1 for a in alerts if a.get("severity") == "Critical"),
            "medium_severity": sum(1 for a in alerts if a.get("severity") == "Medium"),
            "low_severity": sum(1 for a in alerts if a.get("severity") == "Low"),
            "alert_types": list(set(a.get("alert_type") for a in alerts if a.get("alert_type")))
        }
        
        # Compile comprehensive resource utilization
        resource_utilization = {
            "officers": officer_analysis,
            "budget": budget_analysis,
            "equipment": equipment_analysis,
            "materials": materials_analysis,
            "projects": projects_analysis,
            "tenders": tenders_analysis,
            "knowledge_base": knowledge_base_analysis,
            "alerts": alerts_analysis
        }
        
        # Compile comprehensive report data
        report_data = {
            "department_id": department_id,
            "department_name": department_name,
            "department_info": {
                "name": department_name,
                "description": department.get("description"),
                "contact_email": department.get("contact_email"),
                "contact_phone": department.get("contact_phone"),
                "is_active": department.get("is_active")
            },
            "grievance_analysis": grievance_analysis,
            "performance_metrics": performance_metrics,
            "feedback_summary": feedback_summary,
            "resource_utilization": resource_utilization,
            "detailed_grievances": detailed_grievances[:10],  # Limit to first 10 for report size
            "summary_counts": {
                "total_grievances": len(grievances),
                "total_officers": total_officers,
                "total_projects": len(projects),
                "total_tenders": len(tenders),
                "total_equipment": len(equipment),
                "total_materials": len(materials),
                "total_budget_allocations": len(budget),
                "total_announcements": len(announcements),
                "total_knowledge_base": len(knowledge_base),
                "active_alerts": len(alerts)
            }
        }
        
        # Generate AI-powered comprehensive report
        print("Generating AI-powered comprehensive report...")
        ai_report = self.analyzer.generate_comprehensive_department_report(report_data)
        
        # Generate report files
        report_path = self.report_gen.generate_department_report(
            department_id=department_id,
            department_name=department_name,
            report_data=report_data,
            ai_report=ai_report
        )
        
        # Add AI report to data for database storage
        report_data["ai_generated_report"] = ai_report
        
        # Save report to database as AI insight
        self.db.save_progress_report_insight(department_id, report_data)
        
        # ESCALATION ANALYSIS - Check if issues need escalation
        print("\n🔍 Running Escalation Analysis...")
        escalation_data = self.escalation_analyzer.analyze_escalation_needs(
            department_id=department_id,
            department_name=department_name,
            report_data=report_data
        )
        
        # Save escalations to database
        if escalation_data.get("needs_escalation"):
            self.escalation_analyzer.save_escalation_to_database(escalation_data)
            print(f"   🚨 ESCALATION REQUIRED: {escalation_data.get('escalation_level').upper()}")
            print(f"   📊 Triggers: {escalation_data.get('total_triggers')}")
            print(f"   📋 Grievances to escalate: {escalation_data.get('total_grievances_to_escalate')}")
        else:
            print("   ✅ No escalation needed")
        
        # Add escalation data to report
        report_data["escalation_analysis"] = escalation_data
        
        print(f"Department {department_name} processing complete")
        print(f"Report saved to: {report_path}")
        
        return report_data
    
    def run_analysis(self):
        """Run analysis for all departments or specific department if configured"""
        print(f"\n{'#'*60}")
        print(f"Starting Progress Tracking Analysis")
        print(f"Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'#'*60}\n")
        
        try:
            # Check if specific department is configured
            if config.TARGET_DEPARTMENT_ID:
                print(f"🎯 Target Department ID: {config.TARGET_DEPARTMENT_ID}")
                print(f"   Processing ONLY this department\n")
                
                # Fetch specific department
                department = self.db.get_department_by_id(config.TARGET_DEPARTMENT_ID)
                
                if not department:
                    print(f"❌ Department {config.TARGET_DEPARTMENT_ID} not found or inactive")
                    return
                
                if not department.get('is_active'):
                    print(f"❌ Department {config.TARGET_DEPARTMENT_ID} is not active")
                    return
                
                departments = [department]
            else:
                # Fetch all departments
                departments = self.db.get_all_departments()
            
            print(f"Found {len(departments)} department(s) to process")
            
            if not departments:
                print("No departments found. Exiting.")
                return
            
            # Process each department
            all_reports = []
            for department in departments:
                try:
                    report_data = self.process_department(department)
                    all_reports.append(report_data)
                except Exception as e:
                    print(f"Error processing department {department.get('name')}: {e}")
                    import traceback
                    traceback.print_exc()
            
            # Generate consolidated report (only if processing multiple departments)
            if len(all_reports) > 1:
                self.report_gen.generate_consolidated_report(all_reports)
            
            print(f"\n{'#'*60}")
            print(f"Analysis Complete")
            print(f"Processed {len(all_reports)} department(s)")
            print(f"{'#'*60}\n")
            
        except Exception as e:
            print(f"Error in run_analysis: {e}")
            import traceback
            traceback.print_exc()
    
    def start_scheduler(self):
        """Start the scheduler to run analysis every hour"""
        print(f"Starting Progress Tracking Worker")
        print(f"Analysis will run every {config.REPORT_GENERATION_INTERVAL_HOURS} hour(s)")
        
        # Run immediately on start
        self.run_analysis()
        
        # Schedule periodic runs
        schedule.every(config.REPORT_GENERATION_INTERVAL_HOURS).hours.do(self.run_analysis)
        
        print("Scheduler started. Press Ctrl+C to stop.")
        
        # Keep running
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute

def main():
    """Main entry point"""
    import sys
    
    worker = ProgressTrackingWorker()
    
    # Check if --once flag is provided (for single execution)
    if '--once' in sys.argv:
        print("Running single analysis (--once mode)")
        try:
            worker.run_analysis()
            print("Single analysis complete. Exiting.")
        except Exception as e:
            print(f"Fatal error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
    else:
        # Normal continuous mode
        try:
            worker.start_scheduler()
        except KeyboardInterrupt:
            print("\nShutting down Progress Tracking Worker...")
        except Exception as e:
            print(f"Fatal error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()
