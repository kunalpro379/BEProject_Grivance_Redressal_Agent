-- Add contractor_report_id column to contractors table
-- This allows linking a specific report to display on the contractor card

-- Add the column
ALTER TABLE contractors 
ADD COLUMN IF NOT EXISTS contractor_report_id UUID REFERENCES contractor_reports(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_contractors_report_id 
ON contractors(contractor_report_id);

-- Example: Link the latest report for each contractor
-- UPDATE contractors c
-- SET contractor_report_id = (
--   SELECT cr.id 
--   FROM contractor_reports cr 
--   WHERE cr.contractor_id = c.id 
--   ORDER BY cr.created_at DESC 
--   LIMIT 1
-- );

COMMENT ON COLUMN contractors.contractor_report_id IS 'Reference to the featured/primary report to display on contractor card';
