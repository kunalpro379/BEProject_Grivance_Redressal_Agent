import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

class Config:
    # Azure Storage
    AZURE_STORAGE_CONNECTION_STRING = os.environ.get("AZURE_STORAGE_CONNECTION_STRING", "")
    AZURE_STORAGE_ACCOUNT_NAME = os.environ.get("AZURE_STORAGE_ACCOUNT_NAME", "igrs")
    AZURE_STORAGE_CONTAINER_NAME = os.environ.get("AZURE_STORAGE_CONTAINER_NAME", "igrs")
    
    # Azure Queue
    EMBEDDINGS_QUEUE_NAME = os.environ.get("EMBEDDINGS_QUEUE_NAME", "embeddings")
    
    # Pinecone
    PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY", "")
    PINECONE_INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "igrs1")
    
    # Embedding Model
    EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")  # 384-dim
    
    # Worker Settings
    POLL_INTERVAL_SEC = float(os.environ.get("POLL_INTERVAL_SEC", "2.0"))
    VISIBILITY_TIMEOUT = int(os.environ.get("VISIBILITY_TIMEOUT", "300"))  # 5 minutes
    CHUNK_SIZE = int(os.environ.get("CHUNK_SIZE", "1000"))  # Characters per chunk
    CHUNK_OVERLAP = int(os.environ.get("CHUNK_OVERLAP", "200"))  # Overlap between chunks
