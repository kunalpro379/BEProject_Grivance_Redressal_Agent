import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Generate realistic AI analysis data for contractors
function generateAIAnalysis(contractor) {
  const activeProjects = contractor.active_projects || Math.floor(Math.random() * 5) + 1;
  const completedProjects = contractor.completed_projects || Math.floor(Math.random() * 40) + 10;
  const avgCompletionTime = contractor.avg_completion_time || Math.floor(Math.random() * 30) + 20;
  const performanceScore = contractor.performance_score || (Math.random() * 20 + 75).toFixed(2);
  
  // Determine project types based on specialization
  const getProjectTypes = (spec) => {
    if (!spec) return ['General Construction', 'Maintenance'];
    
    const specLower = spec.toLowerCase();
    if (specLower.includes('road')) return ['Road Repair', 'Road Construction', 'Highway Projects', 'Pavement Work'];
    if (specLower.includes('water') || specLower.includes('pipeline')) return ['Pipeline Installation', 'Water Supply', 'Jal Jeevan Mission', 'Water Treatment'];
    if (specLower.includes('drainage') || specLower.includes('sanitation')) return ['Drainage Systems', 'Sewage Work', 'Sanitation Projects', 'Waste Management'];
    if (specLower.includes('electrical') || specLower.includes('lighting')) return ['Street Lighting', 'Electrical Work', 'Power Distribution', 'Solar Installation'];
    if (specLower.includes('bridge')) return ['Bridge Construction', 'Bridge Maintenance', 'Flyover Projects'];
    if (specLower.includes('drilling') || specLower.includes('borewell')) return ['Borewell Drilling', 'Groundwater Survey', 'Well Construction'];
    if (specLower.includes('waste')) return ['Waste Management', 'Solid Waste', 'Recycling Projects'];
    
    return ['General Construction', 'Maintenance', 'Infrastructure Development'];
  };

  // Generate equipment based on specialization
  const getEquipment = (spec) => {
    if (!spec) return ['Trucks (5)', 'Excavators (2)', 'Cranes (1)'];
    
    const specLower = spec.toLowerCase();
    if (specLower.includes('road')) {
      return [
        `Asphalt Pavers (${Math.floor(Math.random() * 3) + 2})`,
        `Road Rollers (${Math.floor(Math.random() * 4) + 3})`,
        `Excavators (${Math.floor(Math.random() * 3) + 2})`,
        `Trucks (${Math.floor(Math.random() * 8) + 5})`,
        'Testing Lab'
      ];
    }
    if (specLower.includes('water') || specLower.includes('pipeline')) {
      return [
        `Pipe Laying Machines (${Math.floor(Math.random() * 2) + 1})`,
        `Excavators (${Math.floor(Math.random() * 3) + 2})`,
        `Welding Equipment (${Math.floor(Math.random() * 4) + 3})`,
        `Trucks (${Math.floor(Math.random() * 6) + 4})`,
        'Pressure Testing Equipment'
      ];
    }
    if (specLower.includes('drainage') || specLower.includes('sanitation')) {
      return [
        `Suction Machines (${Math.floor(Math.random() * 3) + 2})`,
        `Jetting Machines (${Math.floor(Math.random() * 2) + 1})`,
        `Excavators (${Math.floor(Math.random() * 2) + 1})`,
        `Trucks (${Math.floor(Math.random() * 5) + 3})`,
        'CCTV Inspection Equipment'
      ];
    }
    if (specLower.includes('electrical') || specLower.includes('lighting')) {
      return [
        `Boom Lifts (${Math.floor(Math.random() * 3) + 2})`,
        `Cable Laying Equipment (${Math.floor(Math.random() * 2) + 1})`,
        `Testing Equipment (${Math.floor(Math.random() * 3) + 2})`,
        `Trucks (${Math.floor(Math.random() * 4) + 2})`,
        'Solar Panel Installation Tools'
      ];
    }
    if (specLower.includes('drilling')) {
      return [
        `Drilling Rigs (${Math.floor(Math.random() * 2) + 1})`,
        `Compressors (${Math.floor(Math.random() * 3) + 2})`,
        `Pumps (${Math.floor(Math.random() * 4) + 3})`,
        `Trucks (${Math.floor(Math.random() * 3) + 2})`,
        'Water Testing Equipment'
      ];
    }
    
    return [
      `Excavators (${Math.floor(Math.random() * 3) + 2})`,
      `Cranes (${Math.floor(Math.random() * 2) + 1})`,
      `Trucks (${Math.floor(Math.random() * 6) + 4})`,
      'General Construction Equipment'
    ];
  };

  const projectTypes = getProjectTypes(contractor.specialization);
  const equipment = getEquipment(contractor.specialization);
  const workers = Math.floor(Math.random() * 60) + 30;
  const vehicles = Math.floor(Math.random() * 15) + 8;
  
  const successRate = (Math.random() * 10 + 85).toFixed(1);
  const onTimeDeliveryRate = (Math.random() * 15 + 80).toFixed(1);
  const reliabilityScore = (Math.random() * 2 + 7.5).toFixed(1);
  
  const creditRatings = ['AAA', 'AA+', 'AA', 'A+', 'A'];
  const creditRating = creditRatings[Math.floor(Math.random() * creditRatings.length)];
  
  const contractValue = contractor.contract_value || 15000000;
  const pendingPayments = Math.floor(contractValue * (Math.random() * 0.2 + 0.1));
  
  const riskLevels = ['Very Low', 'Low', 'Medium'];
  const riskLevel = parseFloat(performanceScore) >= 90 ? 'Very Low' : 
                    parseFloat(performanceScore) >= 80 ? 'Low' : 'Medium';
  
  const strengths = [
    ['Large-scale project experience', 'Modern equipment', 'Skilled workforce', 'Strong safety protocols'],
    ['Timely delivery', 'Quality workmanship', 'Good resource management', 'Experienced team'],
    ['Cost-effective solutions', 'Reliable service', 'Good communication', 'Technical expertise'],
    ['Innovative approaches', 'Strong vendor network', 'Quality materials', 'Safety compliance']
  ];
  
  const improvements = [
    ['Communication during delays'],
    ['Documentation process'],
    ['Resource allocation efficiency'],
    ['Project timeline management']
  ];

  return {
    work_history: {
      success_rate: parseFloat(successRate),
      active_projects: activeProjects,
      completed_projects: completedProjects,
      avg_project_duration: avgCompletionTime,
      on_time_delivery_rate: parseFloat(onTimeDeliveryRate)
    },
    financial_summary: {
      credit_rating: creditRating,
      pending_payments: pendingPayments,
      payment_reliability: creditRating === 'AAA' || creditRating === 'AA+' ? 'Excellent' : 'Good',
      total_contract_value: contractValue
    },
    resources_available: {
      workers: workers,
      vehicles: vehicles,
      equipment: equipment
    },
    performance_insights: {
      strengths: strengths[Math.floor(Math.random() * strengths.length)],
      risk_level: riskLevel,
      reliability_score: parseFloat(reliabilityScore),
      areas_for_improvement: improvements[Math.floor(Math.random() * improvements.length)]
    },
    project_types_accepted: projectTypes
  };
}

// Generate missing address
function generateAddress(companyName) {
  const areas = [
    'Industrial Estate, Ambernath',
    'MIDC Area, Ambernath East',
    'Station Road, Ambernath',
    'Sector 12, Ambernath West',
    'Tech Park, Ambernath West',
    'Green Park, Ambernath East',
    'Plot 45, MIDC Area, Ambernath East',
    'Commercial Complex, Ambernath',
    'Business Park, Ambernath East',
    'Industrial Zone, Ambernath West'
  ];
  return areas[Math.floor(Math.random() * areas.length)];
}

async function populateContractorDetails() {
  const client = await pool.connect();
  
  try {
    console.log('Fetching all contractors...\n');

    const result = await client.query(`
      SELECT * FROM contractors ORDER BY company_name
    `);

    console.log(`Found ${result.rows.length} contractors\n`);

    let updated = 0;
    
    for (const contractor of result.rows) {
      const updates = [];
      const values = [];
      let paramCount = 1;

      // Check and add missing fields
      if (!contractor.address) {
        updates.push(`address = $${paramCount++}`);
        values.push(generateAddress(contractor.company_name));
      }

      if (!contractor.avg_completion_time) {
        const avgTime = Math.floor(Math.random() * 30) + 20;
        updates.push(`avg_completion_time = $${paramCount++}`);
        values.push(avgTime);
      }

      // Always update/add ai_analysis if missing or incomplete
      if (!contractor.ai_analysis || !contractor.ai_analysis.work_history) {
        const aiAnalysis = generateAIAnalysis(contractor);
        updates.push(`ai_analysis = $${paramCount++}`);
        values.push(JSON.stringify(aiAnalysis));
      }

      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(contractor.id);
        
        const query = `
          UPDATE contractors
          SET ${updates.join(', ')}
          WHERE id = $${paramCount}
        `;

        await client.query(query, values);
        console.log(`✓ Updated: ${contractor.company_name}`);
        updated++;
      } else {
        console.log(`  Skipped: ${contractor.company_name} (already complete)`);
      }
    }

    console.log(`\n✅ Successfully updated ${updated} contractors!`);

    // Show summary
    console.log('\n--- Verification ---');
    const verifyResult = await client.query(`
      SELECT 
        company_name,
        contact_person,
        phone,
        address,
        specialization,
        performance_score,
        contract_value,
        CASE WHEN ai_analysis IS NOT NULL THEN 'YES' ELSE 'NO' END as has_ai_analysis
      FROM contractors
      ORDER BY company_name
      LIMIT 5
    `);

    console.log('\nSample of updated contractors:');
    verifyResult.rows.forEach((c, idx) => {
      console.log(`\n${idx + 1}. ${c.company_name}`);
      console.log(`   Contact: ${c.contact_person} | ${c.phone}`);
      console.log(`   Address: ${c.address}`);
      console.log(`   Specialization: ${c.specialization}`);
      console.log(`   Performance: ${c.performance_score}%`);
      console.log(`   Contract Value: ₹${parseFloat(c.contract_value || 0).toLocaleString('en-IN')}`);
      console.log(`   AI Analysis: ${c.has_ai_analysis}`);
    });

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

populateContractorDetails()
  .then(() => {
    console.log('\n✅ All contractor details populated successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
