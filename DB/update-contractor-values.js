import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Function to generate realistic contract values based on specialization
function generateContractValue(specialization) {
  const baseValues = {
    'Road Construction': { min: 5000000, max: 50000000 },    // 50L - 5Cr
    'Water Supply': { min: 3000000, max: 30000000 },         // 30L - 3Cr
    'Sanitation': { min: 2000000, max: 20000000 },           // 20L - 2Cr
    'Electrical': { min: 1500000, max: 15000000 },           // 15L - 1.5Cr
    'Civil Works': { min: 4000000, max: 40000000 },          // 40L - 4Cr
    'Drainage': { min: 3500000, max: 35000000 },             // 35L - 3.5Cr
    'Building Construction': { min: 10000000, max: 100000000 }, // 1Cr - 10Cr
    'Landscaping': { min: 1000000, max: 10000000 },          // 10L - 1Cr
    'Plumbing': { min: 1500000, max: 12000000 },             // 15L - 1.2Cr
    'Painting': { min: 500000, max: 5000000 },               // 5L - 50L
    'default': { min: 2000000, max: 20000000 }               // 20L - 2Cr
  };

  // Find matching specialization
  let range = baseValues['default'];
  for (const [key, value] of Object.entries(baseValues)) {
    if (specialization && specialization.toLowerCase().includes(key.toLowerCase())) {
      range = value;
      break;
    }
  }

  // Generate random value within range
  const value = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  
  // Round to nearest lakh (100,000)
  return Math.round(value / 100000) * 100000;
}

async function updateContractorValues() {
  const client = await pool.connect();
  
  try {
    console.log('Checking contractors without contract values...\n');

    // Get all contractors
    const result = await client.query(`
      SELECT id, contractor_id, company_name, specialization, contract_value
      FROM contractors
      ORDER BY company_name
    `);

    console.log(`Total contractors: ${result.rows.length}\n`);

    const contractorsWithoutValue = result.rows.filter(c => !c.contract_value || c.contract_value === 0);
    const contractorsWithValue = result.rows.filter(c => c.contract_value && c.contract_value > 0);

    console.log(`Contractors with contract value: ${contractorsWithValue.length}`);
    console.log(`Contractors without contract value: ${contractorsWithoutValue.length}\n`);

    if (contractorsWithoutValue.length === 0) {
      console.log('✅ All contractors already have contract values!');
      return;
    }

    console.log('Updating contractors without contract values...\n');

    let updated = 0;
    for (const contractor of contractorsWithoutValue) {
      const contractValue = generateContractValue(contractor.specialization);
      
      await client.query(`
        UPDATE contractors
        SET contract_value = $1, updated_at = NOW()
        WHERE id = $2
      `, [contractValue, contractor.id]);

      console.log(`✓ ${contractor.company_name} (${contractor.specialization || 'General'}): ₹${contractValue.toLocaleString('en-IN')}`);
      updated++;
    }

    console.log(`\n✅ Successfully updated ${updated} contractors with contract values!`);

    // Show summary
    console.log('\n--- Summary of All Contractors ---');
    const updatedResult = await client.query(`
      SELECT company_name, specialization, contract_value
      FROM contractors
      ORDER BY contract_value DESC
      LIMIT 10
    `);

    console.log('\nTop 10 Contractors by Contract Value:');
    updatedResult.rows.forEach((c, idx) => {
      console.log(`${idx + 1}. ${c.company_name} - ₹${(c.contract_value || 0).toLocaleString('en-IN')} (${c.specialization || 'General'})`);
    });

    // Calculate total contract value
    const totalResult = await client.query(`
      SELECT 
        COUNT(*) as total_contractors,
        SUM(contract_value) as total_contract_value,
        AVG(contract_value) as avg_contract_value,
        MIN(contract_value) as min_contract_value,
        MAX(contract_value) as max_contract_value
      FROM contractors
      WHERE contract_value IS NOT NULL AND contract_value > 0
    `);

    const stats = totalResult.rows[0];
    console.log('\n--- Contract Statistics ---');
    console.log(`Total Contractors: ${stats.total_contractors}`);
    console.log(`Total Contract Value: ₹${parseFloat(stats.total_contract_value || 0).toLocaleString('en-IN')}`);
    console.log(`Average Contract Value: ₹${parseFloat(stats.avg_contract_value || 0).toLocaleString('en-IN')}`);
    console.log(`Minimum Contract Value: ₹${parseFloat(stats.min_contract_value || 0).toLocaleString('en-IN')}`);
    console.log(`Maximum Contract Value: ₹${parseFloat(stats.max_contract_value || 0).toLocaleString('en-IN')}`);

  } catch (error) {
    console.error('Error updating contractor values:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
updateContractorValues()
  .then(() => {
    console.log('\n✅ Contractor values update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
