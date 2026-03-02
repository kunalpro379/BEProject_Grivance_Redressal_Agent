-- ============================================================================
-- ROLLBACK SCRIPT: Hierarchy Changes
-- ============================================================================
-- This script removes all hierarchy-related changes if needed
-- WARNING: This will drop the new columns and relationships
-- ============================================================================

-- Step 1: Drop functions
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_subordinates(uuid);
DROP FUNCTION IF EXISTS public.get_reporting_chain(uuid);
DROP FUNCTION IF EXISTS public.create_hierarchical_structure(varchar, varchar, varchar, varchar, varchar);
DROP FUNCTION IF EXISTS public.generate_hierarchy_report();

-- Step 2: Drop views
-- ============================================================================
DROP VIEW IF EXISTS public.unified_official_hierarchy;
DROP VIEW IF EXISTS public.city_hierarchy_structure;
DROP VIEW IF EXISTS public.ward_officers_missing_supervisor;
DROP VIEW IF EXISTS public.dept_officers_missing_supervisor;
DROP VIEW IF EXISTS public.city_officials_missing_fk;

-- Step 3: Drop indexes
-- ============================================================================
DROP INDEX IF EXISTS public.idx_city_officials_city_id;
DROP INDEX IF EXISTS public.idx_city_officials_district_id;
DROP INDEX IF EXISTS public.idx_city_officials_reports_to;

DROP INDEX IF EXISTS public.idx_ward_officers_city_id;
DROP INDEX IF EXISTS public.idx_ward_officers_ward_id;
DROP INDEX IF EXISTS public.idx_ward_officers_reports_to_city_official;

DROP INDEX IF EXISTS public.idx_departmentofficers_city_id;
DROP INDEX IF EXISTS public.idx_departmentofficers_ward_id;
DROP INDEX IF EXISTS public.idx_departmentofficers_reports_to_city;
DROP INDEX IF EXISTS public.idx_departmentofficers_reports_to_ward;

-- Step 4: Drop constraints from departmentofficers
-- ============================================================================
ALTER TABLE public.departmentofficers
DROP CONSTRAINT IF EXISTS departmentofficers_city_id_fkey,
DROP CONSTRAINT IF EXISTS departmentofficers_ward_id_fkey,
DROP CONSTRAINT IF EXISTS departmentofficers_reports_to_city_official_fkey,
DROP CONSTRAINT IF EXISTS departmentofficers_reports_to_ward_officer_fkey;

-- Step 5: Drop columns from departmentofficers
-- ============================================================================
ALTER TABLE public.departmentofficers
DROP COLUMN IF EXISTS city_id,
DROP COLUMN IF EXISTS ward_id,
DROP COLUMN IF EXISTS reports_to_city_official_id,
DROP COLUMN IF EXISTS reports_to_ward_officer_id;

-- Step 6: Drop constraints from ward_officers
-- ============================================================================
ALTER TABLE public.ward_officers
DROP CONSTRAINT IF EXISTS ward_officers_city_id_fkey,
DROP CONSTRAINT IF EXISTS ward_officers_district_id_fkey,
DROP CONSTRAINT IF EXISTS ward_officers_ward_id_fkey,
DROP CONSTRAINT IF EXISTS ward_officers_reports_to_city_official_fkey,
DROP CONSTRAINT IF EXISTS ward_officers_reporting_to_check;

-- Step 7: Drop columns from ward_officers
-- ============================================================================
ALTER TABLE public.ward_officers
DROP COLUMN IF EXISTS city_id,
DROP COLUMN IF EXISTS district_id,
DROP COLUMN IF EXISTS ward_id,
DROP COLUMN IF EXISTS reports_to_city_official_id;

-- Step 8: Drop constraints from city_officials
-- ============================================================================
ALTER TABLE public.city_officials
DROP CONSTRAINT IF EXISTS city_officials_city_id_fkey,
DROP CONSTRAINT IF EXISTS city_officials_district_id_fkey,
DROP CONSTRAINT IF EXISTS city_officials_reports_to_fkey,
DROP CONSTRAINT IF EXISTS city_officials_department_id_fkey;

-- Step 9: Drop columns from city_officials
-- ============================================================================
ALTER TABLE public.city_officials
DROP COLUMN IF EXISTS city_id,
DROP COLUMN IF EXISTS district_id,
DROP COLUMN IF EXISTS reports_to,
DROP COLUMN IF EXISTS department_id;

-- Step 10: Verification
-- ============================================================================
-- Check that columns are removed
SELECT 
  'city_officials' as table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'city_officials'
  AND column_name IN ('city_id', 'district_id', 'reports_to', 'department_id')

UNION ALL

SELECT 
  'ward_officers' as table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ward_officers'
  AND column_name IN ('city_id', 'district_id', 'ward_id', 'reports_to_city_official_id')

UNION ALL

SELECT 
  'departmentofficers' as table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'departmentofficers'
  AND column_name IN ('city_id', 'ward_id', 'reports_to_city_official_id', 'reports_to_ward_officer_id');

-- If the above query returns no rows, rollback was successful

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
