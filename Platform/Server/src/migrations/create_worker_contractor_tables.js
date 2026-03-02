import pool from '../config/database.js';

async function createWorkerContractorTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('Creating field worker and contractor tables...');

    // Daily Reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        description TEXT NOT NULL,
        site TEXT NOT NULL,
        hours INTEGER CHECK (hours >= 1 AND hours <= 24),
        blockers TEXT,
        proof_urls TEXT[],
        proof_verified BOOLEAN DEFAULT false,
        productivity_score FLOAT CHECK (productivity_score >= 0 AND productivity_score <= 10),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, date)
      );
    `);

    // Field Worker States table (for conversation state)
    await client.query(`
      CREATE TABLE IF NOT EXISTS field_worker_states (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        state_data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, date)
      );
    `);

    // Contractors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS contractors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(50) UNIQUE NOT NULL,
        company_name TEXT NOT NULL,
        license_number TEXT NOT NULL,
        gst TEXT,
        category TEXT NOT NULL,
        verification_status TEXT DEFAULT 'pending' 
          CHECK (verification_status IN ('collecting', 'pending_review', 'verified', 'rejected')),
        document_urls TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Contractor States table (for conversation state)
    await client.query(`
      CREATE TABLE IF NOT EXISTS contractor_states (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) UNIQUE NOT NULL,
        state_data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date 
      ON daily_reports(user_id, date DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_reports_date 
      ON daily_reports(date DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contractors_status 
      ON contractors(verification_status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contractors_user 
      ON contractors(user_id);
    `);

    // Update users table to support field_worker and contractor roles
    await client.query(`
      DO $$ 
      BEGIN
        -- Drop existing constraint if it exists
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        
        -- Add new constraint with field_worker and contractor
        ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'citizen', 'department', 'field_worker', 'contractor'));
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Add is_active column if not exists
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'is_active'
        ) THEN
          ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
      END $$;
    `);

    await client.query('COMMIT');
    console.log('✅ Worker and contractor tables created successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating worker/contractor tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default createWorkerContractorTables;
