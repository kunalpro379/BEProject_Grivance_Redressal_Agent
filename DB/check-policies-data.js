import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config({ path: './Server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkPoliciesData() {
  const client = await pool.connect();
  
  try {
    console.log('\n' + '='.repeat(80));
    console.log('CHECKING POLICIES DATA IN DATABASE');
    console.log('='.repeat(80) + '\n');

    // Get all departments with their policies
    const result = await client.query(`
      SELECT 
        id,
        name,
        CASE 
          WHEN policies IS NULL THEN 'NULL'
          WHEN policies = '' THEN 'EMPTY'
          ELSE 'HAS DATA'
        END as policy_status,
        LENGTH(policies) as policy_length,
        SUBSTRING(policies, 1, 200) as policy_preview
      FROM departments
      ORDER BY name
    `);

    console.log(`Found ${result.rows.length} departments:\n`);

    result.rows.forEach((dept, idx) => {
      console.log(`${idx + 1}. ${dept.name}`);
      console.log(`   Status: ${dept.policy_status}`);
      console.log(`   Length: ${dept.policy_length || 0} characters`);
      if (dept.policy_preview) {
        console.log(`   Preview: ${dept.policy_preview}...`);
      }
      console.log('');
    });

    // Summary
    const withData = result.rows.filter(r => r.policy_status === 'HAS DATA').length;
    const empty = result.rows.filter(r => r.policy_status === 'EMPTY').length;
    const nullData = result.rows.filter(r => r.policy_status === 'NULL').length;

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Departments with policies: ${withData}`);
    console.log(`⚠️  Departments with empty policies: ${empty}`);
    console.log(`❌ Departments with NULL policies: ${nullData}`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPoliciesData()
  .then(() => {
    console.log('✅ Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
