# persistent/supabase.py
# Saves grievance analysis + embeddings to usergrievance.
# Maps AI outputs to respective columns and stores one complete raw JSONB in metadata.
from typing import Dict, Any, List, Optional
import json
import re
from datetime import datetime, timezone
import psycopg2
from configs.config import Config


def _safe_table_name(name: str) -> str:
    if name and re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", name):
        return name
    return "usergrievance"


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
    image_analysis: Optional[Dict[str, Any]] = None,
) -> None:
    """Update usergrievance with AI analysis: mapped columns + embedding + one complete raw JSONB in metadata."""
    if not grievance_id:
        print("[Supabase] WARNING: grievance_id is missing; skipping UPDATE. Ensure the worker passes grievance_id from the Platform.")
        return
    grievance_text = grievance_text if grievance_text is not None else ""
    enhanced_query = enhanced_query if enhanced_query is not None else ""
    if isinstance(grievance_text, bytes):
        grievance_text = grievance_text.decode("utf-8", errors="replace")
    if isinstance(enhanced_query, bytes):
        enhanced_query = enhanced_query.decode("utf-8", errors="replace")

    dsn = Config.supabase_dsn()
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    table = _safe_table_name(Config.grievance_table())

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

    # priority: usergrievance.priority (varchar) from sentiment_priority or severity
    priority_val = "medium"
    if isinstance(sentiment_priority, dict):
        pl = (sentiment_priority.get("priority_level") or sentiment_priority.get("priority") or "").strip()
        if pl:
            priority_val = pl.lower() if pl.lower() in ("high", "medium", "low") else "medium"
    if priority_val == "medium" and severity:
        sev = (severity.get("level") or severity.get("severity") or str(severity)).lower()
        if "high" in sev or "urgent" in sev or "critical" in sev:
            priority_val = "high"
        elif "low" in sev:
            priority_val = "low"

    # zone/ward: from location_data if present (optional)
    zone_val = None
    ward_val = None
    if location_data:
        zone_val = location_data.get("zone") or location_data.get("area_type")
        loc_details = location_data.get("location_details") or {}
        ward_val = loc_details.get("ward") if isinstance(loc_details, dict) else None

    # Extract department_id from full_result.department.allocated_department
    department_id_val = None
    print(f"[Supabase] DEBUG: full_result type: {type(full_result)}")
    print(f"[Supabase] DEBUG: full_result keys: {list(full_result.keys()) if isinstance(full_result, dict) else 'N/A'}")
    
    if full_result and isinstance(full_result, dict):
        dept_section = full_result.get("department", {})
        print(f"[Supabase] DEBUG: dept_section type: {type(dept_section)}")
        print(f"[Supabase] DEBUG: dept_section keys: {list(dept_section.keys()) if isinstance(dept_section, dict) else 'N/A'}")
        
        if isinstance(dept_section, dict):
            allocated_dept = dept_section.get("allocated_department")
            print(f"[Supabase] DEBUG: allocated_dept: {allocated_dept}")
            
            if allocated_dept and isinstance(allocated_dept, dict):
                department_id_val = allocated_dept.get("id")
                print(f"[Supabase] ✓ Extracted department_id: {department_id_val} from allocated_department")
            else:
                print(f"[Supabase] ⚠️ allocated_department is None or not a dict")
        else:
            print(f"[Supabase] ⚠️ dept_section is not a dict")
    else:
        print(f"[Supabase] ⚠️ full_result is None or not a dict")
    
    # Extract category and sub_category for separate columns
    category_val = None
    if isinstance(category, dict):
        # Store the entire category dict as JSONB
        category_val = json.dumps(category, ensure_ascii=False)

    def _json_safe(value: Any) -> Any:
        if isinstance(value, (dict, list)):
            return json.dumps(value, ensure_ascii=False)
        return value

    # One complete raw AI response JSONB for metadata column (single source of truth for AI output)
    metadata_payload = {
        "raw_complete": True,
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "agent_outputs": agent_outputs,
        "full_result": full_result,
        "validation_result": validation_result,
        "location_data": location_data,
        "image_analysis": image_analysis,
        "processing_metadata": {
            "validation_confidence": validation_result.get("confidence") if validation_result else None,
            "location_extraction_method": location_data.get("extraction_method") if location_data else None,
            "landmarks": location_data.get("landmarks", []) if location_data else [],
            "area_type": location_data.get("area_type") if location_data else None,
        },
    }
    metadata_json = json.dumps(metadata_payload, ensure_ascii=False)

    # Embedding: store as vector (pgvector). Empty list -> "[]".
    embedding_str = "[" + ",".join(map(str, embedding)) + "]" if embedding else "[]"

    # usergrievance columns we fill from AI (rest are id/FKs/defaults/later workflow):
    # grievance_text, image_path, image_description, enhanced_query, citizen_id, updated_at
    # query_type, category, similar_cases_summary, sentiment_priority, emotion, severity, patterns, fraud, department_info, policy_search, past_queries_summary
    # full_result, validation_status, validation_score, validation_reasoning, validation_timestamp
    # extracted_location, extracted_address, extracted_latitude, extracted_longitude, location_confidence
    # latitude, longitude, location_address (existing columns for location)
    # processing_metadata, metadata, embedding, priority, zone, ward

    sql_with_metadata = f"""
    UPDATE {table}
    SET
      grievance_text = %(grievance_text)s,
      image_path = %(image_path)s,
      image_description = %(image_description)s,
      enhanced_query = %(enhanced_query)s,
      priority = %(priority)s,
      zone = %(zone)s,
      ward = %(ward)s,
      department_id = %(department_id)s,
      category = %(category_val)s,
      query_type = %(query_type)s,
      similar_cases_summary = %(similar_cases_summary)s,
      sentiment_priority = %(sentiment_priority)s,
      emotion = %(emotion)s,
      severity = %(severity)s,
      patterns = %(patterns)s,
      fraud = %(fraud)s,
      department_info = %(department)s,
      policy_search = %(policy_search)s,
      past_queries_summary = %(past_queries_summary)s,
      embedding = (%(embedding)s)::vector,
      full_result = %(full_result)s,
      validation_status = %(validation_status)s,
      validation_score = %(validation_score)s,
      validation_reasoning = %(validation_reasoning)s,
      extracted_location = %(extracted_location)s,
      extracted_address = %(extracted_address)s,
      extracted_latitude = %(extracted_latitude)s,
      extracted_longitude = %(extracted_longitude)s,
      latitude = %(latitude)s,
      longitude = %(longitude)s,
      location_address = %(location_address)s,
      location_confidence = %(location_confidence)s,
      validation_timestamp = NOW(),
      processing_metadata = %(processing_metadata)s,
      metadata = %(metadata)s,
      updated_at = NOW(),
      citizen_id = %(citizen_id)s
    WHERE id = %(grievance_id)s;
    """
    sql_no_metadata = f"""
    UPDATE {table}
    SET
      grievance_text = %(grievance_text)s,
      image_path = %(image_path)s,
      image_description = %(image_description)s,
      enhanced_query = %(enhanced_query)s,
      priority = %(priority)s,
      zone = %(zone)s,
      ward = %(ward)s,
      department_id = %(department_id)s,
      category = %(category_val)s,
      query_type = %(query_type)s,
      similar_cases_summary = %(similar_cases_summary)s,
      sentiment_priority = %(sentiment_priority)s,
      emotion = %(emotion)s,
      severity = %(severity)s,
      patterns = %(patterns)s,
      fraud = %(fraud)s,
      department_info = %(department)s,
      policy_search = %(policy_search)s,
      past_queries_summary = %(past_queries_summary)s,
      embedding = (%(embedding)s)::vector,
      full_result = %(full_result)s,
      validation_status = %(validation_status)s,
      validation_score = %(validation_score)s,
      validation_reasoning = %(validation_reasoning)s,
      extracted_location = %(extracted_location)s,
      extracted_address = %(extracted_address)s,
      extracted_latitude = %(extracted_latitude)s,
      extracted_longitude = %(extracted_longitude)s,
      latitude = %(latitude)s,
      longitude = %(longitude)s,
      location_address = %(location_address)s,
      location_confidence = %(location_confidence)s,
      validation_timestamp = NOW(),
      processing_metadata = %(processing_metadata)s,
      updated_at = NOW(),
      citizen_id = %(citizen_id)s
    WHERE id = %(grievance_id)s;
    """

    params = {
        "grievance_text": grievance_text,
        "image_path": image_path,
        "image_description": image_description or "",
        "enhanced_query": enhanced_query,
        "priority": priority_val,
        "zone": zone_val,
        "ward": ward_val,
        "department_id": department_id_val,
        "category_val": category_val,
        "query_type": _json_safe(query_type),
        "similar_cases_summary": _json_safe(similar_cases_summary),
        "sentiment_priority": _json_safe(sentiment_priority),
        "emotion": _json_safe(emotion),
        "severity": _json_safe(severity),
        "patterns": _json_safe(patterns),
        "fraud": _json_safe(fraud),
        "department": _json_safe(department),
        "policy_search": _json_safe(policy_search),
        "past_queries_summary": past_queries_summary,
        "embedding": embedding_str,
        "full_result": json.dumps(full_result, ensure_ascii=False),
        "validation_status": (
            "validated" if validation_result and validation_result.get("is_valid")
            else "rejected" if validation_result and not validation_result.get("is_valid")
            else "no_image"
        ) if validation_result else "no_image",
        "validation_score": validation_result.get("validation_score") if validation_result else None,
        "validation_reasoning": validation_result.get("reasoning") if validation_result else None,
        "extracted_location": json.dumps(location_data, ensure_ascii=False) if location_data else None,
        "extracted_address": location_data.get("address") if location_data else None,
        "extracted_latitude": location_data.get("latitude") if location_data else None,
        "extracted_longitude": location_data.get("longitude") if location_data else None,
        "latitude": location_data.get("latitude") if location_data else None,
        "longitude": location_data.get("longitude") if location_data else None,
        "location_address": location_data.get("address") if location_data else None,
        "location_confidence": location_data.get("confidence") if location_data else None,
        "processing_metadata": json.dumps({
            "validation_confidence": validation_result.get("confidence") if validation_result else None,
            "location_extraction_method": location_data.get("extraction_method") if location_data else None,
            "landmarks": location_data.get("landmarks", []) if location_data else [],
            "area_type": location_data.get("area_type") if location_data else None,
        }, ensure_ascii=False),
        "metadata": metadata_json,
        "citizen_id": citizen_id,
        "grievance_id": grievance_id,
    }
    
    print(f"[Supabase] 📊 UPDATE parameters:")
    print(f"   - grievance_id: {grievance_id}")
    print(f"   - department_id: {department_id_val}")
    print(f"   - priority: {priority_val}")
    print(f"   - zone: {zone_val}")
    print(f"   - ward: {ward_val}")

    try:
        cur.execute(sql_with_metadata, params)
        if cur.rowcount == 0:
            print(f"[Supabase] ⚠️ WARNING: UPDATE matched 0 rows for grievance_id={grievance_id}. Check that the row exists and QueryAnalyst uses the same DB as the Platform.")
        else:
            print(f"[Supabase] ✅ Successfully updated {cur.rowcount} row(s) for grievance_id={grievance_id}")
            if department_id_val:
                print(f"[Supabase] ✅ Department ID {department_id_val} assigned successfully")
    except psycopg2.ProgrammingError as e:
        err = str(e)
        if "metadata" in err or "column" in err.lower():
            conn.rollback()
            cur.execute(sql_no_metadata, {k: v for k, v in params.items() if k != "metadata"})
            if cur.rowcount == 0:
                print(f"[Supabase] WARNING: UPDATE (no metadata) matched 0 rows for grievance_id={grievance_id}.")
        else:
            conn.rollback()
            raise
    conn.commit()
    cur.close()
    conn.close()