"""
Configuration settings for the BEProjectAgent
"""

class Config:
    """Configuration class for all settings"""
    GROQ_API_KEY = "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"
    GEMINI_API_KEY = "AIzaSyA3NN-kpPVtqI51QQTKtWwojXP_ctYZmRU"
    EMBEDDING_MODEL = 'all-MiniLM-L6-v2'

    DB_SCHEMAS = [
        {
            "db_url": "postgresql://neondb_owner:npg_87EjQcKiZqAP@ep-frosty-recipe-adoi60ev-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
            "tables": [{"table": "grievance_embeddings", "embedding_col": "embedding"}],
            "description": "Contains general public grievances with detailed descriptions and resolutions"
        },
        {
            "db_url": "postgresql://neondb_owner:npg_xkQu3J4cwDPg@ep-empty-river-adfu5jn6-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
            "tables": [{"table": "grievance_embeddings", "embedding_col": "embedding"}],
            "description": "BBMP Bangalore specific complaints about garbage, sanitation, and civic issues"
        },
        {
            "db_url": "postgresql://neondb_owner:npg_V3Tajfg2cdep@ep-blue-dust-adhjp0ug-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
            "tables": [{"table": "grievance_embeddings", "embedding_col": "embedding"}],
            "description": "Multi-state grievances covering various categories including water, roads, general issues"
        },
        {
            "db_url": "postgresql://neondb_owner:npg_czCHWS3ZQ5mJ@ep-calm-violet-adhbrwhg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
            "tables": [{"table": "FInGr", "embedding_col": "embedding"}],
            "description": "Financial grievances and fraud-related complaints"
        },
        {
            "db_url": "postgresql://neondb_owner:npg_D3h5QNKcmHek@ep-spring-term-adebssla-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
            "tables": [{"table": "citizen_complaints", "embedding_col": "embedding"}],
            "description": "Citizen complaints about environment, pollution, and urban issues"
        },
        {
            "db_url": "postgresql://neondb_owner:npg_guEDpc41nrbV@ep-orange-tree-ae1ujojp-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
            "tables": [
                {"table": "query_organizations", "embedding_col": "embedding"},
                {"table": "gov_schems", "embedding_col": "embedding"},
                {"table": "public_authorities", "embedding_col": "embedding"}
            ],
            "description": "Government schemes, public authorities, and organizational queries"
        },
        {
            "db_url": "postgresql://neondb_owner:npg_RHui54ULlKre@ep-curly-salad-adh6uyhc-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
            "tables": [{"table": "fraud_grievance", "embedding_col": "embedding"}],
            "description": "Fraud and cybercrime related grievances"
        }
    ]
