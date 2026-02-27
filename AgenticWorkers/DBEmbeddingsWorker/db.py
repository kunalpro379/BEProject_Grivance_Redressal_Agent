# AgenticWorkers/Embeddings/db.py
# DB helpers for async embedding worker: fetch pending, mark processing, update embedding.
import re
import time
import random
import psycopg2
from psycopg2 import OperationalError, InterfaceError
from psycopg2.extras import RealDictCursor
from typing import List, Optional, Dict, Any

from config import Config


def get_connection():
    """
    Create a short-lived connection with retry.
    Supabase pooler/direct both require SSL; DSN comes from Config.supabase_dsn().
    """
    dsn = Config.supabase_dsn()
    last_err = None
    for attempt in range(1, 6):
        try:
            conn = psycopg2.connect(
                dsn,
                connect_timeout=10,
                keepalives=1,
                keepalives_idle=30,
                keepalives_interval=10,
                keepalives_count=5,
                application_name="embeddings-worker",
            )
            return conn
        except (OperationalError, InterfaceError) as e:
            last_err = e
            # jittered backoff
            sleep_s = min(8.0, 0.5 * (2 ** (attempt - 1))) + random.random() * 0.25
            time.sleep(sleep_s)
    raise last_err


_IDENT_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_\.]*$")
_JOB_TABLE = "public.embedding_jobs"


def _safe_ident(name: str) -> str:
    """
    Prevent SQL injection via table name env var.
    Allows: letters, numbers, underscore, dot.
    """
    if not _IDENT_RE.match(name or ""):
        raise ValueError(f"Unsafe identifier: {name!r}")
    return name


def claim_pending(limit: int = 10, table: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Atomically claims up to `limit` rows by switching pending->processing and
    returns the claimed rows' text fields for embedding.

    This prevents “I embedded but DB didn't update” confusion caused by multiple DSNs,
    and is safe to run continuously with multiple workers.
    """
    table = _safe_ident(table or Config.GRIEVANCE_TABLE)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                WITH cte AS (
                    SELECT id
                    FROM public.{table}
                    WHERE embedding_status = 'pending'
                    ORDER BY created_at ASC
                    LIMIT %s
                    FOR UPDATE SKIP LOCKED
                )
                UPDATE public.{table} t
                SET embedding_status = 'processing', updated_at = NOW()
                FROM cte
                WHERE t.id = cte.id
                RETURNING t.id, t.grievance_id, t.grievance_text, t.enhanced_query, t.image_description;
                """,
                (limit,),
            )
            rows = list(cur.fetchall())
        conn.commit()
        return rows
    finally:
        try:
            conn.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Old per-table embedding_status helpers (kept for backward compatibility)
# ---------------------------------------------------------------------------


def mark_processing(conn, row_id: str, table: Optional[str] = None) -> bool:
    """Set embedding_status = 'processing' only if currently 'pending'. Returns True if we claimed the row."""
    table = _safe_ident(table or Config.GRIEVANCE_TABLE)
    with conn.cursor() as cur:
        cur.execute(
            f"""
            UPDATE public.{table}
            SET embedding_status = %s, updated_at = NOW()
            WHERE id = %s AND embedding_status = 'pending'
            """,
            ("processing", row_id),
        )
        claimed = cur.rowcount > 0
    conn.commit()
    return claimed


def update_embedding_completed(conn, row_id: str, embedding: List[float], table: Optional[str] = None) -> None:
    table = _safe_ident(table or Config.GRIEVANCE_TABLE)
    emb_str = "[" + ",".join(map(str, embedding)) + "]"
    with conn.cursor() as cur:
        cur.execute(
            f"""
            UPDATE public.{table}
            SET embedding = %s::vector, embedding_status = %s, updated_at = NOW()
            WHERE id = %s
            """,
            (emb_str, "completed", row_id),
        )
    conn.commit()


def update_embedding_failed(conn, row_id: str, table: Optional[str] = None) -> None:
    table = _safe_ident(table or Config.GRIEVANCE_TABLE)
    with conn.cursor() as cur:
        cur.execute(
            f'UPDATE public.{table} SET embedding_status = %s, updated_at = NOW() WHERE id = %s',
            ("failed", row_id),
        )
    conn.commit()


def update_embedding_pending(conn, row_id: str, table: Optional[str] = None) -> None:
    table = _safe_ident(table or Config.GRIEVANCE_TABLE)
    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE public.{table} SET embedding_status = 'pending', updated_at = NOW() WHERE id = %s",
            (row_id,),
        )
    conn.commit()


def requeue_stuck(table: Optional[str] = None) -> int:
    """
    Re-queue rows that are stuck in processing/failed for too long.
    This makes the worker “keep running” without manual resets.
    """
    table = _safe_ident(table or Config.GRIEVANCE_TABLE)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE public.{table}
                SET embedding_status = 'pending', updated_at = NOW()
                WHERE embedding_status = 'processing'
                  AND updated_at < (NOW() - (%s * INTERVAL '1 second'));
                """,
                (Config.REQUEUE_STUCK_AFTER_SEC,),
            )
            n_processing = cur.rowcount

            cur.execute(
                f"""
                UPDATE public.{table}
                SET embedding_status = 'pending', updated_at = NOW()
                WHERE embedding_status = 'failed'
                  AND updated_at < (NOW() - (%s * INTERVAL '1 second'));
                """,
                (Config.REQUEUE_FAILED_AFTER_SEC,),
            )
            n_failed = cur.rowcount

        conn.commit()
        return int(n_processing + n_failed)
    finally:
        try:
            conn.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Generic job-queue based embedding helpers (embedding_jobs)
# ---------------------------------------------------------------------------


def claim_jobs(limit: int = 10) -> List[Dict[str, Any]]:
    """
    Atomically claim up to `limit` embedding jobs from embedding_jobs.
    Moves status pending -> processing and returns (id, table_name, row_id).
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                WITH cte AS (
                    SELECT id
                    FROM {_JOB_TABLE}
                    WHERE status = 'pending'
                    ORDER BY created_at ASC
                    LIMIT %s
                    FOR UPDATE SKIP LOCKED
                )
                UPDATE {_JOB_TABLE} j
                SET status = 'processing',
                    updated_at = NOW(),
                    last_attempt_at = NOW()
                FROM cte
                WHERE j.id = cte.id
                RETURNING j.id, j.table_name, j.row_id;
                """,
                (limit,),
            )
            jobs = list(cur.fetchall())
        conn.commit()
        return jobs
    finally:
        try:
            conn.close()
        except Exception:
            pass


def mark_job_completed(job_id: str) -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {_JOB_TABLE}
                SET status = 'completed', updated_at = NOW()
                WHERE id = %s
                """,
                (job_id,),
            )
        conn.commit()
    finally:
        try:
            conn.close()
        except Exception:
            pass


def mark_job_failed(job_id: str, error: str) -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {_JOB_TABLE}
                SET status = 'failed',
                    error = LEFT(%s, 2000),
                    updated_at = NOW()
                WHERE id = %s
                """,
                (error, job_id),
            )
        conn.commit()
    finally:
        try:
            conn.close()
        except Exception:
            pass


def requeue_stuck_jobs(
    processing_timeout_sec: int = 900, failed_timeout_sec: int = 3600
) -> int:
    """
    Re-queue jobs stuck in processing / failed for too long back to pending.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {_JOB_TABLE}
                SET status = 'pending', updated_at = NOW()
                WHERE status = 'processing'
                  AND last_attempt_at < (NOW() - (%s * INTERVAL '1 second'));
                """,
                (processing_timeout_sec,),
            )
            n_processing = cur.rowcount

            cur.execute(
                f"""
                UPDATE {_JOB_TABLE}
                SET status = 'pending', updated_at = NOW()
                WHERE status = 'failed'
                  AND last_attempt_at < (NOW() - (%s * INTERVAL '1 second'));
                """,
                (failed_timeout_sec,),
            )
            n_failed = cur.rowcount

        conn.commit()
        return int(n_processing + n_failed)
    finally:
        try:
            conn.close()
        except Exception:
            pass


def _normalize_table_name(table_name: str) -> str:
    """
    Ensure table name has 'public.' prefix and is safe.
    """
    if not table_name:
        raise ValueError("Empty table_name")
    if "." in table_name:
        schema, name = table_name.split(".", 1)
        safe = _safe_ident(name)
        return f"{schema}.{safe}"
    safe = _safe_ident(table_name)
    return f"public.{safe}"


def load_row_for_job(table_name: str, row_id: str) -> Optional[Dict[str, Any]]:
    """
    Load a single row for an embedding job.
    """
    full_table = _normalize_table_name(table_name)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"SELECT * FROM {full_table} WHERE id::text = %s",
                (row_id,),
            )
            row = cur.fetchone()
        return row
    finally:
        try:
            conn.close()
        except Exception:
            pass


def update_embedding_for_row(
    table_name: str, row_id: str, embedding: List[float]
) -> None:
    """
    Write embedding back to the given table row.
    Only assumes there is an 'embedding' column; does not touch updated_at.
    """
    full_table = _normalize_table_name(table_name)
    emb_str = "[" + ",".join(map(str, embedding)) + "]"
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {full_table} SET embedding = %s::vector WHERE id::text = %s",
                (emb_str, row_id),
            )
        conn.commit()
    finally:
        try:
            conn.close()
        except Exception:
            pass
