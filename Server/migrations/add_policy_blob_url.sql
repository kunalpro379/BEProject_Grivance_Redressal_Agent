-- Add policy_blob_url column to departments table
-- This stores the Azure Blob Storage URL for the comprehensive policy README

ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS policy_blob_url TEXT;

ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS policies_updated_at TIMESTAMP;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_departments_policy_blob_url ON departments(policy_blob_url);

-- Add comment
COMMENT ON COLUMN departments.policy_blob_url IS 'Azure Blob Storage URL for comprehensive policy README document';
COMMENT ON COLUMN departments.policies_updated_at IS 'Timestamp when policies were last updated';
