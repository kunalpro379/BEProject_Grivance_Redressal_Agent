"""
Helper script to generate embeddings for departments in Supabase.
Run this after populating the departments table with data.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

import psycopg2
from sentence_transformers import SentenceTransformer
from configs.config import Config


def generate_embeddings():
    """Generate embeddings for all departments without embeddings."""
    
    print("🚀 Starting department embedding generation...")
    
    # Initialize embedding model
    print("   Loading embedding model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer(Config.EMBEDDING_MODEL)
    print("   ✓ Model loaded")
    
    # Connect to Supabase
    password = Config.SUPABASE_DB_PASSWORD
    if not password:
        print("   ❌ Error: SUPABASE_DB_PASSWORD not set in environment")
        sys.exit(1)
    
    db_url = Config.supabase_direct_url()
    
    try:
        print("   Connecting to Supabase...")
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        print("   ✓ Connected")
    except Exception as e:
        print(f"   ❌ Error connecting to database: {e}")
        sys.exit(1)
    
    # Get all departments
    try:
        cursor.execute("""
            SELECT id, name, description, address, jurisdiction 
            FROM departments
        """)
        departments = cursor.fetchall()
        print(f"   Found {len(departments)} departments")
    except Exception as e:
        print(f"   ❌ Error fetching departments: {e}")
        cursor.close()
        conn.close()
        sys.exit(1)
    
    if not departments:
        print("   ⚠️  No departments found in the table")
        cursor.close()
        conn.close()
        return
    
    # Generate embeddings for each department
    updated_count = 0
    error_count = 0
    
    for dept_id, name, description, address, jurisdiction in departments:
        try:
            # Create text for embedding
            text_parts = []
            if name:
                text_parts.append(str(name))
            if description:
                text_parts.append(str(description))
            if address:
                text_parts.append(str(address))
            if jurisdiction:
                text_parts.append(str(jurisdiction))
            
            text = " ".join(text_parts)
            
            if not text.strip():
                print(f"   ⚠️  Skipping department {dept_id} - no text to embed")
                continue
            
            # Generate embedding
            embedding = model.encode(text).tolist()
            
            # Update department
            embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
            cursor.execute(
                "UPDATE departments SET embedding = %s::vector WHERE id = %s",
                (embedding_str, dept_id)
            )
            
            updated_count += 1
            print(f"   ✓ Updated: {name[:50]}...")
            
        except Exception as e:
            error_count += 1
            print(f"   ❌ Error updating {name}: {e}")
    
    # Commit changes
    try:
        conn.commit()
        print(f"\n✅ Successfully updated {updated_count} departments")
        if error_count > 0:
            print(f"⚠️  {error_count} departments had errors")
    except Exception as e:
        print(f"   ❌ Error committing changes: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()


def test_search():
    """Test department search with a sample query."""
    
    print("\n🧪 Testing department search...")
    
    from tools.embeddings import EmbeddingEngine
    from tools.department_allocator import DepartmentAllocator
    
    # Initialize engines
    embedding_engine = EmbeddingEngine()
    allocator = DepartmentAllocator()
    
    # Test query
    test_query = "Garbage pile near my house in Bangalore causing health issues"
    
    print(f"   Query: {test_query}")
    
    # Generate embedding
    embedding = embedding_engine.embed_query(test_query)
    
    # Search for department
    result = allocator.allocate_department(
        location="Bangalore",
        recommended_department="Sanitation Department",
        address="Indiranagar, Bangalore",
        query_embedding=embedding,
        category="Sanitation"
    )
    
    if result:
        print(f"\n   ✓ Found department:")
        print(f"      Name: {result['name']}")
        print(f"      Description: {result['description'][:100]}...")
        print(f"      Address: {result['address']}")
        print(f"      Match Score: {result['match_score']:.4f}")
    else:
        print(f"\n   ⚠️  No department found")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate embeddings for departments")
    parser.add_argument("--test", action="store_true", help="Test department search after generation")
    args = parser.parse_args()
    
    generate_embeddings()
    
    if args.test:
        test_search()
    
    print("\n✅ Done!")
