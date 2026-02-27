"""
Embedding Generator - Generate embeddings for text using OpenAI or local models
"""
from typing import List
import hashlib

class EmbeddingGenerator:
    def __init__(self, api_key: str = None):
        """
        Initialize embedding generator
        For now, using simple hash-based embeddings
        TODO: Integrate with OpenAI or Sentence Transformers
        """
        self.api_key = api_key
        self.dimension = 1536  # OpenAI embedding dimension
    
    def generate(self, text: str) -> List[float]:
        """
        Generate embedding for text
        
        For production, use:
        - OpenAI: openai.Embedding.create(model="text-embedding-ada-002")
        - Local: sentence_transformers
        
        For now, using deterministic hash-based approach
        """
        # Simple hash-based embedding (deterministic)
        # In production, replace with actual embedding model
        hash_obj = hashlib.sha256(text.encode())
        hash_bytes = hash_obj.digest()
        
        # Convert to float vector
        embedding = []
        for i in range(0, len(hash_bytes), 2):
            val = (hash_bytes[i] * 256 + hash_bytes[i+1]) / 65535.0
            embedding.append(val)
        
        # Pad to 1536 dimensions
        while len(embedding) < self.dimension:
            embedding.extend(embedding[:min(len(embedding), self.dimension - len(embedding))])
        
        return embedding[:self.dimension]
    
    def generate_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        return [self.generate(text) for text in texts]
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = sum(a * a for a in vec1) ** 0.5
        magnitude2 = sum(b * b for b in vec2) ** 0.5
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
