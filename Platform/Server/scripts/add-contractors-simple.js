import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runQueryWithRetry(queryText, params = [], maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 10000,
    });

    try {
      await client.connect();
      const result = await client.query(queryText, params);
      await client.end();
      return result;
    } catch (error) {
      await client.end().catch(() => {});
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.log(`⚠️  Attempt ${attempt} failed, retrying in 2 seconds...`);
      await sleep(2000);
    }
  }
}

async function addContractorsAIAnalysis() {
  try {
    console.log('Starting contractors AI analysis migration...\n');
    
    // Step 1: Add ai_analysis column
    console.log('1. Adding ai_analysis column...');
    await runQueryWithRetry(`
      ALTER TABLE public.contractors 
      ADD COLUMN IF NOT EXISTS ai_analysis jsonb DEFAULT '{}'::jsonb;
    `);
    console.log('✅ Column added\n');
    await sleep(1000);
    
    // Step 2: Insert contractors one by one
    console.log('2. Inserting contractor data with AI analysis...\n');
    
    const contractors = [
      {
        contractor_id: 'CONT-2024-001',
        company_name: 'Ambernath Infrastructure Pvt Ltd',
        contact_person: 'Rajesh Kumar',
        phone: '+91-9876543210',
        email: 'rajesh@ambernathinfra.com',
        address: 'Plot 45, MIDC Area, Ambernath East',
        specialization: 'Road Construction, Drainage Systems',
        performance_score: 94.5,
        active_projects: 4,
        completed_projects: 32,
        avg_completion_time: 42,
        contract_value: 25000000,
        ai_analysis: {
          project_types_accepted: ['Road Construction', 'Bridge Construction', 'Drainage Systems', 'Street Lighting'],
          resources_available: {
            workers: 65,
            equipment: ['Excavators (5)', 'Bulldozers (3)', 'Concrete Mixers (4)', 'Paver Machines (2)', 'Trucks (8)'],
            vehicles: 18
          },
          work_history: {
            active_projects: 4,
            completed_projects: 32,
            success_rate: 96.8,
            avg_project_duration: 42,
            on_time_delivery_rate: 93.7
          },
          performance_insights: {
            strengths: ['Excellent on-time delivery', 'High-quality workmanship', 'Strong project management', 'Good safety record'],
            areas_for_improvement: ['Documentation could be more detailed'],
            risk_level: 'Very Low',
            reliability_score: 9.4
          },
          financial_summary: {
            total_contract_value: 25000000,
            pending_payments: 3500000,
            payment_reliability: 'Excellent',
            credit_rating: 'AAA'
          }
        }
      },
      {
        contractor_id: 'CONT-2024-002',
        company_name: 'Shivaji Construction Co',
        contact_person: 'Priya Sharma',
        phone: '+91-9823456789',
        email: 'priya@shivajiconstruction.com',
        address: 'Sector 12, Ambernath West',
        specialization: 'Water Supply, Sanitation',
        performance_score: 88.2,
        active_projects: 3,
        completed_projects: 24,
        avg_completion_time: 38,
        contract_value: 18000000,
        ai_analysis: {
          project_types_accepted: ['Water Supply Systems', 'Sewage Treatment', 'Pipeline Installation', 'Pump House Construction'],
          resources_available: {
            workers: 48,
            equipment: ['Pipe Laying Machines (3)', 'Welding Equipment (6)', 'Excavators (2)', 'Trucks (5)', 'Testing Equipment'],
            vehicles: 12
          },
          work_history: {
            active_projects: 3,
            completed_projects: 24,
            success_rate: 91.6,
            avg_project_duration: 38,
            on_time_delivery_rate: 87.5
          },
          performance_insights: {
            strengths: ['Specialized in water systems', 'Technical expertise', 'Quality materials', 'Good coordination'],
            areas_for_improvement: ['Timeline management', 'Resource allocation'],
            risk_level: 'Low',
            reliability_score: 8.8
          },
          financial_summary: {
            total_contract_value: 18000000,
            pending_payments: 2800000,
            payment_reliability: 'Very Good',
            credit_rating: 'AA'
          }
        }
      },
      {
        contractor_id: 'CONT-2024-003',
        company_name: 'Maharashtra Roads & Bridges Ltd',
        contact_person: 'Amit Deshmukh',
        phone: '+91-9765432109',
        email: 'amit@mrbridges.com',
        address: 'Industrial Estate, Ambernath',
        specialization: 'Road Repair, Bridge Maintenance',
        performance_score: 91.7,
        active_projects: 5,
        completed_projects: 41,
        avg_completion_time: 35,
        contract_value: 32000000,
        ai_analysis: {
          project_types_accepted: ['Road Repair', 'Bridge Construction', 'Flyover Maintenance', 'Highway Projects'],
          resources_available: {
            workers: 82,
            equipment: ['Asphalt Pavers (4)', 'Road Rollers (6)', 'Excavators (4)', 'Cranes (2)', 'Trucks (12)', 'Testing Lab'],
            vehicles: 24
          },
          work_history: {
            active_projects: 5,
            completed_projects: 41,
            success_rate: 95.1,
            avg_project_duration: 35,
            on_time_delivery_rate: 92.6
          },
          performance_insights: {
            strengths: ['Large-scale project experience', 'Modern equipment', 'Skilled workforce', 'Strong safety protocols'],
            areas_for_improvement: ['Communication during delays'],
            risk_level: 'Very Low',
            reliability_score: 9.2
          },
          financial_summary: {
            total_contract_value: 32000000,
            pending_payments: 4200000,
            payment_reliability: 'Excellent',
            credit_rating: 'AAA'
          }
        }
      },
      {
        contractor_id: 'CONT-2024-004',
        company_name: 'Green City Developers',
        contact_person: 'Sneha Patil',
        phone: '+91-9834567890',
        email: 'sneha@greencitydev.com',
        address: 'Green Park, Ambernath East',
        specialization: 'Waste Management, Sanitation',
        performance_score: 85.3,
        active_projects: 2,
        completed_projects: 18,
        avg_completion_time: 45,
        contract_value: 12000000,
        ai_analysis: {
          project_types_accepted: ['Waste Management', 'Garbage Collection Systems', 'Composting Units', 'Sanitation Facilities'],
          resources_available: {
            workers: 35,
            equipment: ['Garbage Trucks (4)', 'Compactors (2)', 'Shredders (3)', 'Composting Equipment'],
            vehicles: 8
          },
          work_history: {
            active_projects: 2,
            completed_projects: 18,
            success_rate: 88.8,
            avg_project_duration: 45,
            on_time_delivery_rate: 83.3
          },
          performance_insights: {
            strengths: ['Environmental focus', 'Innovative solutions', 'Community engagement'],
            areas_for_improvement: ['Project timeline adherence', 'Equipment maintenance'],
            risk_level: 'Medium',
            reliability_score: 8.5
          },
          financial_summary: {
            total_contract_value: 12000000,
            pending_payments: 1800000,
            payment_reliability: 'Good',
            credit_rating: 'A'
          }
        }
      },
      {
        contractor_id: 'CONT-2024-005',
        company_name: 'Urban Solutions Engineering',
        contact_person: 'Vikram Joshi',
        phone: '+91-9712345678',
        email: 'vikram@urbansolutions.com',
        address: 'Tech Park, Ambernath West',
        specialization: 'Street Lighting, Electrical Works',
        performance_score: 89.6,
        active_projects: 3,
        completed_projects: 27,
        avg_completion_time: 40,
        contract_value: 15000000,
        ai_analysis: {
          project_types_accepted: ['Street Lighting', 'Electrical Infrastructure', 'Solar Panel Installation', 'Smart City Solutions'],
          resources_available: {
            workers: 42,
            equipment: ['Hydraulic Lifts (3)', 'Cable Laying Equipment', 'Testing Instruments', 'Trucks (6)'],
            vehicles: 10
          },
          work_history: {
            active_projects: 3,
            completed_projects: 27,
            success_rate: 92.5,
            avg_project_duration: 40,
            on_time_delivery_rate: 88.8
          },
          performance_insights: {
            strengths: ['Technical expertise', 'Energy-efficient solutions', 'Good documentation', 'Safety compliance'],
            areas_for_improvement: ['Resource planning'],
            risk_level: 'Low',
            reliability_score: 9.0
          },
          financial_summary: {
            total_contract_value: 15000000,
            pending_payments: 2100000,
            payment_reliability: 'Very Good',
            credit_rating: 'AA'
          }
        }
      },
      {
        contractor_id: 'CONT-2024-006',
        company_name: 'Kalyan-Dombivli Infrastructure',
        contact_person: 'Rahul Mehta',
        phone: '+91-9898765432',
        email: 'rahul@kdinfra.com',
        address: 'Station Road, Ambernath',
        specialization: 'Multi-purpose Infrastructure',
        performance_score: 87.4,
        active_projects: 4,
        completed_projects: 29,
        avg_completion_time: 48,
        contract_value: 22000000,
        ai_analysis: {
          project_types_accepted: ['Road Construction', 'Water Supply', 'Drainage', 'Building Construction', 'Park Development'],
          resources_available: {
            workers: 58,
            equipment: ['Excavators (3)', 'Concrete Mixers (3)', 'Trucks (7)', 'Cranes (1)', 'Various Tools'],
            vehicles: 14
          },
          work_history: {
            active_projects: 4,
            completed_projects: 29,
            success_rate: 89.6,
            avg_project_duration: 48,
            on_time_delivery_rate: 86.2
          },
          performance_insights: {
            strengths: ['Versatile capabilities', 'Local knowledge', 'Good stakeholder management'],
            areas_for_improvement: ['Project completion time', 'Cost control'],
            risk_level: 'Medium',
            reliability_score: 8.7
          },
          financial_summary: {
            total_contract_value: 22000000,
            pending_payments: 3300000,
            payment_reliability: 'Good',
            credit_rating: 'A'
          }
        }
      }
    ];
    
    for (let i = 0; i < contractors.length; i++) {
      const contractor = contractors[i];
      console.log(`[${i + 1}/${contractors.length}] Processing ${contractor.company_name}...`);
      
      await runQueryWithRetry(`
        INSERT INTO public.contractors (
          contractor_id, company_name, contact_person, phone, email, address,
          specialization, performance_score, active_projects, completed_projects,
          avg_completion_time, contract_value, is_active, ai_analysis
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13)
        ON CONFLICT (contractor_id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          contact_person = EXCLUDED.contact_person,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          specialization = EXCLUDED.specialization,
          performance_score = EXCLUDED.performance_score,
          active_projects = EXCLUDED.active_projects,
          completed_projects = EXCLUDED.completed_projects,
          avg_completion_time = EXCLUDED.avg_completion_time,
          contract_value = EXCLUDED.contract_value,
          ai_analysis = EXCLUDED.ai_analysis,
          updated_at = now();
      `, [
        contractor.contractor_id,
        contractor.company_name,
        contractor.contact_person,
        contractor.phone,
        contractor.email,
        contractor.address,
        contractor.specialization,
        contractor.performance_score,
        contractor.active_projects,
        contractor.completed_projects,
        contractor.avg_completion_time,
        contractor.contract_value,
        JSON.stringify(contractor.ai_analysis)
      ]);
      
      console.log(`✅ ${contractor.company_name} inserted/updated`);
      await sleep(500); // Small delay between inserts
    }
    
    console.log('\n3. Verifying results...');
    await sleep(1000);
    
    const result = await runQueryWithRetry(`
      SELECT 
        contractor_id,
        company_name,
        performance_score,
        active_projects,
        completed_projects,
        ai_analysis->'resources_available'->>'workers' as workers,
        ai_analysis->'work_history'->>'success_rate' as success_rate,
        ai_analysis->'performance_insights'->>'risk_level' as risk_level
      FROM public.contractors
      WHERE is_active = true
      ORDER BY performance_score DESC;
    `);
    
    console.log('\n✅ Migration completed successfully!\n');
    console.log('Contractors with AI Analysis:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error details:', error);
    throw error;
  }
}

addContractorsAIAnalysis()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  });
