-- Migration: 002_seed_data
-- Description: Seed initial data (departments and admin user)
-- Created: 2024-02-14

-- Insert sample departments
INSERT INTO "Departments" (name, description, contact_email) VALUES
  ('Public Works', 'Roads, bridges, and infrastructure', 'pwd@igrs.gov.in'),
  ('Water Supply', 'Water supply and sanitation', 'water@igrs.gov.in'),
  ('Electricity', 'Power supply and distribution', 'electricity@igrs.gov.in'),
  ('Health', 'Public health services', 'health@igrs.gov.in'),
  ('Education', 'Educational institutions', 'education@igrs.gov.in'),
  ('Sanitation', 'Waste management and cleanliness', 'sanitation@igrs.gov.in'),
  ('Transport', 'Public transportation services', 'transport@igrs.gov.in'),
  ('Police', 'Law and order', 'police@igrs.gov.in')
ON CONFLICT (name) DO NOTHING;

-- Note: Admin user will be created by the migration script with hashed password

-- Record this migration
INSERT INTO "Migrations" (migration_name) 
VALUES ('002_seed_data') 
ON CONFLICT (migration_name) DO NOTHING;
