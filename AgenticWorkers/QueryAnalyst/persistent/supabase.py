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
    telegram_location_data: Optional[Dict[str, Any]] = None,
) -> None:
    """
    SIMPLIFIED VERSION: Only saves essential data + full_result JSON to usergrievance.
    DeepSeek processor will parse full_result and populate grievance_processed table.
    
    Columns updated in usergrievance:
    - Basic fields: grievance_text, image_path, image_description, enhanced_query
    - Full AI output: full_result (complete JSON)
    - Validation: validation_status, validation_score, validation_reasoning
    - Location: extracted_location, extracted_address, extracted_latitude, extracted_longitude, latitude, longitude, location_address, location_confidence
    - Embedding: embedding vector for search
    - Citizen: citizen_id
    
    NOT updated (will be populated by DeepSeek in grievance_processed):
    - category, query_type, emotion, severity, patterns, fraud
    - sentiment_priority, similar_cases_summary, policy_search, past_queries_summary
    - department_info, priority, zone, ward
    """
    if not grievance_id:
        print("[Supabase] WARNING: grievance_id is missing; skipping UPDATE.")
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

    # Embedding: store as vector (pgvector)
    embedding_str = "[" + ",".join(map(str, embedding)) + "]" if embedding else "[]"

    # MATCHING DB.sql SCHEMA: usergrievance only has these columns:
    # id, grievance_id, created_at, updated_at, embedding, citizen_id, department_id, 
    # assigned_officer_id, zone, ward, status, priority, validation_status, full_result
    
    # Extract priority from full_result
    priority_val = "medium"
    if full_result and isinstance(full_result, dict):
        sentiment_priority = full_result.get("sentiment_priority", {})
        if isinstance(sentiment_priority, dict):
            pl = sentiment_priority.get("priority_level") or sentiment_priority.get("priority") or ""
            if pl and pl.lower() in ("high", "medium", "low"):
                priority_val = pl.lower()
    
    # Extract zone/ward from location_data if available
    zone_val = None
    ward_val = None
    if location_data:
        zone_val = location_data.get("zone") or location_data.get("area_type")
        loc_details = location_data.get("location_details") or {}
        ward_val = loc_details.get("ward") if isinstance(loc_details, dict) else None
    
    # Determine validation status and grievance status
    validation_status_val = "pending"
    status_val = "submitted"  # Default status
    
    if validation_result:
        if validation_result.get("is_valid"):
            validation_status_val = "validated"
            status_val = "submitted"  # Keep as submitted if valid
        else:
            validation_status_val = "rejected"
            status_val = "rejected"  # Set status to rejected if validation fails
    
    sql = f"""
    UPDATE {table}
    SET
      embedding = (%(embedding)s)::vector,
      full_result = %(full_result)s,
      validation_status = %(validation_status)s,
      status = %(status)s,
      priority = %(priority)s,
      zone = %(zone)s,
      ward = %(ward)s,
      citizen_id = %(citizen_id)s,
      updated_at = NOW()
    WHERE grievance_id = %(grievance_id)s;
    """

    params = {
        "embedding": embedding_str,
        "full_result": json.dumps(full_result, ensure_ascii=False),
        "validation_status": validation_status_val,
        "status": status_val,
        "priority": priority_val,
        "zone": zone_val,
        "ward": ward_val,
        "citizen_id": citizen_id,
        "grievance_id": grievance_id,
    }
    
    print(f"[Supabase] 📝 SIMPLIFIED UPDATE for grievance_id={grievance_id}")
    print(f"   ✓ Validation Status: {validation_status_val}")
    print(f"   ✓ Grievance Status: {status_val}")
    if status_val == "rejected":
        print(f"   ⚠️ REJECTED: {validation_result.get('reasoning', 'Validation failed')}")
    print(f"   ✓ Only saving: full_result JSON + validation + location + embedding")
    print(f"   → DeepSeek will populate grievance_processed table")

    try:
        cur.execute(sql, params)
        if cur.rowcount == 0:
            print(f"[Supabase] ⚠️ WARNING: UPDATE matched 0 rows for grievance_id={grievance_id}")
        else:
            print(f"[Supabase]  Successfully updated usergrievance (simplified)")
    except Exception as e:
        conn.rollback()
        print(f"[Supabase] ❌ Error updating usergrievance: {e}")
        raise
    
    conn.commit()
    cur.close()
    conn.close()
    
    # Now trigger DeepSeek post-processing to populate grievance_processed
    print(f"[Supabase] 🔄 Starting DeepSeek post-processing...")
    try:
        from persistent.deepseek_processor import DeepSeekProcessor
        processor = DeepSeekProcessor()
        success = processor.process_and_save_to_grievance_processed(
            grievance_id=grievance_id,
            citizen_id=citizen_id,
            full_result=full_result,
            embedding=embedding,
            validation_result=validation_result,
            location_data=location_data,
            telegram_location_data=telegram_location_data
        )
        if success:
            print(f"[Supabase]  DeepSeek post-processing completed")
        else:
            print(f"[Supabase] ⚠️ DeepSeek post-processing failed")
    except Exception as e:
        print(f"[Supabase] ❌ Error in DeepSeek post-processing: {e}")
        import traceback
        traceback.print_exc()