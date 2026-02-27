from configs.config import Config
from typing import List


class EmbeddingEngine:
    """Lazy-loads SentenceTransformer on first use to avoid slow startup when importing the graph."""

    def __init__(self):
        self._model = None

    @property
    def model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(Config.EMBEDDING_MODEL)
        return self._model

    def encode(self, text: str) -> List[float]:
        emb = self.model.encode([text])[0]
        return emb.tolist()

    # Backwards-compatible helper used in workflow.nodes
    def embed_query(self, text: str) -> List[float]:
        return self.encode(text)