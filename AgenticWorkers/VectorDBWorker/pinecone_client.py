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
        Upsert embeddings to Pinecone in batches to avoid size limits
        
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
            # Pinecone has a 4MB limit per request
            # Split into smaller batches to avoid "message too large" error
            batch_size = 50  # Reduced from 100 to avoid size limits
            total_upserted = 0
            
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i + batch_size]
                
                # Truncate metadata text to reduce size
                for vector in batch:
                    if 'metadata' in vector and 'text' in vector['metadata']:
                        # Limit text to 200 chars to reduce message size
                        vector['metadata']['text'] = vector['metadata']['text'][:200]
                
                self.index.upsert(vectors=batch)
                total_upserted += len(batch)
                logger.info(f"  Batch {i//batch_size + 1}: Upserted {len(batch)} vectors")
            
            logger.info(f"✓ Total upserted {total_upserted} vectors to Pinecone")
            return True
        except Exception as e:
            logger.error(f"Error upserting to Pinecone: {e}")
            return False
