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

async function addWaterContractors() {
  try {
    console.log('Starting Water Department contractors migration...\n');
    
    // Step 1: Add department_id column to contractors table
    console.log('1. Adding department_id column to contractors table...');
    await runQueryWithRetry(`
      ALTER TABLE public.contractors 
      ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id);
    `);
    console.log('✅ Column added\n');
    await sleep(1000);
    
    // Step 2: Get Water & Sanitation department ID
    console.log('2. Finding Water & Sanitation department...');
    const deptResult = await runQueryWithRetry(`
      SELECT id, name FROM public.departments 
      WHERE name ILIKE '%water%' OR name ILIKE '%sanitation%'
      LIMIT 1;
    `);
    
    if (deptResult.rows.length === 0) {
      throw new Error('Water & Sanitation department not found!');
    }
    
    const waterDeptId = deptResult.rows[0].id;
    const waterDeptName = deptResult.rows[0].name;
    console.log(`✅ Found: ${waterDeptName} (${waterDeptId})\n`);
    await sleep(1000);
    
    // Step 3: Insert Water department contractors
    console.log('3. Inserting Water department contractors...\n');
    
    const waterContractors = [
      {
        contractor_id: 'CONT-WAT-2024-001',
        company_name: 'AquaTech Solutions Pvt Ltd',
        contact_person: 'Suresh Patil',
        phone: '+91-9876501234',
        email: 'suresh@aquatech.com',
        address: 'Water Works Complex, Ambernath East',
        specialization: 'Water Pipeline Installation, Leak Detection',
        performance_score: 93.8,
        active_projects: 5,
        completed_projects: 38,
        avg_completion_time: 28,
        contract_value: 28000000,
        ai_analysis: {
          project_types_accepted: ['Water Pipeline Installation', 'Leak Detection & Repair', 'Water Tank Construction', 'Pump Installation'],
          resources_available: {
            workers: 72,
            equipment: ['Pipe Laying Machines (4)', 'Leak Detection Equipment (8)', 'Welding Units (10)', 'Excavators (3)', 'Water Tankers (6)'],
            vehicles: 20
          },
          work_history: {
            active_projects: 5,
            completed_projects: 38,
            success_rate: 94.7,
            avg_project_duration: 28,
            on_time_delivery_rate: 92.1
          },
          performance_insights: {
            strengths: ['Advanced leak detection technology', 'Quick response time', 'Minimal water wastage', 'Quality pipeline work'],
            areas_for_improvement: ['Documentation updates'],
            risk_level: 'Very Low',
            reliability_score: 9.3
          },
          financial_summary: {
            total_contract_value: 28000000,
            pending_payments: 3800000,
            payment_reliability: 'Excellent',
            credit_rating: 'AAA'
          }
        }
      },
      {
        contractor_id: 'CONT-WAT-2024-002',
        company_name: 'HydroFlow Engineering',
        contact_person: 'Meera Kulkarni',
        phone: '+91-9823401234',
        email: 'meera@hydroflow.com',
        address: 'Industrial Area, Ambernath West',
        specialization: 'Water Treatment, Filtration Systems',
        performance_score: 91.2,
        active_projects: 4,
        completed_projects: 31,
        avg_completion_time: 32,
        contract_value: 24000000,
        ai_analysis: {
          project_types_accepted: ['Water Treatment Plants', 'Filtration Systems', 'Water Quality Testing', 'Purification Units'],
          resources_available: {
            workers: 58,
            equipment: ['Filtration Units (6)', 'Testing Labs (2)', 'Chemical Dosing Systems (4)', 'Pumps (12)', 'Trucks (5)'],
            vehicles: 15
          },
          work_history: {
            active_projects: 4,
            completed_projects: 31,
            success_rate: 93.5,
            avg_project_duration: 32,
            on_time_delivery_rate: 90.3
          },
          performance_insights: {
            strengths: ['Water quality expertise', 'Modern filtration technology', 'Certified technicians', 'Compliance with standards'],
            areas_for_improvement: ['Project timeline optimization'],
            risk_level: 'Low',
            reliability_score: 9.1
          },
          financial_summary: {
            total_contract_value: 24000000,
            pending_payments: 3200000,
            payment_reliability: 'Excellent',
            credit_rating: 'AAA'
          }
        }
      },
      {
        contractor_id: 'CONT-WAT-2024-003',
        company_name: 'PureWater Infrastructure Ltd',
        contact_person: 'Rajesh Desai',
        phone: '+91-9765401234',
        email: 'rajesh@purewater.com',
        address: 'Municipal Complex, Ambernath',
        specialization: 'Water Storage Tanks, Overhead Reservoirs',
        performance_score: 89.5,
        active_projects: 3,
        completed_projects: 26,
        avg_completion_time: 35,
        contract_value: 21000000,
        ai_analysis: {
          project_types_accepted: ['Water Storage Tanks', 'Overhead Reservoirs', 'Underground Tanks', 'Tank Cleaning & Maintenance'],
          resources_available: {
            workers: 45,
            equipment: ['Cranes (2)', 'Welding Equipment (8)', 'Tank Cleaning Robots (3)', 'Excavators (2)', 'Trucks (4)'],
            vehicles: 12
          },
          work_history: {
            active_projects: 3,
            completed_projects: 26,
            success_rate: 92.3,
            avg_project_duration: 35,
            on_time_delivery_rate: 88.4
          },
          performance_insights: {
            strengths: ['Tank construction expertise', 'Quality materials', 'Safety protocols', 'Maintenance services'],
            areas_for_improvement: ['Resource allocation', 'Timeline management'],
            risk_level: 'Low',
            reliability_score: 8.9
          },
          financial_summary: {
            total_contract_value: 21000000,
            pending_payments: 2800000,
            payment_reliability: 'Very Good',
            credit_rating: 'AA'
          }
        }
      },
      {
        contractor_id: 'CONT-WAT-2024-004',
        company_name: 'Sewage Solutions India',
        contact_person: 'Anjali Sharma',
        phone: '+91-9834501234',
        email: 'anjali@sewagesolutions.com',
        address: 'Sanitation Depot, Ambernath East',
        specialization: 'Sewage Treatment, Drainage Systems',
        performance_score: 87.8,
        active_projects: 4,
        completed_projects: 29,
        avg_completion_time: 38,
        contract_value: 26000000,
        ai_analysis: {
          project_types_accepted: ['Sewage Treatment Plants', 'Drainage Systems', 'Septic Tank Installation', 'Wastewater Management'],
          resources_available: {
            workers: 62,
            equipment: ['Excavators (4)', 'Suction Machines (6)', 'Jetting Machines (5)', 'Treatment Units (3)', 'Trucks (8)'],
            vehicles: 18
          },
          work_history: {
            active_projects: 4,
            completed_projects: 29,
            success_rate: 89.6,
            avg_project_duration: 38,
            on_time_delivery_rate: 86.2
          },
          performance_insights: {
            strengths: ['Sewage treatment expertise', 'Environmental compliance', 'Modern equipment', 'Emergency response'],
            areas_for_improvement: ['Project completion time', 'Documentation'],
            risk_level: 'Low',
            reliability_score: 8.7
          },
          financial_summary: {
            total_contract_value: 26000000,
            pending_payments: 3500000,
            payment_reliability: 'Very Good',
            credit_rating: 'AA'
          }
        }
      },
      {
        contractor_id: 'CONT-WAT-2024-005',
        company_name: 'CleanFlow Systems',
        contact_person: 'Vikram Joshi',
        phone: '+91-9712401234',
        email: 'vikram@cleanflow.com',
        address: 'Water Supply Zone, Ambernath West',
        specialization: 'Water Distribution, Meter Installation',
        performance_score: 90.4,
        active_projects: 6,
        completed_projects: 34,
        avg_completion_time: 25,
        contract_value: 19000000,
        ai_analysis: {
          project_types_accepted: ['Water Distribution Networks', 'Meter Installation', 'Valve Replacement', 'Connection Services'],
          resources_available: {
            workers: 68,
            equipment: ['Pipe Cutters (12)', 'Threading Machines (8)', 'Meters (500+)', 'Testing Equipment (6)', 'Trucks (7)'],
            vehicles: 16
          },
          work_history: {
            active_projects: 6,
            completed_projects: 34,
            success_rate: 94.1,
            avg_project_duration: 25,
            on_time_delivery_rate: 91.1
          },
          performance_insights: {
            strengths: ['Fast installation', 'Large workforce', 'Quality meters', 'Customer service'],
            areas_for_improvement: ['Equipment maintenance'],
            risk_level: 'Very Low',
            reliability_score: 9.0
          },
          financial_summary: {
            total_contract_value: 19000000,
            pending_payments: 2400000,
            payment_reliability: 'Excellent',
            credit_rating: 'AAA'
          }
        }
      },
      {
        contractor_id: 'CONT-WAT-2024-006',
        company_name: 'DrainTech Professionals',
        contact_person: 'Priya Reddy',
        phone: '+91-9898401234',
        email: 'priya@draintech.com',
        address: 'Drainage Division, Ambernath',
        specialization: 'Drain Cleaning, Sewer Maintenance',
        performance_score: 86.3,
        active_projects: 3,
        completed_projects: 22,
        avg_completion_time: 30,
        contract_value: 15000000,
        ai_analysis: {
          project_types_accepted: ['Drain Cleaning', 'Sewer Line Maintenance', 'Blockage Removal', 'CCTV Inspection'],
          resources_available: {
            workers: 38,
            equipment: ['Jetting Machines (6)', 'CCTV Cameras (4)', 'Suction Trucks (4)', 'Rodding Equipment (10)', 'Safety Gear'],
            vehicles: 10
          },
          work_history: {
            active_projects: 3,
            completed_projects: 22,
            success_rate: 90.9,
            avg_project_duration: 30,
            on_time_delivery_rate: 86.3
          },
          performance_insights: {
            strengths: ['Emergency response', 'CCTV inspection capability', 'Experienced team', 'Safety focus'],
            areas_for_improvement: ['Equipment upgrades', 'Response time'],
            risk_level: 'Medium',
            reliability_score: 8.6
          },
          financial_summary: {
            total_contract_value: 15000000,
            pending_payments: 2000000,
            payment_reliability: 'Good',
            credit_rating: 'A'
          }
        }
      }
    ];
    
    for (let i = 0; i < waterContractors.length; i++) {
      const contractor = waterContractors[i];
      console.log(`[${i + 1}/${waterContractors.length}] Processing ${contractor.company_name}...`);
      
      await runQueryWithRetry(`
        INSERT INTO public.contractors (
          contractor_id, company_name, contact_person, phone, email, address,
          specialization, performance_score, active_projects, completed_projects,
          avg_completion_time, contract_value, is_active, ai_analysis, department_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, $14)
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
          department_id = EXCLUDED.department_id,
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
        JSON.stringify(contractor.ai_analysis),
        waterDeptId
      ]);
      
      console.log(`✅ ${contractor.company_name} inserted/updated`);
      await sleep(500);
    }
    
    console.log('\n4. Verifying results...');
    await sleep(1000);
    
    const result = await runQueryWithRetry(`
      SELECT 
        c.contractor_id,
        c.company_name,
        c.performance_score,
        c.active_projects,
        c.completed_projects,
        c.ai_analysis->'resources_available'->>'workers' as workers,
        c.ai_analysis->'work_history'->>'success_rate' as success_rate,
        c.ai_analysis->'performance_insights'->>'risk_level' as risk_level,
        d.name as department_name
      FROM public.contractors c
      LEFT JOIN public.departments d ON c.department_id = d.id
      WHERE c.department_id = $1
      ORDER BY c.performance_score DESC;
    `, [waterDeptId]);
    
    console.log('\n✅ Migration completed successfully!\n');
    console.log(`Water Department Contractors (${result.rows.length} total):`);
    console.table(result.rows);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error details:', error);
    throw error;
  }
}

addWaterContractors()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  });
