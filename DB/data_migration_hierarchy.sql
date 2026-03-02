-- ============================================================================
-- DATA MIGRATION: Populate Hierarchical Relationships
-- ============================================================================
-- This script helps migrate existing text-based relationships to proper
-- foreign key relationships
-- ============================================================================

-- Step 1: Migrate city_officials text fields to proper foreign keys
-- ============================================================================
-- Update city_id based on city name
UPDATE public.city_officials co
SET city_id = c.id
FROM public.cities c
WHERE LOWER(TRIM(co.city)) = LOWER(TRIM(c.city_name))
AND co.city_id IS NULL;

-- Update district_id based on district name
UPDATE public.city_officials co
SET district_id = d.id
FROM public.districts d
WHERE LOWER(TRIM(co.district)) = LOWER(TRIM(d.district_name))
AND co.district_id IS NULL;

-- Step 2: Migrate ward_officers text fields to proper foreign keys
-- ============================================================================
-- Update city_id for ward officers
UPDATE public.ward_officers wo
SET city_id = c.id
FROM public.cities c
WHERE LOWER(TRIM(wo.city)) = LOWER(TRIM(c.city_name))
AND wo.city_id IS NULL;

-- Update district_id for ward officers
UPDATE public.ward_officers wo
SET district_id = d.id
FROM public.districts d
WHERE LOWER(TRIM(wo.district)) = LOWER(TRIM(d.district_name))
AND wo.district_id IS NULL;

-- Update ward_id for ward officers based on ward_number and city
UPDATE public.ward_officers wo
SET ward_id = w.id
FROM public.wards w
JOIN public.cities c ON w.city_id = c.id
WHERE w.ward_number = wo.ward_number
AND c.id = wo.city_id
AND wo.ward_id IS NULL;

-- Link ward officers to city officials (commissioners) in the same city
UPDATE public.ward_officers wo
SET reports_to_city_official_id = co.id
FROM public.city_officials co
WHERE wo.city_id = co.city_id
AND co.designation ILIKE '%commissioner%'
AND wo.reports_to_city_official_id IS NULL;

-- Step 3: Migrate departmentofficers text fields to proper foreign keys
-- ============================================================================
-- Update city_id for department officers based on zone/city text
UPDATE public.departmentofficers do_tbl
SET city_id = c.id
FROM public.cities c
WHERE LOWER(TRIM(do_tbl.zone)) = LOWER(TRIM(c.city_name))
AND do_tbl.city_id IS NULL;

-- Update ward_id for department officers
UPDATE public.departmentofficers do_tbl
SET ward_id = w.id
FROM public.wards w
WHERE w.ward_number = do_tbl.ward
AND w.city_id = do_tbl.city_id
AND do_tbl.ward_id IS NULL;

-- Link department officers to ward officers in the same ward
UPDATE public.departmentofficers do_tbl
SET reports_to_ward_officer_id = wo.id
FROM public.ward_officers wo
WHERE do_tbl.ward_id = wo.ward_id
AND do_tbl.reports_to_ward_officer_id IS NULL
AND do_tbl.ward_id IS NOT NULL;

-- Link department officers directly to city officials if no ward assignment
UPDATE public.departmentofficers do_tbl
SET reports_to_city_official_id = co.id
FROM public.city_officials co
WHERE do_tbl.city_id = co.city_id
AND do_tbl.ward_id IS NULL
AND do_tbl.reports_to_city_official_id IS NULL;

-- Step 4: Create sample data insertion helper function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_hierarchical_structure(
  p_state_name varchar,
  p_district_name varchar,
  p_city_name varchar,
  p_commissioner_name varchar,
  p_commissioner_email varchar
) RETURNS jsonb AS $$
DECLARE
  v_state_id uuid;
  v_district_id uuid;
  v_city_id uuid;
  v_user_id uuid;
  v_role_id uuid;
  v_gov_official_id uuid;
  v_city_official_id uuid;
  v_result jsonb;
BEGIN
  -- Get or create state
  SELECT id INTO v_state_id FROM public.states WHERE state_name = p_state_name;
  IF v_state_id IS NULL THEN
    INSERT INTO public.states (state_name, state_code, is_active)
    VALUES (p_state_name, UPPER(LEFT(p_state_name, 2)), true)
    RETURNING id INTO v_state_id;
  END IF;

  -- Get or create district
  SELECT id INTO v_district_id FROM public.districts WHERE district_name = p_district_name;
  IF v_district_id IS NULL THEN
    INSERT INTO public.districts (state_id, district_name, district_code, is_active)
    VALUES (v_state_id, p_district_name, UPPER(LEFT(p_district_name, 3)), true)
    RETURNING id INTO v_district_id;
  END IF;

  -- Get or create city
  SELECT id INTO v_city_id FROM public.cities WHERE city_name = p_city_name;
  IF v_city_id IS NULL THEN
    INSERT INTO public.cities (district_id, city_name, city_code, city_type, is_active)
    VALUES (v_district_id, p_city_name, UPPER(LEFT(p_city_name, 3)), 'Municipal Corporation', true)
    RETURNING id INTO v_city_id;
  END IF;

  -- Create user for commissioner
  INSERT INTO public.users (email, password_hash, full_name, role, status, email_verified)
  VALUES (
    p_commissioner_email,
    '$2b$10$defaulthash', -- Replace with proper hash
    p_commissioner_name,
    'city_official',
    'active',
    true
  )
  RETURNING id INTO v_user_id;

  -- Get role for City Commissioner
  SELECT id INTO v_role_id FROM public.government_roles 
  WHERE role_level = 'City' AND role_name ILIKE '%commissioner%'
  LIMIT 1;

  -- Create government official record
  INSERT INTO public.government_officials (
    user_id, role_id, city_id, district_id, state_id,
    employee_code, designation, status, is_active
  )
  VALUES (
    v_user_id, v_role_id, v_city_id, v_district_id, v_state_id,
    'COMM-' || UPPER(LEFT(p_city_name, 3)) || '-001',
    'City Commissioner',
    'Active',
    true
  )
  RETURNING id INTO v_gov_official_id;

  -- Create city official record
  INSERT INTO public.city_officials (
    user_id, city, district, designation, corporation_name,
    city_id, district_id
  )
  VALUES (
    v_user_id, p_city_name, p_district_name, 'City Commissioner',
    p_city_name || ' Municipal Corporation',
    v_city_id, v_district_id
  )
  RETURNING id INTO v_city_official_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'state_id', v_state_id,
    'district_id', v_district_id,
    'city_id', v_city_id,
    'user_id', v_user_id,
    'government_official_id', v_gov_official_id,
    'city_official_id', v_city_official_id,
    'message', 'Hierarchical structure created successfully'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Validation queries to check data integrity
-- ============================================================================

-- Check ward officers without city official link
CREATE OR REPLACE VIEW public.ward_officers_missing_supervisor AS
SELECT 
  wo.id,
  u.full_name,
  wo.ward_number,
  wo.city,
  wo.district,
  'Missing city official link' as issue
FROM public.ward_officers wo
JOIN public.users u ON wo.user_id = u.id
WHERE wo.reports_to_city_official_id IS NULL;

-- Check department officers without supervisor link
CREATE OR REPLACE VIEW public.dept_officers_missing_supervisor AS
SELECT 
  do_tbl.id,
  u.full_name,
  do_tbl.staff_id,
  do_tbl.role,
  d.name as department,
  do_tbl.zone,
  do_tbl.ward,
  'Missing supervisor link' as issue
FROM public.departmentofficers do_tbl
JOIN public.users u ON do_tbl.user_id = u.id
LEFT JOIN public.departments d ON do_tbl.department_id = d.id
WHERE do_tbl.reports_to_city_official_id IS NULL 
AND do_tbl.reports_to_ward_officer_id IS NULL;

-- Check city officials without proper foreign keys
CREATE OR REPLACE VIEW public.city_officials_missing_fk AS
SELECT 
  co.id,
  u.full_name,
  co.city,
  co.district,
  co.designation,
  CASE 
    WHEN co.city_id IS NULL THEN 'Missing city_id'
    WHEN co.district_id IS NULL THEN 'Missing district_id'
    ELSE 'OK'
  END as issue
FROM public.city_officials co
JOIN public.users u ON co.user_id = u.id
WHERE co.city_id IS NULL OR co.district_id IS NULL;

-- Step 6: Generate hierarchy report
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_hierarchy_report()
RETURNS TABLE (
  metric varchar,
  count bigint,
  details text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Total City Officials'::varchar,
    COUNT(*)::bigint,
    'City Commissioners and other city-level officials'::text
  FROM public.city_officials
  
  UNION ALL
  
  SELECT 
    'City Officials with Proper Links'::varchar,
    COUNT(*)::bigint,
    'City officials with city_id and district_id set'::text
  FROM public.city_officials
  WHERE city_id IS NOT NULL AND district_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'Total Ward Officers'::varchar,
    COUNT(*)::bigint,
    'Ward-level officers'::text
  FROM public.ward_officers
  
  UNION ALL
  
  SELECT 
    'Ward Officers Linked to City Officials'::varchar,
    COUNT(*)::bigint,
    'Ward officers with reports_to_city_official_id set'::text
  FROM public.ward_officers
  WHERE reports_to_city_official_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'Total Department Officers'::varchar,
    COUNT(*)::bigint,
    'Department-level officers'::text
  FROM public.departmentofficers
  
  UNION ALL
  
  SELECT 
    'Dept Officers Linked to Ward Officers'::varchar,
    COUNT(*)::bigint,
    'Department officers reporting to ward officers'::text
  FROM public.departmentofficers
  WHERE reports_to_ward_officer_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'Dept Officers Linked to City Officials'::varchar,
    COUNT(*)::bigint,
    'Department officers reporting directly to city officials'::text
  FROM public.departmentofficers
  WHERE reports_to_city_official_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Create a complete hierarchical structure
-- SELECT public.create_hierarchical_structure(
--   'Maharashtra',
--   'Mumbai',
--   'Mumbai',
--   'John Doe',
--   'john.doe@mumbai.gov.in'
-- );

-- Example 2: View hierarchy report
-- SELECT * FROM public.generate_hierarchy_report();

-- Example 3: Check for missing links
-- SELECT * FROM public.ward_officers_missing_supervisor;
-- SELECT * FROM public.dept_officers_missing_supervisor;
-- SELECT * FROM public.city_officials_missing_fk;

-- ============================================================================
-- END OF DATA MIGRATION
-- ============================================================================
