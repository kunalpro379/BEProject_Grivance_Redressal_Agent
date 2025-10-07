"""
Database Query Engine for NeonDB operations
"""

import psycopg2
from sentence_transformers import SentenceTransformer
import json
from datetime import datetime, date
from urllib.parse import urlparse
from decimal import Decimal
from typing import Dict, List, Any
from utils.config import Config


class DatabaseQueryEngine:
    """Handles all database query operations"""

    def __init__(self):
        self.model = SentenceTransformer(Config.EMBEDDING_MODEL)

    def _ensure_sslmode(self, dsn: str) -> str:
        """Ensure sslmode=require is present in the DSN string (Neon requires SSL)."""
        if "sslmode=" in dsn:
            return dsn
        # Append as query param depending on existing query string
        return dsn + ("&sslmode=require" if "?" in dsn else "?sslmode=require")

    def query_table(self, user_query: str, db_url: str, table_name: str,
                   embedding_col: str, top_k: int = 5) -> List[Dict]:
        """Query a single table and return top_k similar results"""
        user_emb = self.model.encode([user_query])[0]
        emb_str = "[" + ",".join(map(str, user_emb.tolist())) + "]"

        try:
            # Enforce SSL via DSN itself to satisfy Neon requirements regardless of client defaults
            secure_dsn = self._ensure_sslmode(db_url)
            conn = psycopg2.connect(secure_dsn, connect_timeout=10, application_name="BEProjectAgent")
            cur = conn.cursor()

            # Get all columns except embedding column
            cur.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = %s AND column_name != %s;
            """, (table_name.lower(), embedding_col))

            cols = [r[0] for r in cur.fetchall()]
            col_list = ", ".join([f'"{c}"' for c in cols]) if cols else ""

            # Construct SQL query
            select_clause = f"{col_list}, " if col_list else ""
            sql = f"""
                SELECT {select_clause} 1 - ("{embedding_col}" <=> %s::vector) AS similarity
                FROM "{table_name}"
                ORDER BY "{embedding_col}" <=> %s::vector
                LIMIT %s;
            """

            cur.execute(sql, (emb_str, emb_str, top_k))
            rows = cur.fetchall()

            # Convert results to JSON format
            results_json = []
            for row in rows:
                if cols:
                    row_dict = {}
                    for col, val in zip(cols, row[:-1]):
                        if isinstance(val, (datetime, date)):
                            row_dict[col] = val.isoformat()
                        elif isinstance(val, Decimal):
                            row_dict[col] = float(val)
                        else:
                            row_dict[col] = str(val) if val else ""
                else:
                    row_dict = {}

                row_dict['similarity'] = float(row[-1])
                results_json.append(row_dict)

            cur.close()
            conn.close()
            return results_json

        except Exception as e:
            # Fail fast as requested (no silent fallbacks)
            raise RuntimeError(
                f"Database query failed for table '{table_name}'. "
                f"DSN host='{urlparse(db_url).hostname}', details: {e}"
            )
