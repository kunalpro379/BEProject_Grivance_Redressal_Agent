import logging
from typing import List
from config import Config

logger = logging.getLogger(__name__)

class EmbeddingEngine:
    def __init__(self):
        self._model = None
    
    @property
    def model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading embedding model: {Config.EMBEDDING_MODEL}")
            self._model = SentenceTransformer(Config.EMBEDDING_MODEL)
        return self._model
    
    def encode(self, text: str) -> List[float]:
        """Generate embedding for text"""
        if not (text or "").strip():
            return []
        
        emb = self.model.encode([text], normalize_embeddings=True)
        return emb[0].tolist()
    
    def chunk_text(self, text: str) -> List[str]:
        """Split text into chunks with overlap"""
        if not text:
            return []
        
        chunks = []
        chunk_size = Config.CHUNK_SIZE
        overlap = Config.CHUNK_OVERLAP
        
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            
            if chunk.strip():
                chunks.append(chunk.strip())
            
            start = end - overlap
            if start >= len(text):
                break
        
        logger.info(f"Split text ({len(text)} chars) into {len(chunks)} chunks")
        return chunks
