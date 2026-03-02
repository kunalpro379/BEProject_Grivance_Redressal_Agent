import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from Server directory
dotenv.config({ path: path.join(__dirname, '../Server/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function showDepartmentIds() {
  const client = await pool.connect();
  
  try {
    console.log('\n' + '='.repeat(80));
    console.log('DEPARTMENT IDS AND URLS');
    console.log('='.repeat(80) + '\n');

    // Get all departments with their head officers
    const result = await client.query(`
      SELECT 
        d.id,
        d.name,
        d.head_officer_id,
        u.full_name as head_officer_name,
        u.email as head_officer_email,
        CASE 
          WHEN d.policies IS NOT NULL AND d.policies != '' THEN 'YES'
          ELSE 'NO'
        END as has_policies
      FROM departments d
      LEFT JOIN users u ON u.id = d.head_officer_id
      ORDER BY d.name
    `);

    console.log(`Found ${result.rows.length} departments:\n`);

    result.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.name}`);
      console.log(`   Department ID: ${row.id}`);
      console.log(`   Head Officer: ${row.head_officer_name || 'Not assigned'} (${row.head_officer_email || 'N/A'})`);
      console.log(`   Has Policies: ${row.has_policies}`);
      console.log(`   Dashboard URL: http://localhost:5173/officials-portal/department-dashboard/${row.id}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('INSTRUCTIONS');
    console.log('='.repeat(80));
    console.log('1. Copy the Dashboard URL for your department');
    console.log('2. Navigate to that URL in your browser');
    console.log('3. Click on the "Policies" tab');
    console.log('4. Check the browser console for debug logs');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

showDepartmentIds();
