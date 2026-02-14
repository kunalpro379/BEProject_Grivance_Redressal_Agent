-- Enable pgvector if not already enabled (skip if not available)
-- CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'citizen', 'department_officer', 'department_head');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User status enum
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Grievance status enum
DO $$ BEGIN
    CREATE TYPE grievance_status AS ENUM ('pending', 'in_progress', 'resolved', 'rejected', 'escalated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Departments table
CREATE TABLE IF NOT EXISTS "Departments" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  name varchar(255) NOT NULL UNIQUE,
  description text,
  contact_email varchar(255),
  contact_phone varchar(20),
  is_active boolean DEFAULT true
);

-- Users table (for all user types)
CREATE TABLE IF NOT EXISTS "Users" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  email varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  full_name varchar(255) NOT NULL,
  phone varchar(20),
  role user_role NOT NULL DEFAULT 'citizen',
  status user_status NOT NULL DEFAULT 'active',
  
  department_id uuid REFERENCES "Departments"(id) ON DELETE SET NULL,
  profile_image text,
  address text,
  
  last_login timestamptz,
  email_verified boolean DEFAULT false,
  verification_token text,
  reset_token text,
  reset_token_expiry timestamptz
);

-- Create indexes for Users
CREATE INDEX IF NOT EXISTS idx_users_email ON "Users"(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON "Users"(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON "Users"(department_id);

-- Refresh tokens table for JWT
CREATE TABLE IF NOT EXISTS "RefreshTokens" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  revoked boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON "RefreshTokens"(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON "RefreshTokens"(token);

-- Citizens table for Telegram bot registration
CREATE TABLE IF NOT EXISTS "Citizens" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  telegram_id bigint UNIQUE NOT NULL,
  phone varchar(20) NOT NULL,
  username varchar(255),
  full_name varchar(255),
  
  -- Location coordinates
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  location_address text,
  
  is_registered boolean DEFAULT false,
  is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_citizens_telegram ON "Citizens"(telegram_id);
CREATE INDEX IF NOT EXISTS idx_citizens_phone ON "Citizens"(phone);

-- UserGrivience table (original - basic grievance submission from Telegram)
CREATE TABLE IF NOT EXISTS "UserGrivience" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  citizen_id uuid NOT NULL REFERENCES "Citizens"(id) ON DELETE CASCADE,
  
  grievance_text text NOT NULL,
  image_path text,
  image_description text,
  enhanced_query text,
  
  embedding text
  -- embedding vector(384)  -- Commented out until pgvector is installed
);

CREATE INDEX IF NOT EXISTS idx_grivience_citizen ON "UserGrivience"(citizen_id);
CREATE INDEX IF NOT EXISTS idx_grivience_created ON "UserGrivience"(created_at);

-- UserGrievance table (extended - AI processing and department assignment)
CREATE TABLE IF NOT EXISTS "UserGrievance" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Reference to original grievance
  grivience_id uuid NOT NULL REFERENCES "UserGrivience"(id) ON DELETE CASCADE,
  citizen_id uuid NOT NULL REFERENCES "Citizens"(id) ON DELETE CASCADE,
  
  assigned_officer_id uuid REFERENCES "Users"(id) ON DELETE SET NULL,
  department_id uuid REFERENCES "Departments"(id) ON DELETE SET NULL,
  
  status grievance_status DEFAULT 'pending',
  priority varchar(20) DEFAULT 'medium',
  
  -- AI Analysis results
  query_type jsonb,
  category jsonb,
  similar_cases_summary text,
  sentiment_priority jsonb,
  emotion jsonb,
  severity jsonb,
  patterns jsonb,
  fraud jsonb,
  department jsonb,
  policy_search jsonb,
  past_queries_summary text,
  
  full_result jsonb,
  
  resolution_text text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES "Users"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_grievance_grivience ON "UserGrievance"(grivience_id);
CREATE INDEX IF NOT EXISTS idx_grievance_citizen ON "UserGrievance"(citizen_id);
CREATE INDEX IF NOT EXISTS idx_grievance_officer ON "UserGrievance"(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_grievance_department ON "UserGrievance"(department_id);
CREATE INDEX IF NOT EXISTS idx_grievance_status ON "UserGrievance"(status);

-- Grievance comments/updates table
CREATE TABLE IF NOT EXISTS "GrievanceComments" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  grievance_id uuid NOT NULL REFERENCES "UserGrievance"(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  comment text NOT NULL,
  is_internal boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_comments_grievance ON "GrievanceComments"(grievance_id);

-- Audit log table
CREATE TABLE IF NOT EXISTS "AuditLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  user_id uuid REFERENCES "Users"(id) ON DELETE SET NULL,
  action varchar(100) NOT NULL,
  entity_type varchar(50),
  entity_id uuid,
  details jsonb,
  ip_address varchar(45)
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON "AuditLog"(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON "AuditLog"(created_at);

-- Insert default admin user (password: Admin@123)
INSERT INTO "Users" (email, password_hash, full_name, role, status, email_verified)
VALUES (
  'admin@igrs.gov.in',
  '$2b$10$YourHashedPasswordHere',
  'System Administrator',
  'admin',
  'active',
  true
) ON CONFLICT (email) DO NOTHING;

-- Insert sample departments
INSERT INTO "Departments" (name, description, contact_email) VALUES
  ('Public Works', 'Roads, bridges, and infrastructure', 'pwd@igrs.gov.in'),
  ('Water Supply', 'Water supply and sanitation', 'water@igrs.gov.in'),
  ('Electricity', 'Power supply and distribution', 'electricity@igrs.gov.in'),
  ('Health', 'Public health services', 'health@igrs.gov.in'),
  ('Education', 'Educational institutions', 'education@igrs.gov.in')
ON CONFLICT (name) DO NOTHING;