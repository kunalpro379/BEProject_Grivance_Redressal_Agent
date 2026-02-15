-- Add additional fields for officials
ALTER TABLE "Users" 
ADD COLUMN IF NOT EXISTS department_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS designation VARCHAR(255),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS official_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS ward VARCHAR(100),
ADD COLUMN IF NOT EXISTS district VARCHAR(100),
ADD COLUMN IF NOT EXISTS admin_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS admin_passkey_hash VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_department_name ON "Users"(department_name);
CREATE INDEX IF NOT EXISTS idx_users_district ON "Users"(district);
CREATE INDEX IF NOT EXISTS idx_users_admin_id ON "Users"(admin_id);
