"""
Department Allocation Tool using Supabase embedding search.
Matches grievances to departments based on location, category, and description.
"""
import os
import psycopg2
from typing import Dict, Any, Optional, List
from configs.config import Config


class DepartmentAllocator:
    def __init__(self):
        # Use direct Supabase URL for department matching
        self.db_url = Config.supabase_direct_url()
    
    def _get_connection(self):
        """Get database connection."""
        return psycopg2.connect(self.db_url)
    
    def allocate_department(
        self,
        location: str,
        recommended_department: str,
        address: str,
        query_embedding: List[float],
        category: str = ""
    ) -> Optional[Dict[str, Any]]:
        """
        Allocate department based on location, recommended department, and address.
        Uses embedding search to find the best matching department.
        
        Args:
            location: Location from query analysis
            recommended_department: Department recommended by AI
            address: Full address from location extraction
            query_embedding: Embedding vector of the query
            category: Grievance category
            
        Returns:
            Dictionary with allocated department details or None
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # Build search text combining location, department, and address
            search_text = f"{location} {recommended_department} {address} {category}".strip()
            
            print(f"   🏢 Searching departments with: {search_text[:100]}...")
            
            # Query departments table with embedding similarity search
            # Match by: location + recommended_department + address with description
            query = """
                SELECT 
                    id,
                    name,
                    description,
                    address,
                    contact_information,
                    jurisdiction,
                    embedding <=> %s::vector AS distance
                FROM departments
                WHERE 
                    (LOWER(name) LIKE LOWER(%s) OR LOWER(description) LIKE LOWER(%s))
                    AND (
                        LOWER(address) LIKE LOWER(%s) 
                        OR LOWER(jurisdiction) LIKE LOWER(%s)
                    )
                ORDER BY embedding <=> %s::vector
                LIMIT 1
            """
            
            # Create search patterns
            dept_pattern = f"%{recommended_department}%"
            location_pattern = f"%{location}%"
            
            # Convert embedding to PostgreSQL vector format
            embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
            
            cursor.execute(
                query,
                (
                    embedding_str,
                    dept_pattern,
                    dept_pattern,
                    location_pattern,
                    location_pattern,
                    embedding_str
                )
            )
            
            result = cursor.fetchone()
            
            if result:
                department_id, name, description, dept_address, contact_info, jurisdiction, distance = result
                
                print(f"      ✓ Matched: {name} (distance: {distance:.4f})")
                
                return {
                    "id": str(department_id),
                    "name": name,
                    "description": description,
                    "address": dept_address,
                    "contact_information": contact_info,
                    "jurisdiction": jurisdiction,
                    "match_score": float(1 - distance) if distance else 1.0
                }
            else:
                print(f"      ⚠️ No matching department found")
                return None
                
        except Exception as e:
            print(f"   ❌ Error allocating department: {e}")
            import traceback
            traceback.print_exc()
            return None
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()
    
    def get_department_by_id(self, department_id: str) -> Optional[Dict[str, Any]]:
        """Get department details by ID."""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    id,
                    name,
                    description,
                    address,
                    contact_information,
                    jurisdiction
                FROM departments
                WHERE id = %s
            """
            
            cursor.execute(query, (department_id,))
            result = cursor.fetchone()
            
            if result:
                department_id, name, description, address, contact_info, jurisdiction = result
                return {
                    "id": str(department_id),
                    "name": name,
                    "description": description,
                    "address": address,
                    "contact_information": contact_info,
                    "jurisdiction": jurisdiction
                }
            return None
            
        except Exception as e:
            print(f"   Error getting department by ID: {e}")
            return None
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()
