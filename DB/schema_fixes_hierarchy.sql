-- ============================================================================
-- SCHEMA FIXES: Proper Hierarchical Structure
-- ============================================================================
-- This migration consolidates the hierarchy using government_officials table
-- and adds proper relationships between City Officials, Ward Officers, and 
-- Department Officers
-- ============================================================================

-- Step 1: Add proper foreign keys to city_officials table
-- ============================================================================
ALTER TABLE public.city_officials
ADD COLUMN city_id uuid,
ADD COLUMN district_id uuid,
ADD COLUMN reports_to uuid,
ADD COLUMN department_id uuid;

-- Add foreign key constraints
ALTER TABLE public.city_officials
ADD CONSTRAINT city_officials_city_id_fkey 
  FOREIGN KEY (city_id) REFERENCES public.cities(id),
ADD CONSTRAINT city_officials_district_id_fkey 
  FOREIGN KEY (district_id) REFERENCES public.districts(id),
ADD CONSTRAINT city_officials_reports_to_fkey 
  FOREIGN KEY (reports_to) REFERENCES public.government_officials(id),
ADD CONSTRAINT city_officials_department_id_fkey 
  FOREIGN KEY (department_id) REFERENCES public.departments(id);

-- Create index for better query performance
CREATE INDEX idx_city_officials_city_id ON public.city_officials(city_id);
CREATE INDEX idx_city_officials_district_id ON public.city_officials(district_id);
CREATE INDEX idx_city_officials_reports_to ON public.city_officials(reports_to);

-- Step 2: Modify ward_officers to link properly to city_officials
-- ============================================================================
ALTER TABLE public.ward_officers
ADD COLUMN city_id uuid,
ADD COLUMN district_id uuid,
ADD COLUMN ward_id uuid,
ADD COLUMN reports_to_city_official_id uuid;

-- Add foreign key constraints
ALTER TABLE public.ward_officers
ADD CONSTRAINT ward_officers_city_id_fkey 
  FOREIGN KEY (city_id) REFERENCES public.cities(id),
ADD CONSTRAINT ward_officers_district_id_fkey 
  FOREIGN KEY (district_id) REFERENCES public.districts(id),
ADD CONSTRAINT ward_officers_ward_id_fkey 
  FOREIGN KEY (ward_id) REFERENCES public.wards(id),
ADD CONSTRAINT ward_officers_reports_to_city_official_fkey 
  FOREIGN KEY (reports_to_city_official_id) REFERENCES public.city_officials(id);

-- Modify existing reporting_to to be more specific (optional - keep for backward compatibility)
ALTER TABLE public.ward_officers
ADD CONSTRAINT ward_officers_reporting_to_check 
  CHECK (reporting_to IS NULL OR reports_to_city_official_id IS NOT NULL);

-- Create indexes
CREATE INDEX idx_ward_officers_city_id ON public.ward_officers(city_id);
CREATE INDEX idx_ward_officers_ward_id ON public.ward_officers(ward_id);
CREATE INDEX idx_ward_officers_reports_to_city_official ON public.ward_officers(reports_to_city_official_id);

-- Step 3: Modify departmentofficers to link to city_officials
-- ============================================================================
ALTER TABLE public.departmentofficers
ADD COLUMN city_id uuid,
ADD COLUMN ward_id uuid,
ADD COLUMN reports_to_city_official_id uuid,
ADD COLUMN reports_to_ward_officer_id uuid;

-- Add foreign key constraints
ALTER TABLE public.departmentofficers
ADD CONSTRAINT departmentofficers_city_id_fkey 
  FOREIGN KEY (city_id) REFERENCES public.cities(id),
ADD CONSTRAINT departmentofficers_ward_id_fkey 
  FOREIGN KEY (ward_id) REFERENCES public.wards(id),
ADD CONSTRAINT departmentofficers_reports_to_city_official_fkey 
  FOREIGN KEY (reports_to_city_official_id) REFERENCES public.city_officials(id),
ADD CONSTRAINT departmentofficers_reports_to_ward_officer_fkey 
  FOREIGN KEY (reports_to_ward_officer_id) REFERENCES public.ward_officers(id);

-- Create indexes
CREATE INDEX idx_departmentofficers_city_id ON public.departmentofficers(city_id);
CREATE INDEX idx_departmentofficers_ward_id ON public.departmentofficers(ward_id);
CREATE INDEX idx_departmentofficers_reports_to_city ON public.departmentofficers(reports_to_city_official_id);
CREATE INDEX idx_departmentofficers_reports_to_ward ON public.departmentofficers(reports_to_ward_officer_id);

-- Step 4: Create a unified hierarchy view for easy querying
-- ============================================================================
CREATE OR REPLACE VIEW public.unified_official_hierarchy AS
WITH RECURSIVE hierarchy AS (
  -- Base case: Top-level officials (City Commissioners, District Officials, etc.)
  SELECT 
    go.id,
    go.user_id,
    go.employee_code,
    go.designation,
    go.department_id,
    go.city_id,
    go.ward_id,
    go.district_id,
    go.reports_to,
    u.full_name,
    u.email,
    gr.role_name,
    gr.role_level,
    1 as hierarchy_level,
    ARRAY[go.id] as hierarchy_path,
    CAST(go.designation AS text) as hierarchy_chain
  FROM public.government_officials go
  JOIN public.users u ON go.user_id = u.id
  JOIN public.government_roles gr ON go.role_id = gr.id
  WHERE go.reports_to IS NULL
  
  UNION ALL
  
  -- Recursive case: Officials reporting to others
  SELECT 
    go.id,
    go.user_id,
    go.employee_code,
    go.designation,
    go.department_id,
    go.city_id,
    go.ward_id,
    go.district_id,
    go.reports_to,
    u.full_name,
    u.email,
    gr.role_name,
    gr.role_level,
    h.hierarchy_level + 1,
    h.hierarchy_path || go.id,
    h.hierarchy_chain || ' > ' || CAST(go.designation AS text)
  FROM public.government_officials go
  JOIN public.users u ON go.user_id = u.id
  JOIN public.government_roles gr ON go.role_id = gr.id
  JOIN hierarchy h ON go.reports_to = h.id
  WHERE NOT go.id = ANY(h.hierarchy_path) -- Prevent circular references
)
SELECT * FROM hierarchy;

-- Step 5: Create helper view for City Commissioner -> Ward Officers -> Department Officers
-- ============================================================================
CREATE OR REPLACE VIEW public.city_hierarchy_structure AS
SELECT 
  -- City Official (Commissioner) Info
  co.id as city_official_id,
  u_co.full_name as city_official_name,
  co.designation as city_official_designation,
  co.city,
  co.district,
  co.corporation_name,
  
  -- Ward Officer Info
  wo.id as ward_officer_id,
  u_wo.full_name as ward_officer_name,
  wo.ward_number,
  wo.zone,
  
  -- Department Officer Info
  do_tbl.id as dept_officer_id,
  u_do.full_name as dept_officer_name,
  do_tbl.staff_id,
  do_tbl.role as dept_officer_role,
  d.name as department_name,
  do_tbl.specialization,
  do_tbl.status as dept_officer_status,
  do_tbl.workload
  
FROM public.city_officials co
JOIN public.users u_co ON co.user_id = u_co.id

LEFT JOIN public.ward_officers wo ON wo.reports_to_city_official_id = co.id
LEFT JOIN public.users u_wo ON wo.user_id = u_wo.id

LEFT JOIN public.departmentofficers do_tbl ON (
  do_tbl.reports_to_city_official_id = co.id 
  OR do_tbl.reports_to_ward_officer_id = wo.id
)
LEFT JOIN public.users u_do ON do_tbl.user_id = u_do.id
LEFT JOIN public.departments d ON do_tbl.department_id = d.id

WHERE co.user_id IS NOT NULL
ORDER BY co.city, wo.ward_number, d.name;

-- Step 6: Create function to get all subordinates of an official
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_subordinates(official_id uuid)
RETURNS TABLE (
  subordinate_id uuid,
  subordinate_name varchar,
  subordinate_designation varchar,
  subordinate_level varchar,
  hierarchy_depth int
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subordinates AS (
    -- Direct reports
    SELECT 
      go.id,
      u.full_name,
      go.designation,
      gr.role_level,
      1 as depth
    FROM public.government_officials go
    JOIN public.users u ON go.user_id = u.id
    JOIN public.government_roles gr ON go.role_id = gr.id
    WHERE go.reports_to = official_id
    
    UNION ALL
    
    -- Indirect reports
    SELECT 
      go.id,
      u.full_name,
      go.designation,
      gr.role_level,
      s.depth + 1
    FROM public.government_officials go
    JOIN public.users u ON go.user_id = u.id
    JOIN public.government_roles gr ON go.role_id = gr.id
    JOIN subordinates s ON go.reports_to = s.id
  )
  SELECT * FROM subordinates;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to get reporting chain
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_reporting_chain(official_id uuid)
RETURNS TABLE (
  superior_id uuid,
  superior_name varchar,
  superior_designation varchar,
  superior_level varchar,
  chain_position int
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE chain AS (
    -- Starting official
    SELECT 
      go.id,
      u.full_name,
      go.designation,
      gr.role_level,
      go.reports_to,
      0 as position
    FROM public.government_officials go
    JOIN public.users u ON go.user_id = u.id
    JOIN public.government_roles gr ON go.role_id = gr.id
    WHERE go.id = official_id
    
    UNION ALL
    
    -- Superiors up the chain
    SELECT 
      go.id,
      u.full_name,
      go.designation,
      gr.role_level,
      go.reports_to,
      c.position + 1
    FROM public.government_officials go
    JOIN public.users u ON go.user_id = u.id
    JOIN public.government_roles gr ON go.role_id = gr.id
    JOIN chain c ON go.id = c.reports_to
  )
  SELECT id, full_name, designation, role_level, position 
  FROM chain 
  WHERE position > 0
  ORDER BY position;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Add comments for documentation
-- ============================================================================
COMMENT ON COLUMN public.city_officials.city_id IS 'Foreign key to cities table for proper hierarchical linking';
COMMENT ON COLUMN public.city_officials.reports_to IS 'References government_officials table for reporting structure';
COMMENT ON COLUMN public.ward_officers.reports_to_city_official_id IS 'Ward officers report to city officials (commissioners)';
COMMENT ON COLUMN public.departmentofficers.reports_to_city_official_id IS 'Department officers can report directly to city officials';
COMMENT ON COLUMN public.departmentofficers.reports_to_ward_officer_id IS 'Department officers can report to ward officers';

COMMENT ON VIEW public.unified_official_hierarchy IS 'Recursive view showing complete official hierarchy with levels and chains';
COMMENT ON VIEW public.city_hierarchy_structure IS 'Flattened view showing City Commissioner -> Ward Officers -> Department Officers structure';

COMMENT ON FUNCTION public.get_subordinates IS 'Returns all direct and indirect subordinates of a given official';
COMMENT ON FUNCTION public.get_reporting_chain IS 'Returns the complete reporting chain from an official up to top management';

-- ============================================================================
-- END OF SCHEMA FIXES
-- ============================================================================
