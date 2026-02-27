#!/usr/bin/env python3
"""
Autonomous Grievance Research Worker
=====================================

Continuously monitors the usergrievance table and conducts research
using LangGraph + ReAct agent workflow.

Features:
- Monitors PostgreSQL database for pending grievances
- Uses ReAct agent for intelligent research planning
- Searches web using Tavily
- Scrapes content using crawl4ai
- Saves scraped data to text/markdown files
- Runs continuously with configurable intervals
"""

import time
import schedule
import sys
from datetime import datetime
from typing import List, Dict
from config import Config
from database import GrievanceDatabase
from graph import research_workflow, visualize_workflow
from state import ResearchState

class GrievanceResearchWorker:
    """Worker that continuously monitors and researches grievances"""
    
    def __init__(self):
        print("\n🤖 Initializing Grievance Research Worker...")
        
        # Validate configuration
        try:
            Config.validate()
            print("Configuration validated")
        except ValueError as e:
            print(f"❌ Configuration error: {e}")
            print("Please check your .env file")
            sys.exit(1)
        
        # Initialize database connection
        self.db = GrievanceDatabase()
        print("Database connected")
        
        # Show workflow visualization
        visualize_workflow()
        
        print(f"⚙️ Worker Configuration:")
        print(f"   - Interval: {Config.WORKER_INTERVAL_MINUTES} minutes")
        print(f"   - Batch size: {Config.BATCH_SIZE} grievances/cycle")
        print(f"   - Max loops: {Config.MAX_LOOPS}")
        print(f"   - Max documents: {Config.MAX_TOTAL_DOCUMENTS}")
        print(f"   - LLM: {Config.GROQ_MODEL} 🤖")
        print(f"   - URLs per search: {Config.MAX_URLS_PER_SEARCH}")
        print(f"   - Files saved to: {Config.FILES_DIR}\n")
    
    def process_single_grievance(self, grievance: Dict) -> bool:
        """
        Process a single grievance through the research workflow
        
        Args:
            grievance: Grievance record from database
            
        Returns:
            bool: Success status
        """
        print(f"\n{'='*80}")
        print(f"🎯 PROCESSING GRIEVANCE")
        print(f"{'='*80}")
        print(f"ID: {grievance['grievance_id']}")
        print(f"Text: {grievance['grievance_text'][:150]}...")
        print(f"Priority: {grievance.get('priority', 'medium')}")
        print(f"Status: {grievance.get('status', 'unknown')}")
        print(f"{'='*80}\n")
        
        # Initialize state
        initial_state: ResearchState = {
            "grievance_id": str(grievance['id']),
            "grievance_text": grievance['grievance_text'],
            "original_text": None,
            "english_text": None,
            "detected_language": None,
            "grievance_category": grievance.get('category'),
            "enhanced_query": grievance.get('enhanced_query'),
            "priority": grievance.get('priority', 'medium'),
            "research_topics": [],
            "topics_covered": [],
            "current_query": "",
            "search_results": [],
            "urls_to_scrape": [],
            "scraped_documents": [],
            "downloaded_files": [],
            "processed_urls": [],
            "documents_stored": 0,
            "loop_count": 0,
            "max_loops": Config.MAX_LOOPS,
            "should_continue": True,
            "total_urls_found": 0,
            "successful_scrapes": 0,
            "failed_scrapes": 0,
            "agent_thoughts": [],
            "research_summary": "",
            "errors": [],
            "last_error": None
        }
        
        try:
            # Run the workflow
            print("🚀 Starting research workflow...\n")
            final_state = research_workflow.invoke(initial_state)
            
            # Print results
            print(f"\n{'='*80}")
            print(f"RESEARCH COMPLETED")
            print(f"{'='*80}")
            print(f"Grievance ID: {grievance['grievance_id']}")
            print(f"Documents Stored: {final_state.get('documents_stored', 0)}")
            print(f"Topics Covered: {len(final_state.get('topics_covered', []))}")
            print(f"Loops Executed: {final_state.get('loop_count', 0)}")
            print(f"URLs Processed: {len(final_state.get('processed_urls', []))}")
            
            summary = final_state.get('research_summary', 'No summary available')
            print(f"\n📝 Summary:")
            print(f"   {summary}")
            print(f"{'='*80}\n")
            
            return True
            
        except Exception as e:
            print(f"\n❌ ERROR processing grievance {grievance['grievance_id']}")
            print(f"   Error: {str(e)}")
            print(f"{'='*80}\n")
            return False
    
    def run_research_cycle(self):
        """Run one research cycle - process batch of grievances"""
        
        cycle_start = datetime.now()
        
        print(f"\n╔{'='*78}╗")
        print(f"║  🔄 STARTING RESEARCH CYCLE - {cycle_start.strftime('%Y-%m-%d %H:%M:%S')}  " + " "*(78-len(cycle_start.strftime('%Y-%m-%d %H:%M:%S'))-37) + "║")
        print(f"╚{'='*78}╝\n")
        
        try:
            # Get pending grievances
            grievances = self.db.get_pending_grievances(limit=Config.BATCH_SIZE)
            
            if not grievances:
                print("ℹ️ No pending grievances found. Waiting for next cycle...\n")
                return
            
            print(f"📋 Processing {len(grievances)} grievances in this cycle\n")
            
            # Process each grievance
            stats = {
                'processed': 0,
                'successful': 0,
                'failed': 0
            }
            
            for i, grievance in enumerate(grievances, 1):
                print(f"\n--- Grievance {i}/{len(grievances)} ---")
                
                # Check if already researched recently
                research_count = self.db.get_research_count(str(grievance['id']))
                if research_count >= 5:  # Skip if already well-researched
                    print(f"⏭️ Skipping (already has {research_count} research documents)")
                    continue
                
                success = self.process_single_grievance(grievance)
                
                stats['processed'] += 1
                if success:
                    stats['successful'] += 1
                else:
                    stats['failed'] += 1
                
                # Rate limiting between grievances
                if i < len(grievances):
                    print("⏳ Rate limiting (5 seconds)...")
                    time.sleep(5)
            
            # Cycle summary
            cycle_end = datetime.now()
            duration = (cycle_end - cycle_start).total_seconds()
            
            print(f"\n╔{'='*78}╗")
            print(f"║  CYCLE COMPLETE - {cycle_end.strftime('%Y-%m-%d %H:%M:%S')}           " + " "*(78-len(cycle_end.strftime('%Y-%m-%d %H:%M:%S'))-42) + "║")
            print(f"╠{'='*78}╣")
            print(f"║  Processed: {stats['processed']}   Successful: {stats['successful']}   Failed: {stats['failed']}   Duration: {duration:.1f}s" + " "*(78-len(f"  Processed: {stats['processed']}   Successful: {stats['successful']}   Failed: {stats['failed']}   Duration: {duration:.1f}s")-2) + "║")
            print(f"║  Total Files Saved: {self.db.get_total_files_count()}" + " "*(78-len(f"  Total Files Saved: {self.db.get_total_files_count()}")-2) + "║")
            print(f"╚{'='*78}╝\n")
            
        except Exception as e:
            print(f"\n❌ CYCLE ERROR: {e}\n")
    
    def start(self, run_immediately: bool = True):
        """
        Start the worker with scheduled intervals
        
        Args:
            run_immediately: Run one cycle immediately before scheduling
        """
        print(f"\n{'🚀'*40}")
        print(f"  GRIEVANCE RESEARCH WORKER STARTED")
        print(f"{'🚀'*40}")
        print(f"Running every {Config.WORKER_INTERVAL_MINUTES} minutes")
        print(f"Press Ctrl+C to stop\n")
        
        # Run immediately if requested
        if run_immediately:
            self.run_research_cycle()
        
        # Schedule periodic runs
        schedule.every(Config.WORKER_INTERVAL_MINUTES).minutes.do(self.run_research_cycle)
        
        # Main loop
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        except KeyboardInterrupt:
            print("\n\n⏹️ Worker stopped by user")
            self.db.close()
            print("👋 Goodbye!\n")
            sys.exit(0)
        except Exception as e:
            print(f"\n\n❌ Fatal error: {e}")
            self.db.close()
            sys.exit(1)

def main():
    """Main entry point"""
    try:
        worker = GrievanceResearchWorker()
        worker.start(run_immediately=True)
    except Exception as e:
        print(f"\n❌ Failed to start worker: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
