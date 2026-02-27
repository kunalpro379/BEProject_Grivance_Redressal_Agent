import os

# API Keys - load from environment, fallback to defaults
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "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")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "") 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
FILES_DIR = os.path.join(DATA_DIR, "files")
PDFS_DIR = os.path.join(DATA_DIR, "pdfs")
DOCS_DIR = os.path.join(DATA_DIR, "docs")
OUTPUT_DIR = os.path.join(DATA_DIR, "output")

for dir_path in [DATA_DIR, FILES_DIR, PDFS_DIR, DOCS_DIR, OUTPUT_DIR]:
    os.makedirs(dir_path, exist_ok=True)

# File paths
INDIAN_GOV_SOURCES_FILE = os.path.join(OUTPUT_DIR, "indian_gov_sources.json")
CRAWLED_RESULTS_FILE = os.path.join(OUTPUT_DIR, "crawled_results.json")
DOWNLOADED_FILES_FILE = os.path.join(OUTPUT_DIR, "downloaded_files.json")
EXTRACTED_PDF_TEXT_FILE = os.path.join(OUTPUT_DIR, "extracted_pdf_text.json")

LLM_MODEL = "llama-3.1-8b-instant"
LLM_TEMPERATURE = 0.7
LLM_MAX_TOKENS = 1024
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

MAX_SEARCH_RESULTS = 5
MAX_SEARCH_TOPICS = 3
MIN_SOURCES_REQUIRED = 3
MAX_RETRIES = 2
SEARCH_TIMEOUT = 30

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50