-- Migration script to restructure existing data
-- Run this AFTER creating the new schema

-- Step 1: Create Citizens from existing UserGrievance data (if any exists)
-- This is a one-time migration for existing data
INSERT INTO "Citizens" (telegram_id, phone, username, full_name, is_registered)
SELECT DISTINCT 
  COALESCE((full_result->>'telegram_id')::bigint, floor(random() * 9000000000 + 1000000000)::bigint) as telegram_id,
  COALESCE(phone, 'UNKNOWN'),
  email,
  full_name,
  true
FROM "Users"
WHERE role = 'citizen'
ON CONFLICT (telegram_id) DO NOTHING;

-- Step 2: Backup existing UserGrievance to a temp table (optional)
CREATE TABLE IF NOT EXISTS "UserGrievance_backup" AS 
SELECT * FROM "UserGrievance";

-- Step 3: Drop old UserGrievance table
DROP TABLE IF EXISTS "UserGrievance" CASCADE;

-- Step 4: Recreate tables with new schema (already done in DB.sql)
-- Now run the DB.sql script to create the new structure
