import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function quickCheck() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
    max: 1,
    connectionTimeoutMillis: 5000
  });

  try {
    // Quick test query
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'usergrievance' 
      AND column_name IN ('latitude', 'longitude', 'location_address', 'category', 'sub_category')
      ORDER BY column_name
    `);
    
    console.log('Found columns:', result.rows.map(r => r.column_name).join(', '));
    
    if (result.rows.length === 0) {
      console.log('\n❌ None of the expected columns exist!');
      console.log('The migration may not have been run.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

quickCheck();
