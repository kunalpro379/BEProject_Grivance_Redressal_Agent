-- Create database if it doesn't exist
SELECT 'CREATE DATABASE grievance_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'grievance_db')\gexec

-- Connect to the database
\c grievance_db

-- Verify connection
SELECT 'Connected to: ' || current_database() as status;
