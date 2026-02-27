from typing import List, Dict, Any, Optional
from config.settings import Config
from config.db import DatabaseManager

class VectorDBTool:
    """Vector database tool using Supabase/PostgreSQL pgvector for grievance similarity search"""
    
    def __init__(self, db_manager: DatabaseManager = None):
        self.db = db_manager or DatabaseManager()
    
    def search_similar_grievances(self, grievance_id: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for similar grievances using pgvector similarity"""
        try:
            similar = self.db.get_similar_grievances(grievance_id, limit=top_k)
            print(f"Found {len(similar)} similar grievances")
            return similar
        except Exception as e:
            print(f"  Error searching similar grievances: {e}")
            return []
    
    def get_grievance_patterns(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get repeat grievance patterns from database"""
        try:
            patterns = self.db.get_grievance_patterns(limit=limit)
            print(f"Found {len(patterns)} grievance patterns")
            return patterns
        except Exception as e:
            print(f"  Error fetching patterns: {e}")
            return []
    
    def store_research(self, grievance_id: str, research_data: Dict[str, Any]) -> bool:
        """Store research results in the database"""
        try:
            success = self.db.save_research_result(grievance_id, research_data)
            if success:
                print(f"Research results saved for {grievance_id}")
            return success
        except Exception as e:
            print(f"❌ Error storing research: {e}")
            return False
