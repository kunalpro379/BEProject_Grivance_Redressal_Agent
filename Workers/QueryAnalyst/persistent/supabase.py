# tools/supabase_client.py
from typing import Dict, Any, List, Optional
import json
import psycopg2
from configs.config import Config

def insert_user_grievience(
    grievance_text: str,
    image_path: Optional[str],
    image_description: str,
    enhanced_query: str,
    embedding: List[float],
    agent_outputs: Dict[str, Any],
    full_result: Dict[str, Any],
) -> None:
    dsn = Config.supabase_dsn()
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    similar_cases_summary = agent_outputs.get("similar_cases", {})
    sentiment_priority = agent_outputs.get("sentiment_priority", {})
    emotion = agent_outputs.get("emotion", {})
    severity = agent_outputs.get("severity", {})
    patterns = agent_outputs.get("patterns", {})
    fraud = agent_outputs.get("fraud", {})
    category = agent_outputs.get("category", {})
    department = agent_outputs.get("department", {})
    policy_search = agent_outputs.get("policy_search", {})
    query_type = agent_outputs.get("query_type", {})

    past_queries_summary = (
        similar_cases_summary.get("patterns_identified")
        or similar_cases_summary.get("common_resolutions")
        or []
    )
    if isinstance(past_queries_summary, list):
        past_queries_summary = "; ".join(str(x) for x in past_queries_summary)

    def _json_safe(value: Any) -> Any:
        """Convert dict/list to JSON string; leave scalars as-is."""
        if isinstance(value, (dict, list)):
            return json.dumps(value, ensure_ascii=False)
        return value

    sql = """
    insert into "UserGrivience" (
      grievance_text,
      image_path,
      image_description,
      enhanced_query,
      query_type,
      category,
      similar_cases_summary,
      sentiment_priority,
      emotion,
      severity,
      patterns,
      fraud,
      department,
      policy_search,
      past_queries_summary,
      embedding,
      full_result
    )
    values (
      %(grievance_text)s,
      %(image_path)s,
      %(image_description)s,
      %(enhanced_query)s,
      %(query_type)s,
      %(category)s,
      %(similar_cases_summary)s,
      %(sentiment_priority)s,
      %(emotion)s,
      %(severity)s,
      %(patterns)s,
      %(fraud)s,
      %(department)s,
      %(policy_search)s,
      %(past_queries_summary)s,
      %(embedding)s::vector,
      %(full_result)s
    );
    """

    params = {
        "grievance_text": grievance_text,
        "image_path": image_path,
        "image_description": image_description,
        "enhanced_query": enhanced_query,
        "query_type": _json_safe(query_type),
        "category": _json_safe(category),
        "similar_cases_summary": _json_safe(similar_cases_summary),
        "sentiment_priority": _json_safe(sentiment_priority),
        "emotion": _json_safe(emotion),
        "severity": _json_safe(severity),
        "patterns": _json_safe(patterns),
        "fraud": _json_safe(fraud),
        "department": _json_safe(department),
        "policy_search": _json_safe(policy_search),
        "past_queries_summary": past_queries_summary,
        # pgvector expects a vector literal like [1,2,3]
        "embedding": "[" + ",".join(map(str, embedding)) + "]",
        "full_result": json.dumps(full_result, ensure_ascii=False),
    }

    cur.execute(sql, params)
    conn.commit()
    cur.close()
    conn.close()