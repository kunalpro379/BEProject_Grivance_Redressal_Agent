-- ============================================================================
-- HIERARCHY TEST & DEMONSTRATION SCRIPT
-- ============================================================================
-- This script demonstrates the hierarchy functionality
-- Run this AFTER applying schema_fixes_hierarchy.sql and data_migration_hierarchy.sql
-- ============================================================================

-- Step 1: Check current data in tables
-- ============================================================================
\echo '========================================='
\echo 'STEP 1: Current Data Overview'
\echo '========================================='
\echo ''

\echo 'City Officials Count:'
SELECT COUNT(*) as total_city_officials FROM city_officials;
\echo ''

\echo 'Sample City Officials:'
SELECT 
  id,
  user_id,
  city,
  district,
  designation,
  corporation_name
FROM city_officials
LIMIT 5;
\echo ''

\echo 'Ward Officers Count:'
SELECT COUNT(*) as total_ward_officers FROM ward_officers;
\echo ''

\echo 'Sample Ward Officers:'
SELECT 
  id,
  user_id,
  ward_number,
  city,
  district,
  zone
FROM ward_officers
LIMIT 5;
\echo ''

\echo 'Department Officers Count:'
SELECT COUNT(*) as total_dept_officers FROM departmentofficers;
\echo ''

-- Step 2: Check if hierarchy columns exist (after migration)
-- ============================================================================
\echo '========================================='
\echo 'STEP 2: Check Hierarchy Columns'
\echo '========================================='
\echo ''

\echo 'Checking if new columns exist in city_officials:'
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'city_officials'
  AND column_name IN ('city_id', 'district_id', 'reports_to', 'department_id')
ORDER BY column_name;
\echo ''

\echo 'Checking if new columns exist in ward_officers:'
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ward_officers'
  AND column_name IN ('city_id', 'district_id', 'ward_id', 'reports_to_city_official_id')
ORDER BY column_name;
\echo ''

-- Step 3: Get a sample City Commissioner
-- ============================================================================
\echo '========================================='
\echo 'STEP 3: Sample City Commissioner'
\echo '========================================='
\echo ''

\echo 'Getting first City Commissioner:'
SELECT 
  co.id as city_official_id,
  u.full_name as commissioner_name,
  u.email,
  co.designation,
  co.city,
  co.district,
  co.corporation_name
FROM city_officials co
JOIN users u ON co.user_id = u.id
WHERE co.designation ILIKE '%commissioner%'
LIMIT 1;
\echo ''

-- Step 4: Test Query - Get Ward Officers under City Commissioner
-- ============================================================================
\echo '========================================='
\echo 'STEP 4: Ward Officers Under Commissioner'
\echo '========================================='
\echo ''

\echo 'Query: Get all ward officers under the first city commissioner'
\echo '(This will work AFTER applying the schema changes)'
\echo ''

-- This query will work after schema changes are applied
WITH first_commissioner AS (
  SELECT id, user_id, city, district
  FROM city_officials
  WHERE designation ILIKE '%commissioner%'
  LIMIT 1
)
SELECT 
  fc.city as commissioner_city,
  fc.district as commissioner_district,
  wo.id as ward_officer_id,
  u.full_name as ward_officer_name,
  u.email as ward_officer_email,
  u.phone as ward_officer_phone,
  wo.ward_number,
  wo.zone,
  wo.city as ward_city,
  wo.district as ward_district,
  CASE 
    WHEN wo.reports_to_city_official_id IS NOT NULL THEN 'Linked'
    ELSE 'Not Linked (needs migration)'
  END as hierarchy_status
FROM first_commissioner fc
LEFT JOIN ward_officers wo ON (
  -- After migration, use: wo.reports_to_city_official_id = fc.id
  -- Before migration, match by city name:
  LOWER(TRIM(wo.city)) = LOWER(TRIM(fc.city))
  AND LOWER(TRIM(wo.district)) = LOWER(TRIM(fc.district))
)
LEFT JOIN users u ON wo.user_id = u.id
ORDER BY wo.ward_number;
\echo ''

-- Step 5: Test Query - Using the new view (after migration)
-- ============================================================================
\echo '========================================='
\echo 'STEP 5: Using city_hierarchy_structure View'
\echo '========================================='
\echo ''

\echo 'Query: Get complete hierarchy using the view'
\echo '(This will work AFTER applying the schema changes)'
\echo ''

-- Check if view exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'city_hierarchy_structure'
    ) THEN 'View EXISTS - Running query...'
    ELSE 'View DOES NOT EXIST - Apply schema_fixes_hierarchy.sql first'
  END as view_status;
\echo ''

-- If view exists, query it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'city_hierarchy_structure'
  ) THEN
    RAISE NOTICE 'Querying city_hierarchy_structure view...';
    PERFORM * FROM city_hierarchy_structure LIMIT 10;
  ELSE
    RAISE NOTICE 'View not found. Apply schema changes first.';
  END IF;
END $$;

-- Step 6: Test Query - Get Department Officers under Ward Officers
-- ============================================================================
\echo '========================================='
\echo 'STEP 6: Complete Hierarchy Chain'
\echo '========================================='
\echo ''

\echo 'Query: Commissioner -> Ward Officers -> Department Officers'
\echo ''

WITH first_commissioner AS (
  SELECT id, user_id, city, district
  FROM city_officials
  WHERE designation ILIKE '%commissioner%'
  LIMIT 1
)
SELECT 
  'Commissioner' as level,
  u_co.full_name as name,
  fc.city,
  fc.district,
  NULL as ward_number,
  NULL as department
FROM first_commissioner fc
JOIN users u_co ON fc.user_id = u_co.id

UNION ALL

SELECT 
  'Ward Officer' as level,
  u_wo.full_name as name,
  wo.city,
  wo.district,
  wo.ward_number,
  NULL as department
FROM first_commissioner fc
JOIN ward_officers wo ON (
  LOWER(TRIM(wo.city)) = LOWER(TRIM(fc.city))
  AND LOWER(TRIM(wo.district)) = LOWER(TRIM(fc.district))
)
JOIN users u_wo ON wo.user_id = u_wo.id

UNION ALL

SELECT 
  'Dept Officer' as level,
  u_do.full_name as name,
  do_tbl.zone as city,
  NULL as district,
  do_tbl.ward as ward_number,
  d.name as department
FROM first_commissioner fc
JOIN ward_officers wo ON (
  LOWER(TRIM(wo.city)) = LOWER(TRIM(fc.city))
  AND LOWER(TRIM(wo.district)) = LOWER(TRIM(fc.district))
)
JOIN departmentofficers do_tbl ON (
  do_tbl.ward = wo.ward_number
)
JOIN users u_do ON do_tbl.user_id = u_do.id
LEFT JOIN departments d ON do_tbl.department_id = d.id

ORDER BY 
  CASE level
    WHEN 'Commissioner' THEN 1
    WHEN 'Ward Officer' THEN 2
    WHEN 'Dept Officer' THEN 3
  END,
  ward_number,
  name;

-- Step 7: Generate Migration Report
-- ============================================================================
\echo ''
\echo '========================================='
\echo 'STEP 7: Migration Status Report'
\echo '========================================='
\echo ''

-- Check if function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'generate_hierarchy_report'
    ) THEN 'Function EXISTS - Running report...'
    ELSE 'Function DOES NOT EXIST - Apply schema_fixes_hierarchy.sql first'
  END as function_status;
\echo ''

-- If function exists, run it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'generate_hierarchy_report'
  ) THEN
    RAISE NOTICE 'Running hierarchy report...';
  ELSE
    RAISE NOTICE 'Function not found. Apply schema changes first.';
  END IF;
END $$;

-- Step 8: Summary and Next Steps
-- ============================================================================
\echo ''
\echo '========================================='
\echo 'SUMMARY & NEXT STEPS'
\echo '========================================='
\echo ''
\echo 'If you see "DOES NOT EXIST" messages above:'
\echo '  1. Apply: psql -f schema_fixes_hierarchy.sql'
\echo '  2. Apply: psql -f data_migration_hierarchy.sql'
\echo '  3. Run this script again'
\echo ''
\echo 'If everything exists:'
\echo '  1. Check the hierarchy_status column'
\echo '  2. If "Not Linked", run data migration'
\echo '  3. Use the views and functions for queries'
\echo ''
\echo '========================================='

-- ============================================================================
-- END OF TEST SCRIPT
-- ============================================================================
