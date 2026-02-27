"""
Configuration Settings
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    # Supabase (optional)
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    
    # API Keys
    TAVILY_API_KEY = os.getenv('TAVILY_API_KEY')
    
    # Agent Configuration
    MAX_SEARCH_RESULTS = int(os.getenv('MAX_SEARCH_RESULTS', '10'))
    MAX_ITERATIONS = int(os.getenv('MAX_ITERATIONS', '5'))
    BATCH_SIZE = int(os.getenv('BATCH_SIZE', '5'))
    
    # Azure Queue
    AZURE_STORAGE_CONNECTION_STRING = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
    WEBCRAWLER_QUEUE_NAME = os.getenv('WEBCRAWLER_QUEUE_NAME', 'webcrawler')
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        if not cls.DATABASE_URL:
            raise ValueError("DATABASE_URL is required")
        
        if not cls.TAVILY_API_KEY:
            print("⚠️  Warning: TAVILY_API_KEY not set - search will be disabled")
        
        return True
