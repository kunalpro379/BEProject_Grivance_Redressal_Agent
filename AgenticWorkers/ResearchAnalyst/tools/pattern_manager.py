"""
Pattern Manager - Handles pattern detection and caching
"""
import json
from typing import Optional, Dict, List, Any
from config.db import DatabaseManager

class PatternManager:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.similarity_threshold = 0.85  # 85% similarity to reuse pattern
    
    def find_similar_pattern(self, embedding: List[float], threshold: float = None) -> Optional[Dict[str, Any]]:
        """
        Find similar pattern using vector similarity search
        
        Args:
            embedding: Grievance embedding vector
            threshold: Similarity threshold (default: 0.85)
        
        Returns:
            Pattern dict if found, None otherwise
        """
        threshold = threshold or self.similarity_threshold
        
        try:
            conn = self.db.connect()
            with conn.cursor() as cursor:
                # Convert embedding to PostgreSQL array format
                embedding_str = '[' + ','.join(map(str, embedding)) + ']'
                
                cursor.execute("""
                    SELECT 
                        pattern_id,
                        pattern_name,
                        pattern_description,
                        research_report,
                        research_sources,
                        grievance_count,
                        1 - (pattern_embedding <=> %s::vector) as similarity
                    FROM grievance_patterns
                    WHERE pattern_embedding IS NOT NULL
                    ORDER BY pattern_embedding <=> %s::vector
                    LIMIT 1
                """, (embedding_str, embedding_str))
                
                result = cursor.fetchone()
                
                if result and result[6] >= threshold:  # similarity column
                    return {
                        'pattern_id': result[0],
                        'pattern_name': result[1],
                        'pattern_description': result[2],
                        'research_report': result[3],
                        'research_sources': result[4],
                        'grievance_count': result[5],
                        'similarity': result[6]
                    }
                
                return None
                
        except Exception as e:
            print(f"Error finding similar pattern: {e}")
            return None
    
    def create_pattern(
        self,
        pattern_name: str,
        embedding: List[float],
        research_report: Dict[str, Any],
        research_sources: List[Dict[str, Any]],
        description: str = None,
        keywords: List[str] = None
    ) -> Optional[str]:
        """
        Create new pattern
        
        Returns:
            pattern_id if successful, None otherwise
        """
        try:
            conn = self.db.connect()
            with conn.cursor() as cursor:
                embedding_str = '[' + ','.join(map(str, embedding)) + ']'
                
                cursor.execute("""
                    INSERT INTO grievance_patterns (
                        pattern_name,
                        pattern_description,
                        pattern_embedding,
                        research_report,
                        research_sources,
                        keywords
                    ) VALUES (%s, %s, %s::vector, %s, %s, %s)
                    RETURNING pattern_id
                """, (
                    pattern_name,
                    description,
                    embedding_str,
                    json.dumps(research_report),
                    json.dumps(research_sources),
                    keywords or []
                ))
                
                pattern_id = cursor.fetchone()[0]
                conn.commit()
                
                print(f"✅ Created new pattern: {pattern_name} ({pattern_id})")
                return str(pattern_id)
                
        except Exception as e:
            print(f"Error creating pattern: {e}")
            if conn:
                conn.rollback()
            return None
    
    def link_grievance_to_pattern(
        self,
        grievance_id: str,
        pattern_id: str,
        confidence_score: float
    ) -> bool:
        """Link grievance to pattern"""
        try:
            conn = self.db.connect()
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO grievance_pattern_map (
                        grievance_id,
                        pattern_id,
                        confidence_score
                    ) VALUES (%s, %s, %s)
                    ON CONFLICT (grievance_id, pattern_id) 
                    DO UPDATE SET confidence_score = EXCLUDED.confidence_score
                """, (grievance_id, pattern_id, confidence_score))
                
                conn.commit()
                return True
                
        except Exception as e:
            print(f"Error linking grievance to pattern: {e}")
            if conn:
                conn.rollback()
            return False
    
    def get_pattern_statistics(self) -> List[Dict[str, Any]]:
        """Get pattern usage statistics"""
        try:
            conn = self.db.connect()
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT * FROM pattern_statistics
                    ORDER BY grievance_count DESC
                    LIMIT 20
                """)
                
                columns = [desc[0] for desc in cursor.description]
                results = []
                for row in cursor.fetchall():
                    results.append(dict(zip(columns, row)))
                
                return results
                
        except Exception as e:
            print(f"Error getting pattern statistics: {e}")
            return []
