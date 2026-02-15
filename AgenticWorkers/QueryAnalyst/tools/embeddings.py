from sentence_transformers import SentenceTransformer
from configs.config import Config
from typing import List

class EmbeddingEngine:
    def __init__(self):
        self.model = SentenceTransformer(Config.EMBEDDING_MODEL)

    def encode(self, text: str) -> List[float]:
        emb = self.model.encode([text])[0]
        return emb.tolist()

    # Backwards-compatible helper used in workflow.nodes
    def embed_query(self, text: str) -> List[float]:
        return self.encode(text)