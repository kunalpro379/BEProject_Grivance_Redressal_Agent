#!/usr/bin/env python3
"""
Research Analyst Agent - Main Entry Point
Analyzes grievances and researches government plans, budgets, and resources
"""

import sys
import json
from config.settings import Config
from config.db import DatabaseManager
from workflow.graph import ResearchWorkflow

def main():
    """Main execution function"""
    print("🚀 Starting Research Analyst Agent...")
    
    # Validate configuration
    try:
        Config.validate()
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        sys.exit(1)
    
    # Initialize database
    db = DatabaseManager()
    
    # Get GROQ API key from settings table
    groq_api_key = db.get_groq_api_key()
    if not groq_api_key:
        print("❌ GROQ_API_KEY not found in settings table")
        sys.exit(1)
    
    print("Configuration loaded")
    print("Database connected")
    
    # Initialize workflow
    workflow = ResearchWorkflow(groq_api_key, db)
    print("Workflow initialized")
    
    # Example: Process a specific grievance
    # In production, this would be triggered by a queue or API
    if len(sys.argv) > 1:
        grievance_id = sys.argv[1]
    else:
        print("\n📋 Usage: python main.py <grievance_id>")
        print("   Or run without args to process pending grievances")
        grievance_id = None
    
    if grievance_id:
        process_single_grievance(workflow, db, grievance_id)
    else:
        process_pending_grievances(workflow, db)
    
    # Cleanup
    db.close()
    print("\nResearch Analyst Agent completed")

def process_single_grievance(workflow: ResearchWorkflow, db: DatabaseManager, grievance_id: str):
    """Process a single grievance"""
    print(f"\n Processing grievance: {grievance_id}")
    
    # Fetch grievance data
    conn = db.connect()
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT 
                id, grievance_id, grievance_text, category, 
                status, priority, department_info, extracted_location,
                zone, ward, created_at
            FROM usergrievance
            WHERE grievance_id = %s
        """, (grievance_id,))
        
        row = cursor.fetchone()
        if not row:
            print(f"❌ Grievance {grievance_id} not found")
            return
        
        grievance_data = {
            'id': str(row[0]),
            'grievance_id': row[1],
            'grievance_text': row[2],
            'category': row[3],
            'status': row[4],
            'priority': row[5],
            'department_info': row[6],
            'extracted_location': row[7],
            'zone': row[8],
            'ward': row[9],
            'created_at': str(row[10])
        }
    
    # Run workflow
    result = workflow.run(grievance_id, grievance_data)
    
    # Display results
    print("\n" + "="*60)
    print(" RESEARCH RESULTS")
    print("="*60)
    print(json.dumps(result, indent=2, default=str))

def process_pending_grievances(workflow: ResearchWorkflow, db: DatabaseManager):
    """Process grievances that need research"""
    print("\n Looking for grievances needing research...")
    
    conn = db.connect()
    with conn.cursor() as cursor:
        # Find grievances without research data
        cursor.execute("""
            SELECT grievance_id, grievance_text, category, 
                   department_info, extracted_location
            FROM usergrievance
            WHERE status IN ('submitted', 'assigned')
            AND (processing_metadata IS NULL 
                 OR NOT processing_metadata ? 'research_analysis')
            ORDER BY created_at DESC
            LIMIT 5
        """)
        
        rows = cursor.fetchall()
        
        if not rows:
            print("No pending grievances found")
            return
        
        print(f"📋 Found {len(rows)} grievances to process\n")
        
        for row in rows:
            grievance_data = {
                'grievance_id': row[0],
                'grievance_text': row[1],
                'category': row[2],
                'department_info': row[3],
                'extracted_location': row[4]
            }
            
            print(f"\n{'='*60}")
            print(f"Processing: {row[0]}")
            print(f"{'='*60}")
            
            result = workflow.run(row[0], grievance_data)
            
            if result.get('error'):
                print(f"❌ Failed: {result['error']}")
            else:
                print(f"Completed successfully")

if __name__ == "__main__":
    main()
