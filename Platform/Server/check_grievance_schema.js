import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkSchema() {
  try {
    console.log('Checking usergrievance table schema...\n');
    
    // Get all columns
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'usergrievance'
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(columnsQuery);
    
    console.log('Columns in usergrievance table:');
    console.log('=====================================');
    result.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(30)} ${row.data_type.padEnd(20)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check for specific columns we need
    console.log('\n\nChecking for required columns:');
    console.log('=====================================');
    const requiredColumns = [
      'id',
      'grievance_id',
      'citizen_id',
      'latitude',
      'longitude',
      'location_address',
      'category',
      'sub_category',
      'extracted_latitude',
      'extracted_longitude',
      'extracted_address'
    ];
    
    const existingColumns = result.rows.map(r => r.column_name);
    
    requiredColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${col}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
