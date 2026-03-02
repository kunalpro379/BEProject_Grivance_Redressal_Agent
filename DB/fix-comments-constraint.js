import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixConstraint() {
  const client = await pool.connect();
  
  try {
    console.log('Dropping foreign key constraint on grievancecomments...\n');
    
    await client.query(`
      ALTER TABLE grievancecomments DROP CONSTRAINT IF EXISTS grievancecomments_user_id_fkey;
    `);
    
    console.log('✅ Constraint dropped successfully!');
    console.log('Now user_id can reference either users or citizens table.\n');
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixConstraint()
  .then(() => {
    console.log('✅ Database constraint fixed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
