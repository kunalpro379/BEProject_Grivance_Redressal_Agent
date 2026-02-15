-- Migration: Create grievance management functions
-- Description: Functions for submitting, processing, assigning, and resolving grievances

-- Function 1: Submit Grievance
CREATE OR REPLACE FUNCTION submit_grievance(
    p_citizen_id uuid,
    p_grievance_text text,
    p_image_path text DEFAULT NULL,
    p_image_description text DEFAULT NULL,
    p_enhanced_query text DEFAULT NULL,
    p_embedding text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_grievance_id uuid;
BEGIN
    INSERT INTO "UserGrievance" (
        citizen_id, grievance_text, image_path, 
        image_description, enhanced_query, embedding
    ) VALUES (
        p_citizen_id, p_grievance_text, p_image_path,
        p_image_description, p_enhanced_query, 
        CASE 
            WHEN p_embedding IS NOT NULL THEN p_embedding::vector
            ELSE NULL 
        END
    )
    RETURNING id INTO v_grievance_id;
    
    RETURN v_grievance_id;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Process Grievance (AI Analysis)
CREATE OR REPLACE FUNCTION process_grievance(
    p_grievance_id uuid,
    p_query_type text DEFAULT NULL,
    p_category text DEFAULT NULL,
    p_sentiment_priority text DEFAULT NULL,
    p_emotion text DEFAULT NULL,
    p_severity text DEFAULT NULL,
    p_patterns text DEFAULT NULL,
    p_fraud text DEFAULT NULL,
    p_department text DEFAULT NULL,
    p_policy_search text DEFAULT NULL,
    p_similar_cases_summary text DEFAULT NULL,
    p_past_queries_summary text DEFAULT NULL,
    p_full_result text DEFAULT NULL,
    p_priority text DEFAULT 'medium'
) RETURNS uuid AS $$
DECLARE
    v_processed_id uuid;
    v_citizen_id uuid;
    v_department_id uuid;
BEGIN
    -- Get citizen_id from UserGrievance
    SELECT citizen_id INTO v_citizen_id
    FROM "UserGrievance"
    WHERE id = p_grievance_id;
    
    IF v_citizen_id IS NULL THEN
        RAISE EXCEPTION 'Grievance not found: %', p_grievance_id;
    END IF;
    
    -- Get department_id if department name provided
    IF p_department IS NOT NULL THEN
        SELECT id INTO v_department_id
        FROM "Departments"
        WHERE name ILIKE p_department
        LIMIT 1;
    END IF;
    
    -- Insert into Grievances table
    INSERT INTO "Grievances" (
        grievance_id, citizen_id, query_type, category,
        sentiment_priority, emotion, severity, patterns,
        fraud, department_id, policy_search, similar_cases_summary,
        past_queries_summary, full_result, priority, status
    ) VALUES (
        p_grievance_id, v_citizen_id, p_query_type, p_category,
        p_sentiment_priority, p_emotion, p_severity, p_patterns,
        p_fraud, v_department_id, p_policy_search, p_similar_cases_summary,
        p_past_queries_summary, p_full_result, p_priority, 'pending'
    )
    RETURNING id INTO v_processed_id;
    
    RETURN v_processed_id;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Assign Grievance to Officer
CREATE OR REPLACE FUNCTION assign_grievance(
    p_grievance_id uuid,
    p_officer_id uuid
) RETURNS boolean AS $$
BEGIN
    UPDATE "Grievances"
    SET 
        assigned_officer_id = p_officer_id,
        status = 'assigned',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_grievance_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Resolve Grievance
CREATE OR REPLACE FUNCTION resolve_grievance(
    p_grievance_id uuid,
    p_resolved_by uuid,
    p_resolution_text text
) RETURNS boolean AS $$
BEGIN
    UPDATE "Grievances"
    SET 
        status = 'resolved',
        resolved_by = p_resolved_by,
        resolution_text = p_resolution_text,
        resolved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_grievance_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION submit_grievance TO PUBLIC;
GRANT EXECUTE ON FUNCTION process_grievance TO PUBLIC;
GRANT EXECUTE ON FUNCTION assign_grievance TO PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_grievance TO PUBLIC;
