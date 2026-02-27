import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuration for Grievance Research Agent"""
    
    # API Keys
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.hjpgyfowhrbciemdzqgn:kunalpro379@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres")
    
    # LLM Configuration
    GROQ_MODEL = "llama-3.3-70b-versatile"
    GROQ_TEMPERATURE = 0.3
    
    # Search Configuration
    MAX_URLS_PER_SEARCH = int(os.getenv("MAX_URLS_PER_SEARCH", 3))
    SEARCH_DEPTH = "basic"  # Changed from "advanced" for faster results
    SCRAPE_TIMEOUT = 8  # Reduced from 15 seconds per URL for faster processing
    
    # Safety Limits
    MAX_LOOPS = int(os.getenv("MAX_LOOPS", 30))
    MAX_TOTAL_DOCUMENTS = int(os.getenv("MAX_TOTAL_DOCUMENTS", 500))
    MAX_TOKENS_PER_DOC = int(os.getenv("MAX_TOKENS_PER_DOC", 8000))
    
    # Worker Configuration
    WORKER_INTERVAL_MINUTES = int(os.getenv("WORKER_INTERVAL_MINUTES", 30))
    BATCH_SIZE = 5  # Process max 5 grievances per cycle
    
    # File Storage Configuration
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, "data")
    FILES_DIR = os.path.join(DATA_DIR, "files")
    PDFS_DIR = os.path.join(DATA_DIR, "pdfs")
    DOCS_DIR = os.path.join(DATA_DIR, "docs")
    OUTPUT_DIR = os.path.join(DATA_DIR, "output")
    
    # Create directories
    for dir_path in [DATA_DIR, FILES_DIR, PDFS_DIR, DOCS_DIR, OUTPUT_DIR]:
        os.makedirs(dir_path, exist_ok=True)
    
    # Output Files
    DOWNLOADED_FILES_FILE = os.path.join(OUTPUT_DIR, "downloaded_files.json")
    EXTRACTED_PDF_TEXT_FILE = os.path.join(OUTPUT_DIR, "extracted_pdf_text.json")
    SCRAPED_CONTENT_FILE = os.path.join(OUTPUT_DIR, "scraped_content.json")
    
    # Document Download Configuration
    SUPPORTED_DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt']
    DOWNLOAD_TIMEOUT = 30  # seconds
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
    
    # Research Topics
    RESEARCH_AREAS = [
        "government policies and subsidies",
        "department jurisdiction and actions",
        "cost allocation and budget",
        "similar citizen complaints and solutions",
        "latest news and updates",
        "legal regulations and compliance",
        "resource allocation and planning"
    ]
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        if not cls.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is required")
        if not cls.TAVILY_API_KEY:
            raise ValueError("TAVILY_API_KEY is required")
        if not cls.DATABASE_URL:
            raise ValueError("DATABASE_URL is required")
        return True
