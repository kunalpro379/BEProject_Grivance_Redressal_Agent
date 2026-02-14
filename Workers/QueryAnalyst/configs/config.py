# configs/config.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

class Config:
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    SUPABASE_DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")

    SUPABASE_DB_HOST = "aws-1-ap-southeast-1.pooler.supabase.com"
    SUPABASE_DB_PORT = 6543
    SUPABASE_DB_USER = "postgres.hjpgyfowhrbciemdzqgn"
    SUPABASE_DB_NAME = "postgres"

    @classmethod
    def supabase_dsn(cls) -> str:
        return (
            f"postgresql://{cls.SUPABASE_DB_USER}:{cls.SUPABASE_DB_PASSWORD}@"
            f"{cls.SUPABASE_DB_HOST}:{cls.SUPABASE_DB_PORT}/{cls.SUPABASE_DB_NAME}"
        )

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