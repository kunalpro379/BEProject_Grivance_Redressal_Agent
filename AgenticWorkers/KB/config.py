import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)


class Config:
    """Configuration for KB Worker"""
    
    # Azure Storage
    AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    AZURE_STORAGE_CONTAINER_NAME = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "igrs")
    
    # Azure Queues
    AZURE_QUEUE_CONNECTION_STRING = os.getenv("AZURE_QUEUE_CONNECTION_STRING")
    AZURE_QUEUE_NAME = os.getenv("AZURE_QUEUE_NAME", "knowledgebase")
    AZURE_PROCESSED_QUEUE_NAME = os.getenv("AZURE_PROCESSED_QUEUE_NAME", "processed")
    
    # API
    API_CALLBACK_URL = os.getenv("API_CALLBACK_URL", "http://localhost:4000")
    
    # LLM
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    
    # Pinecone
    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
    PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "igrs1")
    
    # Embedding Model
    EMBED_MODEL = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")
    
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    # Paths
    BASE_DIR = Path(__file__).resolve().parent
    OUTPUT_DIR = BASE_DIR / "outputs"
    TEMP_DIR = BASE_DIR / "temp"
    
    @classmethod
    def ensure_dirs(cls):
        """Create necessary directories"""
        cls.OUTPUT_DIR.mkdir(exist_ok=True)
        cls.TEMP_DIR.mkdir(exist_ok=True)
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        required = [
            ("AZURE_STORAGE_CONNECTION_STRING", cls.AZURE_STORAGE_CONNECTION_STRING),
            ("AZURE_QUEUE_CONNECTION_STRING", cls.AZURE_QUEUE_CONNECTION_STRING),
            ("GROQ_API_KEY", cls.GROQ_API_KEY),
            ("PINECONE_API_KEY", cls.PINECONE_API_KEY),
        ]
        
        missing = [name for name, value in required if not value]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
