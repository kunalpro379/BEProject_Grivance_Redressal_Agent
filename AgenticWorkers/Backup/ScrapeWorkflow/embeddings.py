from sentence_transformers import SentenceTransformer
from typing import List, Union
from config import Config
import numpy as np

class EmbeddingEngine:
    """Generate embeddings for text using sentence-transformers"""
    
    def __init__(self):
        print(f"Loading embedding model: {Config.EMBEDDING_MODEL}")
        self.model = SentenceTransformer(Config.EMBEDDING_MODEL)
        print(f"Embedding model loaded (dim: {Config.EMBEDDING_DIM})")
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for single text
        
        Args:
            text: Input text string
            
        Returns:
            List of floats representing embedding vector
        """
        if not text or not text.strip():
            # Return zero vector for empty text
            return [0.0] * Config.EMBEDDING_DIM
        
        # Truncate if too long
        text = text[:Config.MAX_TOKENS_PER_DOC]
        
        embedding = self.model.encode(text, convert_to_tensor=False)
        return embedding.tolist()
    
    def embed_batch(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """
        Generate embeddings for multiple texts
        
        Args:
            texts: List of text strings
            batch_size: Batch size for encoding
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        # Truncate texts
        texts = [text[:Config.MAX_TOKENS_PER_DOC] if text else "" for text in texts]
        
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            convert_to_tensor=False,
            show_progress_bar=len(texts) > 10
        )
        
        return embeddings.tolist()
    
    def compute_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Compute cosine similarity between two embeddings
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Similarity score between 0 and 1
        """
        e1 = np.array(embedding1)
        e2 = np.array(embedding2)
        
        dot_product = np.dot(e1, e2)
        norm1 = np.linalg.norm(e1)
        norm2 = np.linalg.norm(e2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        similarity = dot_product / (norm1 * norm2)
        return float(similarity)
