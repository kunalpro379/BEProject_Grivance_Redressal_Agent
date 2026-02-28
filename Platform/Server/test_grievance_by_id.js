import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testGrievanceById() {
  try {
    console.log('Testing grievance by ID query...\n');
    
    // First, get a sample grievance ID
    const sampleQuery = 'SELECT id, grievance_id, citizen_id FROM usergrievance LIMIT 5';
    const sampleResult = await pool.query(sampleQuery);
    
    console.log('Sample grievances:');
    sampleResult.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Grievance ID: ${row.grievance_id}, Citizen ID: ${row.citizen_id}`);
    });
    
    if (sampleResult.rows.length > 0) {
      const testId = sampleResult.rows[0].id;
      const testCitizenId = sampleResult.rows[0].citizen_id;
      
      console.log(`\nTesting query with ID: ${testId}`);
      
      // Test without citizen filter (viewAll=true scenario)
      const query1 = `
        SELECT g.*, c.full_name as citizen_name
        FROM usergrievance g
        LEFT JOIN citizens c ON g.citizen_id = c.id
        WHERE g.id = $1
      `;
      const result1 = await pool.query(query1, [testId]);
      console.log(`Query without filter: Found ${result1.rows.length} row(s)`);
      
      // Test with citizen filter (viewAll=false scenario)
      const query2 = `
        SELECT g.*, c.full_name as citizen_name
        FROM usergrievance g
        LEFT JOIN citizens c ON g.citizen_id = c.id
        WHERE g.id = $1 AND g.citizen_id = $2
      `;
      const result2 = await pool.query(query2, [testId, testCitizenId]);
      console.log(`Query with citizen filter: Found ${result2.rows.length} row(s)`);
      
      // Test with wrong citizen ID
      const wrongCitizenId = '00000000-0000-0000-0000-000000000000';
      const result3 = await pool.query(query2, [testId, wrongCitizenId]);
      console.log(`Query with wrong citizen ID: Found ${result3.rows.length} row(s)`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testGrievanceById();
