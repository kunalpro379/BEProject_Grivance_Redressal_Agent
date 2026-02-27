import psycopg2
from psycopg2.extras import RealDictCursor
import json
from typing import Optional, Dict, Any, List
from .settings import Config

class DatabaseManager:
    def __init__(self):
        self.connection_string = Config.DATABASE_URL
        self.conn = None
        
    def connect(self):
        """Establish database connection"""
        if not self.conn or self.conn.closed:
            self.conn = psycopg2.connect(self.connection_string)
        return self.conn
    
    def close(self):
        """Close database connection"""
        if self.conn and not self.conn.closed:
            self.conn.close()
    
    def get_setting(self, setting_key: str) -> Optional[Dict[str, Any]]:
        """Fetch a setting from the settings table"""
        try:
            conn = self.connect()
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    "SELECT setting_value FROM settings WHERE setting_key = %s AND is_active = true",
                    (setting_key,)
                )
                result = cursor.fetchone()
                return result['setting_value'] if result else None
        except Exception as e:
            print(f"Error fetching setting {setting_key}: {e}")
            return None
    
    def get_groq_api_key(self) -> Optional[str]:
        """Fetch GROQ API key from settings"""
        try:
            api_keys = self.get_setting('api_keys')
            
            # Debug output
            if api_keys is None:
                print("  Debug: api_keys setting returned None")
                print("   Checking if setting exists...")
                
                conn = self.connect()
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute("SELECT setting_key FROM settings WHERE setting_key = 'api_keys';")
                    result = cursor.fetchone()
                    if not result:
                        print("   ❌ api_keys setting does not exist in database")
                        print("   Run: python add_groq_key.py")
                    else:
                        print("   api_keys setting exists but returned None")
                        cursor.execute("SELECT setting_value, is_active FROM settings WHERE setting_key = 'api_keys';")
                        debug_result = cursor.fetchone()
                        print(f"   Value: {debug_result['setting_value']}")
                        print(f"   Active: {debug_result['is_active']}")
                return None
            
            if isinstance(api_keys, dict):
                groq_key = api_keys.get('GROQ_API_KEY')
                if groq_key:
                    return groq_key
                else:
                    print("  Debug: GROQ_API_KEY not found in api_keys dict")
                    print(f"   Available keys: {list(api_keys.keys())}")
                    return None
            else:
                print(f"  Debug: api_keys is not a dict, it's {type(api_keys)}")
                print(f"   Value: {api_keys}")
                return None
                
        except Exception as e:
            print(f"❌ Error in get_groq_api_key: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_research_prompt(self) -> Optional[str]:
        """Fetch research prompt from settings"""
        prompt_data = self.get_setting('research_prompt')
        if prompt_data and isinstance(prompt_data, dict):
            return prompt_data.get('prompt')
        return None
    
    def get_grievances_by_type(self, grievance_type: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch grievances by type/category"""
        try:
            conn = self.connect()
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT 
                        id, grievance_id, grievance_text, category, 
                        status, priority, created_at, department_info,
                        extracted_location, zone, ward
                    FROM usergrievance
                    WHERE category::text ILIKE %s
                    ORDER BY created_at DESC
                    LIMIT %s
                """, (f'%{grievance_type}%', limit))
                return cursor.fetchall()
        except Exception as e:
            print(f"Error fetching grievances: {e}")
            return []
    
    def get_similar_grievances(self, grievance_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Fetch similar grievances based on embeddings"""
        try:
            conn = self.connect()
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT 
                        g2.id, g2.grievance_id, g2.grievance_text, 
                        g2.category, g2.status, g2.resolution_time
                    FROM usergrievance g1
                    CROSS JOIN usergrievance g2
                    WHERE g1.grievance_id = %s 
                    AND g2.id != g1.id
                    AND g1.embedding IS NOT NULL 
                    AND g2.embedding IS NOT NULL
                    ORDER BY g1.embedding <-> g2.embedding
                    LIMIT %s
                """, (grievance_id, limit))
                return cursor.fetchall()
        except Exception as e:
            print(f"Error fetching similar grievances: {e}")
            return []
    
    def get_grievance_patterns(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch repeat grievance patterns"""
        try:
            conn = self.connect()
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Check if table exists first
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'repeatgrievancepatterns'
                    );
                """)
                
                if not cursor.fetchone()[0]:
                    return []
                
                cursor.execute("""
                    SELECT 
                        pattern_type, location, frequency, 
                        avg_resolution_time, last_occurrence, 
                        grievance_ids, metadata
                    FROM repeatgrievancepatterns
                    WHERE is_active = true
                    ORDER BY frequency DESC, last_occurrence DESC
                    LIMIT %s
                """, (limit,))
                return cursor.fetchall()
        except Exception as e:
            print(f"  Pattern table not available: {e}")
            return []
    
    def save_research_result(self, grievance_id: str, research_data: Dict[str, Any]):
        """Save research results back to the database"""
        conn = None
        try:
            conn = self.connect()
            with conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE usergrievance
                    SET processing_metadata = COALESCE(processing_metadata, '{}'::jsonb) || %s::jsonb,
                        updated_at = NOW()
                    WHERE grievance_id = %s
                """, (json.dumps(research_data), grievance_id))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error saving research result: {e}")
            if conn:
                conn.rollback()
            return False
        finally:
            # Don't close the connection here as it might be reused
            pass
