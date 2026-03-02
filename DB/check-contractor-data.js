import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkContractorData() {
  const client = await pool.connect();
  
  try {
    console.log('Checking contractor data...\n');

    // Get Amit Deshmukh's data
    const amitResult = await client.query(`
      SELECT * FROM contractors WHERE contact_person ILIKE '%Amit%Deshmukh%'
    `);

    if (amitResult.rows.length > 0) {
      console.log('=== Amit Deshmukh Contractor Data ===');
      console.log(JSON.stringify(amitResult.rows[0], null, 2));
      console.log('\n');
    }

    // Get all contractors
    const allResult = await client.query(`
      SELECT 
        contractor_id,
        company_name,
        contact_person,
        phone,
        email,
        address,
        specialization,
        performance_score,
        active_projects,
        completed_projects,
        avg_completion_time,
        contract_value,
        documents,
        certifications
      FROM contractors
      ORDER BY company_name
    `);

    console.log('=== All Contractors Summary ===\n');
    allResult.rows.forEach((c, idx) => {
      console.log(`${idx + 1}. ${c.company_name}`);
      console.log(`   Contact Person: ${c.contact_person || 'MISSING'}`);
      console.log(`   Phone: ${c.phone || 'MISSING'}`);
      console.log(`   Email: ${c.email || 'MISSING'}`);
      console.log(`   Address: ${c.address || 'MISSING'}`);
      console.log(`   Specialization: ${c.specialization || 'MISSING'}`);
      console.log(`   Performance Score: ${c.performance_score || 'MISSING'}`);
      console.log(`   Active Projects: ${c.active_projects ?? 'MISSING'}`);
      console.log(`   Completed Projects: ${c.completed_projects ?? 'MISSING'}`);
      console.log(`   Avg Completion Time: ${c.avg_completion_time || 'MISSING'}`);
      console.log(`   Contract Value: ${c.contract_value || 'MISSING'}`);
      console.log(`   Documents: ${c.documents ? 'YES' : 'MISSING'}`);
      console.log(`   Certifications: ${c.certifications ? 'YES' : 'MISSING'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkContractorData()
  .then(() => {
    console.log('✅ Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
