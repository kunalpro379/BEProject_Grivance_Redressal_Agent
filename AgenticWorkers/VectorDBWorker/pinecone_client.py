import logging
from typing import List, Dict, Any
from pinecone import Pinecone
from config import Config

logger = logging.getLogger(__name__)

class PineconeClient:
    def __init__(self):
        self.pc = Pinecone(api_key=Config.PINECONE_API_KEY)
        self.index = self.pc.Index(Config.PINECONE_INDEX_NAME)
        logger.info(f"Connected to Pinecone index: {Config.PINECONE_INDEX_NAME}")
    
    def upsert_embeddings(self, vectors: List[Dict[str, Any]]) -> bool:
        """
        Upsert embeddings to Pinecone
        
        vectors format: [
            {
                "id": "unique_id",
                "values": [0.1, 0.2, ...],  # embedding vector
                "metadata": {
                    "job_id": "ROAD/AMB/2024/0112",
                    "url": "https://...",
                    "blob_folder": "domain.com",
                    "file_name": "file.txt",
                    "chunk_index": 0,
                    "text": "chunk text..."
                }
            }
        ]
        """
        try:
            self.index.upsert(vectors=vectors)
            logger.info(f"✓ Upserted {len(vectors)} vectors to Pinecone")
            return True
        except Exception as e:
            logger.error(f"Error upserting to Pinecone: {e}")
            return False
