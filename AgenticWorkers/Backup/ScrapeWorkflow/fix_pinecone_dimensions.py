"""
Quick fix script to recreate Pinecone index with correct dimensions
This will delete the old index and create a new one with 384 dimensions
"""

from pinecone import Pinecone, ServerlessSpec
from config import Config
import time

def recreate_pinecone_index():
    """Delete and recreate Pinecone index with correct dimensions"""
    print("🔧 Recreating Pinecone index with correct dimensions...")
    print(f"   Index name: {Config.PINECONE_INDEX_NAME}")
    print(f"   Dimensions: {Config.EMBEDDING_DIM}")
    
    pc = Pinecone(api_key=Config.PINECONE_API_KEY)
    
    # Check existing indexes
    existing_indexes = [idx.name for idx in pc.list_indexes()]
    print(f"📋 Existing indexes: {existing_indexes}")
    
    # Delete old index if exists
    if Config.PINECONE_INDEX_NAME in existing_indexes:
        print(f"🗑️ Deleting old index: {Config.PINECONE_INDEX_NAME}")
        pc.delete_index(Config.PINECONE_INDEX_NAME)
        print("⏳ Waiting for deletion to complete...")
        time.sleep(5)
    
    # Create new index with correct dimensions
    print(f"✨ Creating new index with {Config.EMBEDDING_DIM} dimensions...")
    pc.create_index(
        name=Config.PINECONE_INDEX_NAME,
        dimension=Config.EMBEDDING_DIM,  # 384 for all-MiniLM-L6-v2
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )
    
    print("⏳ Waiting for index to be ready...")
    time.sleep(10)
    
    # Verify index
    index = pc.Index(Config.PINECONE_INDEX_NAME)
    stats = index.describe_index_stats()
    print(f"Index created successfully!")
    print(f" Index stats: {stats}")
    print(f"   Dimension: 384")
    print(f"   Vectors: {stats.get('total_vector_count', 0)}")
    
    return True

if __name__ == "__main__":
    print("\n" + "="*70)
    print("  PINECONE INDEX RECREATION UTILITY")
    print("="*70 + "\n")
    
    print("  WARNING: This will DELETE all existing vectors in the index!")
    print("   Old vectors will be lost permanently.\n")
    
    response = input("Continue? (yes/no): ").strip().lower()
    
    if response == 'yes':
        recreate_pinecone_index()
        print("\nDone! You can now run the worker without dimension errors.\n")
    else:
        print("\n❌ Cancelled. No changes made.\n")
