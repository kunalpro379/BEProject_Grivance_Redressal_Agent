#!/usr/bin/env python3
"""
Quick test script to verify the research agent setup
"""

from config import Config
from database import GrievanceDatabase
from embeddings import EmbeddingEngine
import sys

def test_setup():
    """Test all components"""
    
    print("\n🧪 Testing Grievance Research Agent Setup\n")
    print("="*60)
    
    # Test 1: Configuration
    print("\n1️⃣ Testing Configuration...")
    try:
        Config.validate()
        print(f"   GROQ API Key: {Config.GROQ_API_KEY[:20]}...")
        print(f"   TAVILY API Key: {Config.TAVILY_API_KEY[:20]}..." if Config.TAVILY_API_KEY else "    TAVILY API Key not set")
        print(f"   PINECONE API Key: {Config.PINECONE_API_KEY[:20]}...")
        print(f"   Pinecone Index: {Config.PINECONE_INDEX_NAME}")
        print(f"   Database URL: {Config.DATABASE_URL[:50]}...")
    except Exception as e:
        print(f"   ❌ Configuration Error: {e}")
        return False
    
    # Test 2: Database Connection
    print("\n2️⃣ Testing Database Connection...")
    try:
        db = GrievanceDatabase()
        count = db.get_total_research_count()
        pinecone_count = db.get_pinecone_vector_count()
        grievances = db.get_pending_grievances(limit=1)
        print(f"   Connected to PostgreSQL")
        print(f"   Connected to Pinecone")
        print(f"   Research documents (PostgreSQL): {count}")
        print(f"   Vectors (Pinecone): {pinecone_count}")
        print(f"   Pending grievances: {len(grievances)}")
        db.close()
    except Exception as e:
        print(f"   ❌ Database Error: {e}")
        return False
    
    # Test 3: Embedding Model
    print("\n3️⃣ Testing Embedding Model...")
    try:
        embedder = EmbeddingEngine()
        test_text = "This is a test sentence"
        embedding = embedder.embed_text(test_text)
        print(f"   Embedding model loaded")
        print(f"   Embedding dimension: {len(embedding)}")
    except Exception as e:
        print(f"   ❌ Embedding Error: {e}")
        return False
    
    # Test 4: Import LangGraph
    print("\n4️⃣ Testing LangGraph Import...")
    try:
        from graph import research_workflow
        print(f"   LangGraph workflow loaded")
    except Exception as e:
        print(f"   ❌ LangGraph Error: {e}")
        return False
    
    print("\n" + "="*60)
    print("All tests passed! Ready to run worker.py")
    print("="*60 + "\n")
    
    return True

if __name__ == "__main__":
    success = test_setup()
    sys.exit(0 if success else 1)
