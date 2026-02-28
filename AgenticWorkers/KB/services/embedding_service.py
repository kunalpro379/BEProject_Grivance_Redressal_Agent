import uuid
from typing import List, Dict
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
from config import Config


class EmbeddingService:
    """Create embeddings for text chunks"""
    
    def __init__(self):
        print(f"   Loading embedding model: {Config.EMBED_MODEL}")
        self.model = SentenceTransformer(Config.EMBED_MODEL)
        print(f"   ✓ Model loaded")
    
    def chunk_text(self, pages: List[Dict], chunk_size: int = 1000, overlap: int = 200) -> List[Dict]:
        """Chunk text from pages with overlap"""
        chunks = []
        
        for page in pages:
            text = page["text"]
            start = 0
            
            while start < len(text):
                chunk = text[start:start + chunk_size]
                chunks.append({
                    "id": str(uuid.uuid4()),
                    "text": chunk,
                    "page": page["page"]
                })
                start += chunk_size - overlap
        
        return chunks
    
    def create_embeddings(self, chunks: List[Dict]) -> List[Dict]:
        """Create embeddings for chunks"""
        for chunk in tqdm(chunks, desc="Creating embeddings"):
            embedding = self.model.encode(chunk["text"]).tolist()
            chunk["embedding"] = embedding
        
        return chunks
    
    def prepare_chunks_for_pinecone(self, chunks: List[Dict], metadata: Dict = None) -> List[Dict]:
        """Prepare chunks with embeddings for Pinecone"""
        vectors = []
        
        for chunk in chunks:
            vector_metadata = {
                "text": chunk["text"],
                "page": chunk["page"]
            }
            
            # Add additional metadata if provided
            if metadata:
                vector_metadata.update(metadata)
            
            vectors.append({
                "id": chunk["id"],
                "values": chunk["embedding"],
                "metadata": vector_metadata
            })
        
        return vectors
