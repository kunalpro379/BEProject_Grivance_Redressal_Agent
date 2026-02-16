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
    validation_result: Optional[Dict[str, Any]] = None,
    location_data: Optional[Dict[str, Any]] = None,
    citizen_id: Optional[str] = None,
    grievance_id: Optional[str] = None,
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
    UPDATE "UserGrievance"
    SET
      grievance_text = %(grievance_text)s,
      image_path = %(image_path)s,
      image_description = %(image_description)s,
      enhanced_query = %(enhanced_query)s,
      query_type = %(query_type)s,
      category = %(category)s,
      similar_cases_summary = %(similar_cases_summary)s,
      sentiment_priority = %(sentiment_priority)s,
      emotion = %(emotion)s,
      severity = %(severity)s,
      patterns = %(patterns)s,
      fraud = %(fraud)s,
      department = %(department)s,
      policy_search = %(policy_search)s,
      past_queries_summary = %(past_queries_summary)s,
      embedding = %(embedding)s::vector,
      full_result = %(full_result)s,
      validation_status = %(validation_status)s,
      validation_score = %(validation_score)s,
      validation_reasoning = %(validation_reasoning)s,
      extracted_location = %(extracted_location)s,
      extracted_address = %(extracted_address)s,
      extracted_latitude = %(extracted_latitude)s,
      extracted_longitude = %(extracted_longitude)s,
      location_confidence = %(location_confidence)s,
      validation_timestamp = NOW(),
      processing_metadata = %(processing_metadata)s,
      citizen_id = %(citizen_id)s
    WHERE id = %(grievance_id)s;
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
        # Validation fields
        "validation_status": (
            "validated" if validation_result and validation_result.get("is_valid")
            else "rejected" if validation_result and not validation_result.get("is_valid")
            else "no_image"
        ) if validation_result else "no_image",
        "validation_score": validation_result.get("validation_score") if validation_result else None,
        "validation_reasoning": validation_result.get("reasoning") if validation_result else None,
        # Location fields
        "extracted_location": json.dumps(location_data, ensure_ascii=False) if location_data else None,
        "extracted_address": location_data.get("address") if location_data else None,
        "extracted_latitude": location_data.get("latitude") if location_data else None,
        "extracted_longitude": location_data.get("longitude") if location_data else None,
        "location_confidence": location_data.get("confidence") if location_data else None,
        # Processing metadata
        "processing_metadata": json.dumps({
            "validation_confidence": validation_result.get("confidence") if validation_result else None,
            "location_extraction_method": location_data.get("extraction_method") if location_data else None,
            "landmarks": location_data.get("landmarks", []) if location_data else [],
            "area_type": location_data.get("area_type") if location_data else None,
        }, ensure_ascii=False),
        # Citizen ID
        "citizen_id": citizen_id,
        # Grievance ID for UPDATE
        "grievance_id": grievance_id,
    }

    cur.execute(sql, params)
    conn.commit()
    cur.close()
    conn.close()