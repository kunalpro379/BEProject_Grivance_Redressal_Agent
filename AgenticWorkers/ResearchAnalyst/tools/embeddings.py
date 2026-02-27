"""
Embedding Generator - Creates embeddings for pattern matching
"""
import requests
from typing import List, Optional

class EmbeddingGenerator:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.model = "llama-3.3-70b-versatile"  # Using GROQ
        self.dimension = 1536  # Standard embedding dimension
    
    def generate(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding for text
        
        Note: GROQ doesn't have native embedding API yet,
        so we'll use a simple approach or integrate with another service
        
        For production, use:
        - OpenAI embeddings
        - Sentence Transformers
        - Cohere embeddings
        """
        try:
            # Placeholder: In production, use proper embedding service
            # For now, return a mock embedding
            # TODO: Integrate with OpenAI or Sentence Transformers
            
            # Simple hash-based embedding (NOT FOR PRODUCTION)
            import hashlib
            hash_obj = hashlib.sha256(text.encode())
            hash_bytes = hash_obj.digest()
            
            # Convert to float array
            embedding = []
            for i in range(0, len(hash_bytes), 2):
                val = (hash_bytes[i] * 256 + hash_bytes[i+1]) / 65535.0
                embedding.append(val)
            
            # Pad to 1536 dimensions
            while len(embedding) < self.dimension:
                embedding.extend(embedding[:min(len(embedding), self.dimension - len(embedding))])
            
            return embedding[:self.dimension]
            
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return None
    
    def generate_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """Generate embeddings for multiple texts"""
        return [self.generate(text) for text in texts]
