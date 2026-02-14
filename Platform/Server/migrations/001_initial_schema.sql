-- Migration: 001_initial_schema
-- Description: Initial database schema with authentication and grievance system
-- Created: 2024-02-14

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'citizen', 'department_officer', 'department_head');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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

-- Users table
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

-- Refresh tokens table
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

-- UserGrievance table
CREATE TABLE IF NOT EXISTS "UserGrievance" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  user_id uuid NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  assigned_officer_id uuid REFERENCES "Users"(id) ON DELETE SET NULL,
  department_id uuid REFERENCES "Departments"(id) ON DELETE SET NULL,
  
  grievance_text text NOT NULL,
  image_path text,
  image_description text,
  enhanced_query text,
  
  status grievance_status DEFAULT 'pending',
  priority varchar(20) DEFAULT 'medium',
  
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
  
  embedding vector(384),
  full_result jsonb,
  
  resolution_text text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES "Users"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_grievance_user ON "UserGrievance"(user_id);
CREATE INDEX IF NOT EXISTS idx_grievance_officer ON "UserGrievance"(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_grievance_department ON "UserGrievance"(department_id);
CREATE INDEX IF NOT EXISTS idx_grievance_status ON "UserGrievance"(status);

-- Grievance comments table
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

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS "Migrations" (
  id serial PRIMARY KEY,
  migration_name varchar(255) NOT NULL UNIQUE,
  executed_at timestamptz DEFAULT now()
);

-- Record this migration
INSERT INTO "Migrations" (migration_name) 
VALUES ('001_initial_schema') 
ON CONFLICT (migration_name) DO NOTHING;
