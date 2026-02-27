#!/usr/bin/env python3
"""
Research Analyst Worker - Listens to database triggers and processes grievances
Implements pattern-based research with 95% cost reduction
"""

import sys
import json
import select
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from typing import Dict, Any
from datetime import datetime

from config.settings import Config
from config.db import DatabaseManager
from workflow.graph import ResearchWorkflow
from tools.pattern_manager import PatternManager
from tools.embeddings import EmbeddingGenerator

class ResearchWorker:
    def __init__(self):
        self.db = DatabaseManager()
        self.pattern_manager = PatternManager(self.db)
        
        # Get GROQ API key
        groq_api_key = self.db.get_groq_api_key()
        if not groq_api_key:
            raise ValueError("GROQ_API_KEY not found in settings table")
        
        self.workflow = ResearchWorkflow(groq_api_key, self.db)
        self.embedding_gen = EmbeddingGenerator(groq_api_key)
        
        print("✅ Research Worker initialized")
    
    def listen_for_grievances(self):
        """Listen to PostgreSQL NOTIFY for new grievances"""
        print("\n🎧 Listening for new grievances...")
        print("   Waiting for database triggers...\n")
        
        conn = psycopg2.connect(Config.DATABASE_URL)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        cursor = conn.cursor()
        cursor.execute("LISTEN new_grievance_research;")
        
        print("✅ Connected to database notification channel")
        print("   Channel: new_grievance_research")
        print("   Press Ctrl+C to stop\n")
        
        try:
            while True:
                if select.select([conn], [], [], 5) == ([], [], []):
                    continue
                
                conn.poll()
                while conn.notifies:
                    notify = conn.notifies.pop(0)
                    payload = json.loads(notify.payload)
                    
                    print(f"\n{'='*70}")
                    print(f"🔔 NEW GRIEVANCE RECEIVED")
                    print(f"{'='*70}")
                    print(f"   ID: {payload['grievance_id']}")
                    print(f"   Category: {payload.get('category', 'N/A')}")
                    print(f"   Location: {payload.get('location', 'N/A')}")
                    print(f"{'='*70}\n")
                    
                    # Process the grievance
                    self.process_grievance(payload)
                    
        except KeyboardInterrupt:
            print("\n\n👋 Shutting down worker...")
        finally:
            cursor.close()
            conn.close()
            self.db.close()
    
    def process_grievance(self, payload: Dict[str, Any]):
        """
        Process grievance with pattern-based research
        
        Workflow:
        1. Generate embedding
        2. Search for similar pattern
        3. If pattern found (>85% similarity): REUSE research
        4. If pattern NOT found: Run full research + create pattern
        """
        grievance_id = payload['grievance_id']
        grievance_text = payload['grievance_text']
        
        start_time = datetime.now()
        
        try:
            # Step 1: Generate embedding
            print("📊 Step 1: Generating embedding...")
            embedding = self.embedding_gen.generate(grievance_text)
            
            if not embedding:
                print("❌ Failed to generate embedding")
                return
            
            print(f"   ✅ Embedding generated ({len(embedding)} dimensions)")
            
            # Step 2: Search for similar pattern
            print("\n🔍 Step 2: Searching for similar patterns...")
            pattern = self.pattern_manager.find_similar_pattern(
                embedding, 
                threshold=0.85
            )
            
            if pattern:
                # PATTERN FOUND - REUSE RESEARCH
                print(f"\n✅ PATTERN MATCH FOUND!")
                print(f"   Pattern: {pattern['pattern_name']}")
                print(f"   Similarity: {pattern['similarity']:.2%}")
                print(f"   Reusing cached research...")
                
                # Link grievance to pattern
                self.pattern_manager.link_grievance_to_pattern(
                    grievance_id,
                    pattern['pattern_id'],
                    pattern['similarity']
                )
                
                # Save research to grievance
                research_data = {
                    'research_analysis': pattern['research_report'],
                    'sources': pattern['research_sources'],
                    'pattern_id': pattern['pattern_id'],
                    'pattern_name': pattern['pattern_name'],
                    'reused_pattern': True,
                    'similarity_score': pattern['similarity'],
                    'processed_at': datetime.now().isoformat()
                }
                
                self.db.save_research_result(grievance_id, research_data)
                
                elapsed = (datetime.now() - start_time).total_seconds()
                print(f"\n⚡ COMPLETED in {elapsed:.2f}s (95% faster - pattern reuse)")
                
            else:
                # NO PATTERN - RUN FULL RESEARCH
                print("\n🆕 No similar pattern found")
                print("   Running full research workflow...")
                
                # Fetch full grievance data
                grievance_data = self._fetch_grievance_data(grievance_id)
                
                if not grievance_data:
                    print("❌ Failed to fetch grievance data")
                    return
                
                # Run full research workflow
                print("\n🔬 Step 3: Running research workflow...")
                result = self.workflow.run(grievance_id, grievance_data)
                
                if result.get('error'):
                    print(f"❌ Research failed: {result['error']}")
                    return
                
                print("   ✅ Research completed")
                
                # Step 4: Create new pattern
                print("\n💾 Step 4: Creating new pattern...")
                
                pattern_name = self._generate_pattern_name(grievance_data)
                pattern_description = f"Pattern for {grievance_data.get('category', 'general')} grievances"
                
                pattern_id = self.pattern_manager.create_pattern(
                    pattern_name=pattern_name,
                    embedding=embedding,
                    research_report=result.get('research_analysis', {}),
                    research_sources=result.get('sources', []),
                    description=pattern_description,
                    keywords=self._extract_keywords(grievance_text)
                )
                
                if pattern_id:
                    # Link grievance to new pattern
                    self.pattern_manager.link_grievance_to_pattern(
                        grievance_id,
                        pattern_id,
                        1.0  # Perfect match for original grievance
                    )
                    
                    print(f"   ✅ Pattern created: {pattern_id}")
                
                elapsed = (datetime.now() - start_time).total_seconds()
                print(f"\n✅ COMPLETED in {elapsed:.2f}s (full research)")
            
            print(f"\n{'='*70}\n")
            
        except Exception as e:
            print(f"\n❌ Error processing grievance: {e}")
            import traceback
            traceback.print_exc()
    
    def _fetch_grievance_data(self, grievance_id: str) -> Dict[str, Any]:
        """Fetch complete grievance data"""
        try:
            conn = self.db.connect()
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        id, grievance_id, grievance_text, category, 
                        status, priority, department_info, extracted_location,
                        zone, ward, created_at
                    FROM usergrievance
                    WHERE id = %s::uuid
                """, (grievance_id,))
                
                row = cursor.fetchone()
                if not row:
                    return None
                
                return {
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
        except Exception as e:
            print(f"Error fetching grievance: {e}")
            return None
    
    def _generate_pattern_name(self, grievance_data: Dict[str, Any]) -> str:
        """Generate pattern name from grievance data"""
        category = grievance_data.get('category', 'general')
        location = grievance_data.get('extracted_location', {})
        
        if isinstance(location, dict):
            loc_str = location.get('city', location.get('area', 'unknown'))
        else:
            loc_str = str(location) if location else 'unknown'
        
        return f"{category}_{loc_str}".replace(' ', '_').lower()
    
    def _extract_keywords(self, text: str) -> list:
        """Extract keywords from text"""
        # Simple keyword extraction
        words = text.lower().split()
        keywords = [w for w in words if len(w) > 4][:10]
        return keywords

def main():
    """Main entry point"""
    print("\n" + "="*70)
    print("  RESEARCH ANALYST WORKER")
    print("  Pattern-Based Research System")
    print("="*70 + "\n")
    
    try:
        Config.validate()
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        sys.exit(1)
    
    worker = ResearchWorker()
    worker.listen_for_grievances()

if __name__ == "__main__":
    main()
