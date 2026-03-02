import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config({ path: '../Server/.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const categories = [
  'Roads and Infrastructure',
  'Water Supply',
  'Sanitation',
  'Street Lighting',
  'Garbage Collection',
  'Drainage',
  'Public Health',
  'Parks and Recreation'
];

const statuses = ['submitted', 'in_progress', 'assigned', 'closed'];
const priorities = ['low', 'medium', 'high', 'critical'];

const grievanceTemplates = [
  { category: 'Roads and Infrastructure', text: 'Pothole on main road causing traffic issues' },
  { category: 'Roads and Infrastructure', text: 'Road repair needed urgently' },
  { category: 'Water Supply', text: 'No water supply for 3 days' },
  { category: 'Water Supply', text: 'Water leakage in pipeline' },
  { category: 'Sanitation', text: 'Overflowing sewage in residential area' },
  { category: 'Sanitation', text: 'Public toilet maintenance required' },
  { category: 'Street Lighting', text: 'Street lights not working' },
  { category: 'Street Lighting', text: 'Need additional street lights' },
  { category: 'Garbage Collection', text: 'Garbage not collected for days' },
  { category: 'Garbage Collection', text: 'Overflowing garbage bins' },
  { category: 'Drainage', text: 'Blocked drainage causing waterlogging' },
  { category: 'Drainage', text: 'Drainage cleaning required' },
  { category: 'Public Health', text: 'Mosquito breeding in stagnant water' },
  { category: 'Public Health', text: 'Stray dogs causing nuisance' },
  { category: 'Parks and Recreation', text: 'Park maintenance needed' },
  { category: 'Parks and Recreation', text: 'Playground equipment broken' }
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(daysBack) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date;
}

async function populateWardGrievances() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Populating ward grievances for City Commissioner dashboard...\n');

    await client.query('BEGIN');

    // Get Thane city ID
    const cityResult = await client.query(`
      SELECT id, city_name FROM cities WHERE city_name = 'Thane' LIMIT 1
    `);

    if (cityResult.rows.length === 0) {
      console.log('❌ Thane city not found');
      await client.query('ROLLBACK');
      return;
    }

    const cityId = cityResult.rows[0].id;
    console.log(`✅ Found city: ${cityResult.rows[0].city_name} (${cityId})\n`);

    // Get all wards in Thane
    const wardsResult = await client.query(`
      SELECT id, ward_name, ward_number 
      FROM wards 
      WHERE city_id = $1
      ORDER BY ward_number
    `, [cityId]);

    if (wardsResult.rows.length === 0) {
      console.log('❌ No wards found for Thane city');
      console.log('Creating sample wards...\n');
      
      // Create sample wards
      const wardNames = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5'];
      for (let i = 0; i < wardNames.length; i++) {
        await client.query(`
          INSERT INTO wards (ward_name, ward_number, city_id, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
        `, [wardNames[i], `W-00${i + 1}`, cityId]);
      }
      
      // Re-fetch wards
      const newWardsResult = await client.query(`
        SELECT id, ward_name, ward_number 
        FROM wards 
        WHERE city_id = $1
        ORDER BY ward_number
      `, [cityId]);
      
      wardsResult.rows = newWardsResult.rows;
    }

    console.log(`✅ Found ${wardsResult.rows.length} wards\n`);

    // Get departments
    const deptResult = await client.query(`
      SELECT id, name FROM departments ORDER BY name LIMIT 5
    `);

    if (deptResult.rows.length === 0) {
      console.log('❌ No departments found');
      await client.query('ROLLBACK');
      return;
    }

    console.log(`✅ Found ${deptResult.rows.length} departments\n`);

    // Get a sample citizen for grievances
    const citizenResult = await client.query(`
      SELECT id FROM citizens LIMIT 1
    `);

    let citizenId = null;
    if (citizenResult.rows.length > 0) {
      citizenId = citizenResult.rows[0].id;
    }

    // Generate grievances for each ward
    let totalGrievances = 0;
    
    for (const ward of wardsResult.rows) {
      console.log(`📝 Creating grievances for ${ward.ward_name}...`);
      
      // Create 15-25 grievances per ward
      const grievanceCount = 15 + Math.floor(Math.random() * 11);
      
      for (let i = 0; i < grievanceCount; i++) {
        const template = getRandomElement(grievanceTemplates);
        const status = getRandomElement(statuses);
        const priority = getRandomElement(priorities);
        const department = getRandomElement(deptResult.rows);
        const createdAt = getRandomDate(60); // Within last 60 days
        
        // Calculate resolution time for closed grievances
        let resolvedAt = null;
        let resolutionTime = null;
        if (status === 'closed') {
          const resolutionDays = 1 + Math.floor(Math.random() * 10); // 1-10 days
          resolvedAt = new Date(createdAt);
          resolvedAt.setDate(resolvedAt.getDate() + resolutionDays);
          resolutionTime = resolutionDays;
        }
        
        // Calculate SLA deadline (7 days from creation)
        const slaDeadline = new Date(createdAt);
        slaDeadline.setDate(slaDeadline.getDate() + 7);
        
        const grievanceId = `GRV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        await client.query(`
          INSERT INTO usergrievance (
            grievance_id, citizen_id, grievance_text, category, 
            status, priority, department_id, 
            extracted_address, created_at, sla_deadline,
            resolved_at, resolution_time
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id
        `, [
          grievanceId,
          citizenId,
          `${template.text} in ${ward.ward_name}`,
          JSON.stringify({ main_category: template.category }),
          status,
          priority,
          department.id,
          `${ward.ward_name}, Thane`,
          createdAt,
          slaDeadline,
          resolvedAt,
          resolutionTime
        ]);
        
        // Get the inserted grievance ID
        const grievanceResult = await client.query(`
          SELECT id FROM usergrievance WHERE grievance_id = $1
        `, [grievanceId]);
        
        const grievanceDbId = grievanceResult.rows[0].id;
        
        // Create location mapping
        await client.query(`
          INSERT INTO grievance_location_mapping (
            grievance_id, city_id, ward_id, created_at
          ) VALUES ($1, $2, $3, NOW())
        `, [grievanceDbId, cityId, ward.id]);
      }
      
      totalGrievances += grievanceCount;
      console.log(`   ✅ Created ${grievanceCount} grievances for ${ward.ward_name}`);
    }

    await client.query('COMMIT');
    
    console.log(`\n✅ Successfully created ${totalGrievances} grievances across ${wardsResult.rows.length} wards!`);
    
    // Show summary
    console.log('\n📊 Summary by Ward:');
    const summaryResult = await client.query(`
      SELECT 
        w.ward_name,
        COUNT(ug.id) as total_grievances,
        COUNT(CASE WHEN ug.status = 'closed' THEN 1 END) as resolved,
        COUNT(CASE WHEN ug.status != 'closed' THEN 1 END) as pending,
        COUNT(CASE WHEN ug.sla_deadline < NOW() AND ug.status != 'closed' THEN 1 END) as overdue,
        ROUND(AVG(CASE WHEN ug.status = 'closed' THEN ug.resolution_time END), 2) as avg_resolution_time
      FROM wards w
      LEFT JOIN grievance_location_mapping glm ON w.id = glm.ward_id
      LEFT JOIN usergrievance ug ON glm.grievance_id = ug.id
      WHERE w.city_id = $1
      GROUP BY w.id, w.ward_name
      ORDER BY w.ward_name
    `, [cityId]);

    summaryResult.rows.forEach((row, index) => {
      const resolutionRate = row.total_grievances > 0 
        ? Math.round((row.resolved / row.total_grievances) * 100) 
        : 0;
      
      console.log(`\n${index + 1}. ${row.ward_name}`);
      console.log(`   Total: ${row.total_grievances}`);
      console.log(`   Resolved: ${row.resolved} (${resolutionRate}%)`);
      console.log(`   Pending: ${row.pending}`);
      console.log(`   Overdue: ${row.overdue}`);
      console.log(`   Avg Resolution Time: ${row.avg_resolution_time || 'N/A'} days`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

populateWardGrievances();
