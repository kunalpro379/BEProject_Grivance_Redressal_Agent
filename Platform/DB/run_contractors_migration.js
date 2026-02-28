import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from Server directory
dotenv.config({ path: join(__dirname, '../Server/.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting contractors migration...\n');
    
    // Read the SQL file
    const sqlFile = readFileSync(join(__dirname, 'add_ai_analysis_contractors.sql'), 'utf8');
    
    // Execute the migration
    await client.query(sqlFile);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify the results
    const result = await client.query(`
      SELECT 
        contractor_id,
        company_name,
        performance_score,
        active_projects,
        completed_projects,
        ai_analysis->>'project_types_accepted' as project_types,
        ai_analysis->'resources_available'->>'workers' as workers,
        ai_analysis->'work_history'->>'success_rate' as success_rate
      FROM public.contractors
      WHERE is_active = true
      ORDER BY performance_score DESC
      LIMIT 10;
    `);
    
    console.log('Contractors with AI Analysis:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
