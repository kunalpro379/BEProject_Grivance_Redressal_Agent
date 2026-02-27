# AgenticWorkers/Embeddings/embedding_engine.py
# Lazy-loads SentenceTransformer; same model as QueryAnalyst for consistency.
from typing import List

from config import Config


class EmbeddingEngine:
    def __init__(self):
        self._model = None

    @property
    def model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(Config.EMBEDDING_MODEL)
        return self._model

    def encode(self, text: str) -> List[float]:
        if not (text or "").strip():
            return []
        emb = self.model.encode([text], normalize_embeddings=True)
        return emb[0].tolist()
