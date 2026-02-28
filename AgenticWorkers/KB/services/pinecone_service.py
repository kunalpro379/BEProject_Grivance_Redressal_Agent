from typing import List, Dict
from pinecone import Pinecone, ServerlessSpec
from config import Config


class PineconeService:
    """Manage Pinecone vector database operations"""
    
    def __init__(self):
        self.pc = Pinecone(api_key=Config.PINECONE_API_KEY)
        self.index_name = Config.PINECONE_INDEX_NAME
        self.index = None
        self._ensure_index()
    
    def _ensure_index(self):
        """Ensure Pinecone index exists"""
        try:
            existing_indexes = [idx["name"] for idx in self.pc.list_indexes()]
            
            if self.index_name not in existing_indexes:
                print(f"   Creating Pinecone index: {self.index_name}")
                self.pc.create_index(
                    name=self.index_name,
                    dimension=384,  # all-MiniLM-L6-v2 dimension
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud="aws",
                        region="us-east-1"
                    )
                )
                print(f"   ✓ Index created")
            
            self.index = self.pc.Index(self.index_name)
            
        except Exception as e:
            print(f"   ❌ Failed to ensure Pinecone index: {e}")
            raise
    
    def upsert_vectors(self, vectors: List[Dict], batch_size: int = 100):
        """Upsert vectors to Pinecone in batches"""
        try:
            total = len(vectors)
            print(f"   Upserting {total} vectors to Pinecone...")
            
            for i in range(0, total, batch_size):
                batch = vectors[i:i + batch_size]
                self.index.upsert(vectors=batch)
            
            print(f"   ✓ Stored {total} vectors in Pinecone")
            
        except Exception as e:
            print(f"   ❌ Failed to upsert vectors: {e}")
            raise
    
    def query(self, query_vector: List[float], top_k: int = 5, filter: Dict = None) -> Dict:
        """Query Pinecone index"""
        try:
            results = self.index.query(
                vector=query_vector,
                top_k=top_k,
                filter=filter,
                include_metadata=True
            )
            return results
            
        except Exception as e:
            print(f"   ❌ Failed to query Pinecone: {e}")
            raise
