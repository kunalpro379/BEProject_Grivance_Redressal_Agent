#!/usr/bin/env python3
"""
Research Analyst Worker - Listens to Azure Queue and processes grievances
Implements pattern-based research with 95% cost reduction
"""

import sys
import json
import time
from typing import Dict, Any
from datetime import datetime
from azure.storage.queue import QueueClient

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
        
        # Initialize Azure Queue
        self.queue_name = Config.RESEARCHANALYST_QUEUE_NAME
        self.connection_string = Config.AZURE_STORAGE_CONNECTION_STRING
        
        if not self.connection_string:
            raise ValueError("AZURE_STORAGE_CONNECTION_STRING not configured")
        
        self.queue_client = QueueClient.from_connection_string(
            conn_str=self.connection_string,
            queue_name=self.queue_name
        )
        
        # Create queue if it doesn't exist
        try:
            self.queue_client.create_queue()
        except Exception as e:
            if "already exists" not in str(e).lower():
                print(f"⚠️ Queue warning: {e}")
        
        print(f"✓ Research Worker initialized")
        print(f"✓ Connected to queue: {self.queue_name}")
    
    def listen_for_grievances(self):
        """Listen to Azure Queue for new grievances from QueryAnalyst"""
        print("\n🎧 Listening for grievances from QueryAnalyst...")
        print(f"   Queue: {self.queue_name}")
        print("   Press Ctrl+C to stop\n")
        
        try:
            while True:
                try:
                    # Receive messages from queue (max 1 at a time, 30 sec visibility)
                    messages = self.queue_client.receive_messages(
                        messages_per_page=1,
                        visibility_timeout=300  # 5 minutes to process
                    )
                    
                    message_found = False
                    for message in messages:
                        message_found = True
                        
                        try:
                            # Debug: Print raw message content
                            print(f"\n📨 Raw message content:")
                            print(f"   Type: {type(message.content)}")
                            print(f"   Length: {len(message.content) if message.content else 0}")
                            print(f"   Content: {repr(message.content[:200])}")  # First 200 chars
                            
                            # Parse message
                            if not message.content or message.content.strip() == '':
                                print("⚠️ Empty message content, skipping")
                                self.queue_client.delete_message(message)
                                continue
                            
                            # Try to decode if it's base64 encoded
                            import base64
                            message_text = message.content
                            try:
                                # Check if it looks like base64
                                if message_text.endswith('==') or message_text.endswith('=') or len(message_text) % 4 == 0:
                                    decoded = base64.b64decode(message_text).decode('utf-8')
                                    print(f"   Decoded from Base64: {decoded[:200]}")
                                    message_text = decoded
                            except Exception as decode_error:
                                print(f"   Not Base64 encoded (or decode failed): {decode_error}")
                                # Continue with original message_text
                            
                            payload = json.loads(message_text)
                            grievance_id = payload.get('grievance_id')
                            
                            if not grievance_id:
                                print("⚠️ Message missing grievance_id, skipping")
                                self.queue_client.delete_message(message)
                                continue
                            
                            print(f"\n{'='*70}")
                            print(f"🔔 NEW GRIEVANCE FROM QUEUE")
                            print(f"{'='*70}")
                            print(f"   ID: {grievance_id}")
                            print(f"   Source: {payload.get('source', 'Unknown')}")
                            print(f"   Timestamp: {payload.get('timestamp', 'N/A')}")
                            print(f"{'='*70}\n")
                            
                            # Process the grievance
                            success = self.process_grievance_from_queue(grievance_id)
                            
                            if success:
                                # Delete message from queue after successful processing
                                self.queue_client.delete_message(message)
                                print(f"✓ Deleted message from queue")
                            else:
                                print(f"⚠️ Processing failed, message will retry")
                                # Message will become visible again after timeout
                            
                        except json.JSONDecodeError as e:
                            print(f"❌ Invalid JSON in message: {e}")
                            print(f"   Raw content: {repr(message.content)}")
                            print(f"   Deleting malformed message...")
                            self.queue_client.delete_message(message)
                        except Exception as e:
                            print(f"❌ Error processing message: {e}")
                            import traceback
                            traceback.print_exc()
                            # Don't delete - let it retry
                    
                    if not message_found:
                        # No messages, wait before polling again
                        time.sleep(2)
                    
                except Exception as e:
                    print(f"⚠️ Queue polling error: {e}")
                    time.sleep(5)
                    
        except KeyboardInterrupt:
            print("\n\n👋 Shutting down worker...")
        finally:
            self.db.close()
    
    def process_grievance_from_queue(self, grievance_id: str) -> bool:
        """
        Process grievance from queue by fetching from grievance_processed table
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Fetch grievance data from grievance_processed table
            print(f"📥 Fetching grievance data from database...")
            grievance_data = self._fetch_grievance_data(grievance_id)
            
            if not grievance_data:
                print(f"❌ Grievance {grievance_id} not found in grievance_processed table")
                return False
            
            grievance_text = grievance_data.get('grievance_text', '')
            if not grievance_text:
                print(f"❌ No grievance text found")
                return False
            
            print(f"✓ Fetched grievance data")
            print(f"   Category: {grievance_data.get('category', 'N/A')}")
            print(f"   Location: {grievance_data.get('location_address', 'N/A')}")
            
            # Process with pattern-based research
            return self.process_grievance(grievance_id, grievance_text, grievance_data)
            
        except Exception as e:
            print(f"❌ Error in process_grievance_from_queue: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def process_grievance(self, grievance_id: str, grievance_text: str, grievance_data: Dict[str, Any]) -> bool:
        """
        Process grievance with pattern-based research
        
        Workflow:
        1. Generate embedding
        2. Search for similar pattern
        3. If pattern found (>85% similarity): REUSE research
        4. If pattern NOT found: Run full research + create pattern
        """
        start_time = datetime.now()
        
        try:
            # Step 1: Generate embedding
            print("\n🔬 Step 1: Generating embedding...")
            embedding = self.embedding_gen.generate(grievance_text)
            
            if not embedding:
                print("❌ Failed to generate embedding")
                return False
            
            print(f"✓ Embedding generated ({len(embedding)} dimensions)")
            
            # Step 2: Search for similar pattern
            print("\n🔍 Step 2: Searching for similar patterns...")
            pattern = self.pattern_manager.find_similar_pattern(
                embedding, 
                threshold=0.85
            )
            
            if pattern:
                # PATTERN FOUND - REUSE RESEARCH
                print(f"\n✨ PATTERN MATCH FOUND!")
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
                return True
                
            else:
                # NO PATTERN - RUN FULL RESEARCH
                print("\n🆕 No similar pattern found")
                print("   Running full research workflow...")
                
                # Run full research workflow
                print("\n🔬 Step 3: Running research workflow...")
                result = self.workflow.run(grievance_id, grievance_data)
                
                if result.get('error'):
                    print(f"❌ Research failed: {result['error']}")
                    return False
                
                print("✓ Research completed")
                
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
                    
                    print(f"✓ Pattern created: {pattern_id}")
                
                elapsed = (datetime.now() - start_time).total_seconds()
                print(f"\n✅ COMPLETED in {elapsed:.2f}s (full research)")
                return True
            
        except Exception as e:
            print(f"\n❌ Error processing grievance: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def _fetch_grievance_data(self, grievance_id: str) -> Dict[str, Any]:
        """Fetch complete grievance data from grievance_processed"""
        try:
            conn = self.db.connect()
            with conn.cursor() as cursor:
                # First, check if grievance_id is a UUID (from usergrievance.id) or a string (from usergrievance.grievance_id)
                cursor.execute("""
                    SELECT 
                        gp.id, gp.grievance_id, gp.grievance_text, gp.category, 
                        ug.status, ug.priority, gp.extracted_location,
                        ug.zone, ug.ward, gp.created_at, gp.location_address,
                        gp.latitude, gp.longitude, ug.department_id
                    FROM grievance_processed gp
                    INNER JOIN usergrievance ug ON gp.grievance_id = ug.grievance_id
                    WHERE gp.grievance_id = %s OR ug.id::text = %s
                """, (grievance_id, grievance_id))
                
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
                    'extracted_location': row[6],
                    'zone': row[7],
                    'ward': row[8],
                    'created_at': str(row[9]),
                    'location_address': row[10],
                    'latitude': float(row[11]) if row[11] else None,
                    'longitude': float(row[12]) if row[12] else None,
                    'department_id': str(row[13]) if row[13] else None
                }
        except Exception as e:
            print(f"❌ Error fetching grievance: {e}")
            import traceback
            traceback.print_exc()
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
