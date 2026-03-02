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
        category: str = "",
        latitude: float = None,
        longitude: float = None
    ) -> Optional[Dict[str, Any]]:
        """
        Allocate department based on location, recommended department, address, and coordinates.
        Uses embedding search + geographic distance to find the best matching department.
        
        Args:
            location: Location from query analysis
            recommended_department: Department recommended by AI
            address: Full address from location extraction
            query_embedding: Embedding vector of the query
            category: Grievance category
            latitude: Grievance latitude coordinate
            longitude: Grievance longitude coordinate
            
        Returns:
            Dictionary with allocated department details or None
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # Build search text combining location, department, address, and category
            search_text = f"{location} {recommended_department} {address} {category}".strip()
            
            print(f"   🏢 Searching departments with: {search_text[:100]}...")
            if latitude and longitude:
                print(f"   📍 Grievance coordinates: ({latitude}, {longitude})")
            
            # Query departments table with embedding similarity + geographic distance
            # If coordinates provided, calculate distance using PostGIS or simple formula
            if latitude and longitude:
                # Use Haversine formula for distance calculation
                query = """
                    SELECT 
                        id,
                        name,
                        description,
                        address,
                        contact_information,
                        jurisdiction,
                        latitude,
                        longitude,
                        embedding <=> %s::vector AS embedding_distance,
                        (
                            6371 * acos(
                                cos(radians(%s)) * cos(radians(COALESCE(latitude, 0))) *
                                cos(radians(COALESCE(longitude, 0)) - radians(%s)) +
                                sin(radians(%s)) * sin(radians(COALESCE(latitude, 0)))
                            )
                        ) AS geo_distance_km
                    FROM departments
                    WHERE 
                        (LOWER(name) LIKE LOWER(%s) OR LOWER(description) LIKE LOWER(%s))
                        AND (
                            LOWER(address) LIKE LOWER(%s) 
                            OR LOWER(jurisdiction) LIKE LOWER(%s)
                        )
                        AND latitude IS NOT NULL
                        AND longitude IS NOT NULL
                    ORDER BY 
                        (embedding <=> %s::vector) * 0.6 + (geo_distance_km / 100) * 0.4
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
                        latitude,
                        longitude,
                        latitude,
                        dept_pattern,
                        dept_pattern,
                        location_pattern,
                        location_pattern,
                        embedding_str
                    )
                )
            else:
                # Fallback to embedding-only search if no coordinates
                query = """
                    SELECT 
                        id,
                        name,
                        description,
                        address,
                        contact_information,
                        jurisdiction,
                        latitude,
                        longitude,
                        embedding <=> %s::vector AS embedding_distance,
                        NULL AS geo_distance_km
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
                department_id, name, description, dept_address, contact_info, jurisdiction, dept_lat, dept_lon, emb_distance, geo_distance = result
                
                print(f"      ✓ Matched: {name}")
                print(f"        - Embedding distance: {emb_distance:.4f}")
                if geo_distance is not None:
                    print(f"        - Geographic distance: {geo_distance:.2f} km")
                
                return {
                    "id": str(department_id),
                    "name": name,
                    "description": description,
                    "address": dept_address,
                    "contact_information": contact_info,
                    "jurisdiction": jurisdiction,
                    "latitude": float(dept_lat) if dept_lat else None,
                    "longitude": float(dept_lon) if dept_lon else None,
                    "match_score": float(1 - emb_distance) if emb_distance else 1.0,
                    "distance_km": float(geo_distance) if geo_distance else None
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
