-- Quick script to add contractor_report_id column
-- Run this in your database client (pgAdmin, psql, etc.)

-- Step 1: Add the column
ALTER TABLE contractors 
ADD COLUMN IF NOT EXISTS contractor_report_id UUID;

-- Step 2: Add foreign key constraint (only if contractor_reports table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contractor_reports') THEN
        ALTER TABLE contractors 
        ADD CONSTRAINT contractors_contractor_report_id_fkey 
        FOREIGN KEY (contractor_report_id) 
        REFERENCES contractor_reports(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Step 3: Create index
CREATE INDEX IF NOT EXISTS idx_contractors_contractor_report_id 
ON contractors(contractor_report_id);

-- Step 4: Link latest reports to contractors (optional)
UPDATE contractors c
SET contractor_report_id = (
  SELECT cr.id 
  FROM contractor_reports cr 
  WHERE cr.contractor_id = c.id 
  ORDER BY cr.created_at DESC 
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM contractor_reports cr2 
  WHERE cr2.contractor_id = c.id
);

-- Verify the changes
SELECT 
  COUNT(*) as total_contractors,
  COUNT(contractor_report_id) as contractors_with_linked_reports
FROM contractors;

SELECT 'Migration completed successfully!' as status;
