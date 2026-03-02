-- Drop the existing foreign key constraint
ALTER TABLE grievancecomments DROP CONSTRAINT IF EXISTS grievancecomments_user_id_fkey;

-- The user_id column can now reference either users or citizens table
-- We'll handle this at the application level
