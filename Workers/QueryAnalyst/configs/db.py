# configs/db_schemas.py
import os
from typing import List, Dict, Any

def _env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        raise RuntimeError(f"Missing env: {name}")
    return val

POLICY_DB_DESCRIPTION = (
    "Government schemes, public authorities, and organizational queries"
)

ACTIVE_DB_SCHEMAS: List[Dict[str, Any]] = [
    {
        "name": "general_grievances",
        "db_url": _env("NEON_DB_1_URL"),
        "tables": [{"table": "grievance_embeddings", "embedding_col": "embedding"}],
        "description": "Contains general public grievances with detailed descriptions and resolutions",
    },
    {
        "name": "bbmp_bangalore",
        "db_url": _env("NEON_DB_2_URL"),
        "tables": [{"table": "grievance_embeddings", "embedding_col": "embedding"}],
        "description": "BBMP Bangalore specific complaints about garbage, sanitation, and civic issues",
    },
    {
        "name": "multi_state_grievances",
        "db_url": _env("NEON_DB_3_URL"),
        "tables": [{"table": "grievance_embeddings", "embedding_col": "embedding"}],
        "description": "Multi-state grievances covering various categories including water, roads, general issues",
    },
    {
        "name": "financial_grievances",
        "db_url": _env("NEON_DB_4_URL"),
        "tables": [{"table": "FInGr", "embedding_col": "embedding"}],
        "description": "Financial grievances and fraud-related complaints",
    },
    {
        "name": "citizen_complaints",
        "db_url": _env("NEON_DB_5_URL"),
        "tables": [{"table": "citizen_complaints", "embedding_col": "embedding"}],
        "description": "Citizen complaints about environment, pollution, and urban issues",
    },
    {
        "name": "policy_queries",
        "db_url": _env("NEON_DB_6_URL"),
        "tables": [
            {"table": "query_organizations", "embedding_col": "embedding"},
            {"table": "gov_schems", "embedding_col": "embedding"},
            {"table": "public_authorities", "embedding_col": "embedding"},
        ],
        "description": POLICY_DB_DESCRIPTION,
    },
    {
        "name": "fraud_cybercrime",
        "db_url": _env("NEON_DB_7_URL"),
        "tables": [{"table": "fraud_grievance", "embedding_col": "embedding"}],
        "description": "Fraud and cybercrime related grievances",
    },
]