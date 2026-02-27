import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Azure Storage
    AZURE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    AZURE_STORAGE_ACCOUNT_NAME = os.getenv("AZURE_STORAGE_ACCOUNT_NAME")
    AZURE_STORAGE_ACCOUNT_KEY = os.getenv("AZURE_STORAGE_ACCOUNT_KEY")
    
    # Queue Names
    WEBCRAWLER_QUEUE = os.getenv("WEBCRAWLER_QUEUE_NAME", "webcrawlerqueue")
    EMBEDDINGS_QUEUE = os.getenv("EMBEDDINGS_QUEUE_NAME", "embeddingsqueue")
    
    # Blob Container
    BLOB_CONTAINER = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "igrs")
    
    # Crawler Settings
    MAX_PAGES = int(os.getenv("MAX_PAGES_PER_JOB", "50"))
    BATCH_SIZE = int(os.getenv("BATCH_SIZE", "3"))
    PAGE_TIMEOUT = int(os.getenv("PAGE_TIMEOUT", "30000"))
    
    @classmethod
    def validate(cls):
        """Validate required settings"""
        if not cls.AZURE_CONNECTION_STRING:
            raise ValueError("AZURE_STORAGE_CONNECTION_STRING is required")
        return True

settings = Settings()
