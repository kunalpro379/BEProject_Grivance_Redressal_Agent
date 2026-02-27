import logging
import sys
import time
from pathlib import Path
from typing import Dict, Any

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

from config import Config
from db import (
    claim_jobs,
    load_row_for_job,
    update_embedding_for_row,
    mark_job_completed,
    mark_job_failed,
    requeue_stuck_jobs,
)
from embedding_engine import EmbeddingEngine


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


def _coalesce_str(*values: Any) -> str:
    for v in values:
        if isinstance(v, str) and v.strip():
            return v.strip()
    return ""


def text_for_table(table_name: str, row: Dict[str, Any]) -> str:
    """
    Build a reasonable text representation for different tables.
    This is what will be embedded.
    """
    base = table_name.split(".")[-1]

    if base == "usergrievance":
        return _coalesce_str(
            row.get("enhanced_query"),
            row.get("grievance_text"),
            row.get("image_description"),
        )

    if base == "faqs":
        return " ".join(
            part
            for part in [
                row.get("question") or "",
                row.get("answer") or "",
            ]
            if part
        ).strip()

    if base == "departmentknowledgebase":
        return " ".join(
            part
            for part in [
                row.get("title") or "",
                row.get("description") or "",
                row.get("content_text") or "",
            ]
            if part
        ).strip()

    if base == "policydocuments":
        return " ".join(
            part
            for part in [
                row.get("title") or "",
                row.get("content") or "",
            ]
            if part
        ).strip()

    if base in ("citizens", "users"):
        parts = [
            row.get("full_name") or "",
            row.get("email") or "",
            row.get("phone") or "",
            row.get("address") or "",
            row.get("city") or "",
        ]
        # citizens only
        for key in ("occupation", "location_address"):
            if key in row:
                parts.append(row.get(key) or "")
        return " ".join(p for p in parts if p).strip()

    if base == "departments":
        return " ".join(
            part
            for part in [
                row.get("name") or "",
                row.get("description") or "",
                row.get("address") or "",
            ]
            if part
        ).strip()

    if base == "aiinsights":
        return " ".join(
            part
            for part in [
                row.get("title") or "",
                row.get("description") or "",
                (row.get("recommended_action") or ""),
            ]
            if part
        ).strip()

    if base == "auditlog":
        return " ".join(
            part
            for part in [
                row.get("actor_name") or "",
                row.get("actor_role") or "",
                row.get("action") or "",
                row.get("entity_type") or "",
            ]
            if part
        ).strip()

    # Fallback: concatenate all string fields
    pieces = []
    for v in row.values():
        if isinstance(v, str) and v.strip():
            pieces.append(v.strip())
    return " ".join(pieces).strip()


def run_once(engine: EmbeddingEngine) -> int:
    jobs = claim_jobs(limit=Config.BATCH_SIZE)
    if not jobs:
        return 0

    processed = 0
    for job in jobs:
        job_id = str(job["id"])
        table_name = job["table_name"]
        row_id = str(job["row_id"])
        try:
            row = load_row_for_job(table_name, row_id)
            if not row:
                mark_job_failed(job_id, f"Row not found for {table_name} id={row_id}")
                continue

            text = text_for_table(table_name, row)
            if not text:
                mark_job_failed(job_id, "Empty text for embedding")
                continue

            emb = engine.encode(text)
            if not emb:
                mark_job_failed(job_id, "Embedding engine returned empty vector")
                continue

            update_embedding_for_row(table_name, row_id, emb)
            mark_job_completed(job_id)
            processed += 1
            logger.info("Job %s completed for %s id=%s", job_id, table_name, row_id)
        except Exception as e:  # noqa: BLE001
            logger.exception("Job %s failed: %s", job_id, e)
            try:
                mark_job_failed(job_id, str(e))
            except Exception:
                logger.exception("Could not mark job %s as failed", job_id)

    return processed


def main():
    logger.info(
        "Generic embedding queue worker started (batch_size=%s, poll_interval=%.1fs)",
        Config.BATCH_SIZE,
        Config.POLL_INTERVAL_SEC,
    )
    engine = EmbeddingEngine()

    while True:
        try:
            try:
                n_requeued = requeue_stuck_jobs()
                if n_requeued:
                    logger.info("Re-queued %s stuck jobs", n_requeued)
            except Exception:
                # non-fatal
                pass

            n = run_once(engine)
            if n == 0:
                time.sleep(Config.POLL_INTERVAL_SEC)
        except KeyboardInterrupt:
            logger.info("Worker stopped by user")
            break
        except Exception as e:  # noqa: BLE001
            logger.exception("Worker loop error: %s", e)
            time.sleep(Config.POLL_INTERVAL_SEC)


if __name__ == "__main__":
    main()

