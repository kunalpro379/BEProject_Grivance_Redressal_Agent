-- Migration to separate citizens from users table
-- Users table will only contain officials (admin, officers, heads)
-- Citizens table will contain all citizens (web + telegram)

-- First, add necessary columns to Citizens table for web registration
ALTER TABLE "Citizens" 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_citizens_email ON "Citizens"(email);
CREATE INDEX IF NOT EXISTS idx_citizens_phone ON "Citizens"(phone);

-- Migrate existing citizen users from Users to Citizens
INSERT INTO "Citizens" (
  id, email, password_hash, full_name, phone, address, 
  email_verified, last_login, profile_image, 
  is_registered, is_active, created_at, updated_at
)
SELECT 
  id, email, password_hash, full_name, phone, address,
  email_verified, last_login, profile_image,
  true, true, created_at, updated_at
FROM "Users"
WHERE role = 'citizen'
ON CONFLICT (id) DO NOTHING;

-- Delete citizen users from Users table
DELETE FROM "Users" WHERE role = 'citizen';

-- Update user_role enum to remove citizen
-- Note: This will be handled by application logic, not altering the enum

-- Add comment to document the change
COMMENT ON TABLE "Users" IS 'Contains only officials: admin, department_officer, department_head';
COMMENT ON TABLE "Citizens" IS 'Contains all citizens: web registered and telegram users';
