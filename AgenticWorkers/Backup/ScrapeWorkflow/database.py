import psycopg2
from psycopg2.extras import RealDictCursor, Json
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
from config import Config

class GrievanceDatabase:
    """Database interface for grievances (simplified - no embeddings)"""
    
    def __init__(self):
        self.conn = psycopg2.connect(Config.DATABASE_URL)
        self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
    

    
    def get_pending_grievances(self, limit: int = 10) -> List[Dict]:
        """Fetch grievances needing research (new or unresolved)"""
        self.cursor.execute("""
            SELECT 
                id,
                grievance_id,
                grievance_text,
                enhanced_query,
                category,
                status,
                priority,
                department_id,
                zone,
                ward,
                created_at,
                embedding
            FROM public.usergrievance
            WHERE status IN ('submitted', 'in_progress', 'assigned')
                AND grievance_text IS NOT NULL
                AND grievance_text != ''
            ORDER BY 
                CASE priority
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                    ELSE 5
                END,
                created_at DESC
            LIMIT %s
        """, (limit,))
        
        results = self.cursor.fetchall()
        print(f"📋 Found {len(results)} pending grievances")
        return results
    
    def check_url_exists(self, url: str) -> bool:
        """Check if URL already scraped (by checking if file exists)"""
        # Since we're not using database anymore, just return False
        # The file system will handle duplicates
        return False
    
    def get_research_count(self, grievance_id: str) -> int:
        """Get number of saved files for a grievance"""
        import os
        grievance_folder = os.path.join(Config.FILES_DIR, f"grievance_{grievance_id}")
        if os.path.exists(grievance_folder):
            return len([f for f in os.listdir(grievance_folder) if os.path.isfile(os.path.join(grievance_folder, f))])
        return 0
    
    def get_total_files_count(self) -> int:
        """Get total saved files count from file system"""
        import os
        total = 0
        if os.path.exists(Config.FILES_DIR):
            for grievance_folder in os.listdir(Config.FILES_DIR):
                folder_path = os.path.join(Config.FILES_DIR, grievance_folder)
                if os.path.isdir(folder_path):
                    total += len([f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))])
        return total
    
    def close(self):
        """Close database connection"""
        self.cursor.close()
        self.conn.close()
        print("🔌 Database connection closed")
