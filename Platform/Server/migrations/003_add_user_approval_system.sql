-- Migration: Add User Approval System
-- Adds approval workflow for government officials and department officers

BEGIN;

-- Step 1: Create approval_status enum
DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add approval fields to Users table
ALTER TABLE "Users" 
ADD COLUMN IF NOT EXISTS approval_status approval_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES "Users"(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Step 3: Auto-approve existing users (they're already in the system)
UPDATE "Users" 
SET approval_status = 'approved', 
    approved_at = NOW()
WHERE approval_status = 'pending';

-- Step 4: Auto-approve citizens (users linked to Citizens table)
UPDATE "Users" u
SET approval_status = 'approved',
    approved_at = NOW()
FROM "Citizens" c
WHERE c.user_id = u.id 
AND u.approval_status = 'pending';

-- Step 5: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON "Users"(approval_status);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON "Users"(role, approval_status);

-- Step 6: Update register_citizen function to auto-approve citizen users
CREATE OR REPLACE FUNCTION register_citizen(
    p_telegram_id bigint,
    p_phone varchar(20),
    p_username varchar(255) DEFAULT NULL,
    p_full_name varchar(255) DEFAULT NULL,
    p_latitude decimal(10, 8) DEFAULT NULL,
    p_longitude decimal(11, 8) DEFAULT NULL,
    p_location_address text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_citizen_id uuid;
    v_user_id uuid;
BEGIN
    -- Check if citizen already exists
    SELECT id, user_id INTO v_citizen_id, v_user_id
    FROM "Citizens"
    WHERE telegram_id = p_telegram_id;
    
    IF v_citizen_id IS NOT NULL THEN
        -- Update existing citizen
        UPDATE "Citizens"
        SET phone = p_phone,
            username = p_username,
            full_name = p_full_name,
            latitude = p_latitude,
            longitude = p_longitude,
            location_address = p_location_address,
            is_registered = true,
            updated_at = NOW()
        WHERE id = v_citizen_id;
        
        RETURN v_citizen_id;
    END IF;
    
    -- Create new citizen
    INSERT INTO "Citizens" (
        telegram_id, phone, username, full_name,
        latitude, longitude, location_address,
        is_registered, is_active
    ) VALUES (
        p_telegram_id, p_phone, p_username, p_full_name,
        p_latitude, p_longitude, p_location_address,
        true, true
    )
    RETURNING id INTO v_citizen_id;
    
    -- Create linked user account (auto-approved for citizens)
    INSERT INTO "Users" (
        email,
        password_hash,
        full_name,
        phone,
        role,
        status,
        email_verified,
        approval_status,
        approved_at
    ) VALUES (
        'telegram_' || p_telegram_id || '@citizen.local',
        '$2b$10$defaultHashForTelegramUsers',
        COALESCE(p_full_name, 'Telegram User'),
        p_phone,
        'citizen',
        'active',
        true,
        'approved',  -- Auto-approve citizens
        NOW()
    )
    RETURNING id INTO v_user_id;
    
    -- Link user to citizen
    UPDATE "Citizens" SET user_id = v_user_id WHERE id = v_citizen_id;
    
    RETURN v_citizen_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Add helpful comments
COMMENT ON COLUMN "Users".approval_status IS 'Approval status: pending (waiting), approved (can login), rejected (denied)';
COMMENT ON COLUMN "Users".approved_by IS 'Admin user who approved/rejected this user';
COMMENT ON COLUMN "Users".approved_at IS 'Timestamp when user was approved';
COMMENT ON COLUMN "Users".rejection_reason IS 'Reason for rejection (if rejected)';
