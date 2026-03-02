import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addPoliciesColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Adding policies column to departments table...\n');
    
    await client.query(`
      ALTER TABLE departments 
      ADD COLUMN IF NOT EXISTS policies TEXT;
    `);
    
    console.log('✅ Policies column added successfully!\n');
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addPoliciesColumn()
  .then(() => {
    console.log('✅ Database schema updated!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
