from datetime import datetime, date
from decimal import Decimal
from typing import Any, Dict, List

import psycopg2

from configs.db import ACTIVE_DB_SCHEMAS


class DatabaseQueryEngine:
    """Runs similarity search queries against configured Neon/Postgres DBs."""

    def __init__(self) -> None:
        # stateless; kept for future extension
        pass

    def _ensure_sslmode(self, dsn: str) -> str:
        """Ensure sslmode=require is present in the DSN."""
        if "sslmode=" in dsn:
            return dsn
        return dsn + ("&sslmode=require" if "?" in dsn else "?sslmode=require")

    def query_table(
        self,
        user_emb_str: str,
        db_url: str,
        table_name: str,
        embedding_col: str,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Query a single table using pgvector <=> similarity."""
        secure_dsn = self._ensure_sslmode(db_url)
        conn = psycopg2.connect(
            secure_dsn,
            connect_timeout=10,
            application_name="IGRSAgent",
        )
        cur = conn.cursor()

        # discover non-embedding columns
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s AND column_name != %s;
            """,
            (table_name.lower(), embedding_col),
        )
        cols = [r[0] for r in cur.fetchall()]

        if cols:
            col_list = ", ".join([f'"{c}"' for c in cols])
            select_clause = f"{col_list}, 1 - (\"{embedding_col}\" <=> %s::vector) AS similarity"
        else:
            # No non-embedding columns, return only similarity score
            select_clause = f"1 - (\"{embedding_col}\" <=> %s::vector) AS similarity"

        sql = f"""
            SELECT {select_clause}
            FROM "{table_name}"
            ORDER BY "{embedding_col}" <=> %s::vector
            LIMIT %s;
        """

        cur.execute(sql, (user_emb_str, user_emb_str, top_k))
        rows = cur.fetchall()

        results: List[Dict[str, Any]] = []

        for row in rows:
            row_dict: Dict[str, Any] = {}
            if cols:
                for col, val in zip(cols, row[:-1]):
                    if isinstance(val, (datetime, date)):
                        row_dict[col] = val.isoformat()
                    elif isinstance(val, Decimal):
                        row_dict[col] = float(val)
                    else:
                        row_dict[col] = str(val) if val is not None else ""
            # last column is similarity
            row_dict["similarity"] = float(row[-1])
            results.append(row_dict)

        cur.close()
        conn.close()

        return results

    def retrive_releveant_data(
        self, combined_query_embedding: List[float]
    ) -> Dict[str, Any]:
        """Query all configured DBs/tables and aggregate results."""
        emb_str = "[" + ",".join(map(str, combined_query_embedding)) + "]"

        all_results: Dict[str, Any] = {}

        for db in ACTIVE_DB_SCHEMAS:
            db_name = db["name"]
            all_results[db_name] = {}

            for table in db["tables"]:
                table_name = table["table"]
                embedding_col = table["embedding_col"]
                results = self.query_table(
                    user_emb_str=emb_str,
                    db_url=db["db_url"],
                    table_name=table_name,
                    embedding_col=embedding_col,
                )

                all_results[db_name][table_name] = results

        return all_results
