-- Helper functions for the grievance workflow

-- Function 1: Register citizen from Telegram
CREATE OR REPLACE FUNCTION register_citizen(
  p_telegram_id bigint,
  p_phone varchar,
  p_username varchar DEFAULT NULL,
  p_full_name varchar DEFAULT NULL,
  p_latitude decimal DEFAULT NULL,
  p_longitude decimal DEFAULT NULL,
  p_location_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_citizen_id uuid;
BEGIN
  INSERT INTO "Citizens" (
    telegram_id, phone, username, full_name,
    latitude, longitude, location_address, is_registered
  )
  VALUES (
    p_telegram_id, p_phone, p_username, p_full_name,
    p_latitude, p_longitude, p_location_address, true
  )
  ON CONFLICT (telegram_id) 
  DO UPDATE SET
    phone = EXCLUDED.phone,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    location_address = EXCLUDED.location_address,
    updated_at = now()
  RETURNING id INTO v_citizen_id;
  
  RETURN v_citizen_id;
END;
$$;

-- Function 2: Submit grievance from Telegram
CREATE OR REPLACE FUNCTION submit_grievance(
  p_citizen_id uuid,
  p_grievance_text text,
  p_image_path text DEFAULT NULL,
  p_image_description text DEFAULT NULL,
  p_enhanced_query text DEFAULT NULL,
  p_embedding text DEFAULT NULL
  -- p_embedding vector(384) DEFAULT NULL  -- Commented out until pgvector is installed
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_grivience_id uuid;
BEGIN
  INSERT INTO "UserGrivience" (
    citizen_id, grievance_text, image_path, 
    image_description, enhanced_query, embedding
  )
  VALUES (
    p_citizen_id, p_grievance_text, p_image_path,
    p_image_description, p_enhanced_query, p_embedding
  )
  RETURNING id INTO v_grivience_id;
  
  RETURN v_grivience_id;
END;
$$;

-- Function 3: Process grievance with AI analysis
CREATE OR REPLACE FUNCTION process_grievance(
  p_grivience_id uuid,
  p_query_type jsonb DEFAULT NULL,
  p_category jsonb DEFAULT NULL,
  p_sentiment_priority jsonb DEFAULT NULL,
  p_emotion jsonb DEFAULT NULL,
  p_severity jsonb DEFAULT NULL,
  p_patterns jsonb DEFAULT NULL,
  p_fraud jsonb DEFAULT NULL,
  p_department jsonb DEFAULT NULL,
  p_policy_search jsonb DEFAULT NULL,
  p_similar_cases_summary text DEFAULT NULL,
  p_past_queries_summary text DEFAULT NULL,
  p_full_result jsonb DEFAULT NULL,
  p_priority varchar DEFAULT 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_grievance_id uuid;
  v_citizen_id uuid;
  v_department_id uuid;
BEGIN
  -- Get citizen_id from grivience
  SELECT citizen_id INTO v_citizen_id
  FROM "UserGrivience"
  WHERE id = p_grivience_id;
  
  -- Extract department_id from department jsonb if available
  IF p_department IS NOT NULL AND p_department->>'id' IS NOT NULL THEN
    v_department_id := (p_department->>'id')::uuid;
  END IF;
  
  -- Create processed grievance record
  INSERT INTO "UserGrievance" (
    grivience_id, citizen_id, department_id,
    query_type, category, sentiment_priority, emotion,
    severity, patterns, fraud, department, policy_search,
    similar_cases_summary, past_queries_summary,
    full_result, priority, status
  )
  VALUES (
    p_grivience_id, v_citizen_id, v_department_id,
    p_query_type, p_category, p_sentiment_priority, p_emotion,
    p_severity, p_patterns, p_fraud, p_department, p_policy_search,
    p_similar_cases_summary, p_past_queries_summary,
    p_full_result, p_priority, 'pending'
  )
  RETURNING id INTO v_grievance_id;
  
  RETURN v_grievance_id;
END;
$$;

-- Function 4: Assign grievance to officer
CREATE OR REPLACE FUNCTION assign_grievance(
  p_grievance_id uuid,
  p_officer_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "UserGrievance"
  SET 
    assigned_officer_id = p_officer_id,
    status = 'in_progress',
    updated_at = now()
  WHERE id = p_grievance_id;
  
  RETURN FOUND;
END;
$$;

-- Function 5: Resolve grievance
CREATE OR REPLACE FUNCTION resolve_grievance(
  p_grievance_id uuid,
  p_resolved_by uuid,
  p_resolution_text text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "UserGrievance"
  SET 
    status = 'resolved',
    resolution_text = p_resolution_text,
    resolved_by = p_resolved_by,
    resolved_at = now(),
    updated_at = now()
  WHERE id = p_grievance_id;
  
  RETURN FOUND;
END;
$$;

-- Function 6: Get citizen grievances with details
CREATE OR REPLACE FUNCTION get_citizen_grievances(
  p_telegram_id bigint
)
RETURNS TABLE (
  grievance_id uuid,
  grivience_id uuid,
  grievance_text text,
  image_path text,
  status grievance_status,
  priority varchar,
  category jsonb,
  department_name varchar,
  created_at timestamptz,
  resolved_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ug.id as grievance_id,
    ugr.id as grivience_id,
    ugr.grievance_text,
    ugr.image_path,
    ug.status,
    ug.priority,
    ug.category,
    d.name as department_name,
    ugr.created_at,
    ug.resolved_at
  FROM "Citizens" c
  JOIN "UserGrivience" ugr ON c.id = ugr.citizen_id
  LEFT JOIN "UserGrievance" ug ON ugr.id = ug.grivience_id
  LEFT JOIN "Departments" d ON ug.department_id = d.id
  WHERE c.telegram_id = p_telegram_id
  ORDER BY ugr.created_at DESC;
END;
$$;
