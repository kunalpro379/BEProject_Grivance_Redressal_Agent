# configs/config.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

class Config:
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")
    SUPABASE_DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")

    # Use DATABASE_URL or SUPABASE_DSN from .env (correct connection string)
    DATABASE_URL = os.environ.get("DATABASE_URL", "")
    _SUPABASE_DSN = os.environ.get("SUPABASE_DSN", "")
    
    # Table name: use usergrievance (lowercase) to match Platform DB
    GRIEVANCE_TABLE = os.environ.get("GRIEVANCE_TABLE", "usergrievance")
    
    # Direct Supabase connection - use DATABASE_URL or SUPABASE_DSN
    @classmethod
    def supabase_direct_url(cls) -> str:
        # Priority: SUPABASE_DSN > DATABASE_URL > fallback
        if cls._SUPABASE_DSN:
            return cls._SUPABASE_DSN
        elif cls.DATABASE_URL:
            return cls.DATABASE_URL
        else:
            # Fallback to correct host from your .env
            return f"postgresql://postgres.lfhjqgufftedcntcskch:{cls.SUPABASE_DB_PASSWORD}@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"

    @classmethod
    def supabase_dsn(cls) -> str:
        """Returns the main Supabase DSN for all database operations."""
        # Priority: SUPABASE_DSN > DATABASE_URL
        if cls._SUPABASE_DSN:
            return cls._SUPABASE_DSN
        elif cls.DATABASE_URL:
            return cls.DATABASE_URL
        else:
            return f"postgresql://postgres.lfhjqgufftedcntcskch:{cls.SUPABASE_DB_PASSWORD}@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"

    @classmethod
    def grievance_table(cls) -> str:
        return cls.GRIEVANCE_TABLE

    EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # 384-dim

    OUTPUT_DIR = BASE_DIR / "outputs"
    OUTPUT_DIR.mkdir(exist_ok=True)

    @classmethod
    def pdf_path(cls) -> str:
        return str(cls.OUTPUT_DIR / "grievance_report.pdf")

    @classmethod
    def markdown_path(cls) -> str:
        return str(cls.OUTPUT_DIR / "grievance_report.md")

    @classmethod
    def json_analysis_path(cls) -> str:
        return str(cls.OUTPUT_DIR / "grievance_analysis_final.json")

    @classmethod
    def json_agents_path(cls) -> str:
        return str(cls.OUTPUT_DIR / "all_agent_outputs.json")