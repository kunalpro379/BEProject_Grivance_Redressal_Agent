# AgenticWorkers/Embeddings/config.py
# Same DB and model as QueryAnalyst; worker runs separately for async embedding generation.
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

class Config:
    # Preferred: a full connection string (works for both Direct + Pooler).
    # Example: postgresql://postgres:PASS@db.<ref>.supabase.co:5432/postgres?sslmode=require
    DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()

    SUPABASE_DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")
    SUPABASE_DB_HOST = os.environ.get("SUPABASE_DB_HOST", "aws-1-ap-southeast-1.pooler.supabase.com")
    SUPABASE_DB_PORT = int(os.environ.get("SUPABASE_DB_PORT", "6543"))
    SUPABASE_DB_USER = os.environ.get("SUPABASE_DB_USER", "postgres.hjpgyfowhrbciemdzqgn")
    SUPABASE_DB_NAME = os.environ.get("SUPABASE_DB_NAME", "postgres")
    GRIEVANCE_TABLE = os.environ.get("GRIEVANCE_TABLE", "usergrievance")

    @classmethod
    def supabase_dsn(cls) -> str:
        """
        Returns a DSN safe for Supabase (SSL required).

        Priority:
        - DATABASE_URL if provided
        - else build from SUPABASE_DB_* vars
        """
        if cls.DATABASE_URL:
            # Ensure sslmode=require is present for Supabase.
            if "sslmode=" in cls.DATABASE_URL:
                return cls.DATABASE_URL
            joiner = "&" if "?" in cls.DATABASE_URL else "?"
            return f"{cls.DATABASE_URL}{joiner}sslmode=require"

        base = (
            f"postgresql://{cls.SUPABASE_DB_USER}:{cls.SUPABASE_DB_PASSWORD}@"
            f"{cls.SUPABASE_DB_HOST}:{cls.SUPABASE_DB_PORT}/{cls.SUPABASE_DB_NAME}"
        )
        return f"{base}?sslmode=require"

    EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")  # 384-dim
    POLL_INTERVAL_SEC = float(os.environ.get("EMBEDDING_POLL_INTERVAL_SEC", "2.0"))
    BATCH_SIZE = int(os.environ.get("EMBEDDING_BATCH_SIZE", "10"))

    # Requeue safety: if a worker crashes mid-job, rows can stay "processing".
    REQUEUE_STUCK_AFTER_SEC = int(os.environ.get("EMBEDDING_REQUEUE_STUCK_AFTER_SEC", "900"))  # 15 min
    REQUEUE_FAILED_AFTER_SEC = int(os.environ.get("EMBEDDING_REQUEUE_FAILED_AFTER_SEC", "3600"))  # 1 hour
