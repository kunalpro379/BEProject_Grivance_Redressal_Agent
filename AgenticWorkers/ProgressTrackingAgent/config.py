import os
from dotenv import load_dotenv

load_dotenv()

# Gemini AI Configuration (Fallback)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# DeepSeek Configuration (Primary)
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

# Azure Blob Storage Configuration
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_STORAGE_CONTAINER_NAME = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "igrs")

# Pinecone Configuration (Optional)
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT", "gcp-starter")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "grievance-progress-tracking")

# Report Configuration
REPORT_OUTPUT_DIR = os.getenv("REPORT_OUTPUT_DIR", "./reports")
REPORT_GENERATION_INTERVAL_HOURS = int(os.getenv("REPORT_GENERATION_INTERVAL_HOURS", "1"))

# Target Department (Optional - for testing specific department)
TARGET_DEPARTMENT_ID = os.getenv("TARGET_DEPARTMENT_ID")

# Analysis Configuration
ENABLE_IMAGE_ANALYSIS = os.getenv("ENABLE_IMAGE_ANALYSIS", "false").lower() == "true"
ENABLE_DOCUMENT_ANALYSIS = os.getenv("ENABLE_DOCUMENT_ANALYSIS", "true").lower() == "true"
ENABLE_FEEDBACK_SENTIMENT = os.getenv("ENABLE_FEEDBACK_SENTIMENT", "true").lower() == "true"

# Ensure report directory exists
os.makedirs(REPORT_OUTPUT_DIR, exist_ok=True)

# Validate required configuration
if not DEEPSEEK_API_KEY and not GEMINI_API_KEY:
    raise ValueError("Either DEEPSEEK_API_KEY or GEMINI_API_KEY is required")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is required (PostgreSQL connection string)")
