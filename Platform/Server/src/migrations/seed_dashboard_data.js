import pool from '../config/database.js';

const seedDashboardData = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Starting dashboard data seeding...\n');
    
    // 1. Insert sample state
    console.log('📍 Creating state...');
    const stateResult = await client.query(`
      INSERT INTO states (state_code, state_name, capital) 
      VALUES ('MH', 'Maharashtra', 'Mumbai')
      ON CONFLICT (state_code) DO UPDATE SET state_name = EXCLUDED.state_name
      RETURNING id
    `);
    const stateId = stateResult.rows[0].id;
    console.log('✅ State created:', stateId);
    
    // 2. Insert sample district
    console.log('📍 Creating district...');
    const districtResult = await client.query(`
      INSERT INTO districts (state_id, district_code, district_name, headquarters)
      VALUES ($1, 'MH-MUM', 'Mumbai', 'Mumbai')
      ON CONFLICT (district_code) DO UPDATE SET district_name = EXCLUDED.district_name
      RETURNING id
    `, [stateId]);
    const districtId = districtResult.rows[0].id;
    console.log('✅ District created:', districtId);
    
    // 3. Insert sample city
    console.log('📍 Creating city...');
    const cityResult = await client.query(`
      INSERT INTO cities (district_id, city_code, city_name, city_type, population)
      VALUES ($1, 'MH-MUM-001', 'Mumbai City', 'Municipal Corporation', 12000000)
      ON CONFLICT (city_code) DO UPDATE SET city_name = EXCLUDED.city_name
      RETURNING id
    `, [districtId]);
    const cityId = cityResult.rows[0].id;
    console.log('✅ City created:', cityId);
    
    // 4. Insert sample ward
    console.log('📍 Creating ward...');
    const wardResult = await client.query(`
      INSERT INTO wards (city_id, ward_number, ward_name, population)
      VALUES ($1, 'W-001', 'Ward 1 - Colaba', 50000)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [cityId]);
    
    let wardId;
    if (wardResult.rows.length > 0) {
      wardId = wardResult.rows[0].id;
    } else {
      const existingWard = await client.query(
        'SELECT id FROM wards WHERE city_id = $1 AND ward_number = $2 LIMIT 1',
        [cityId, 'W-001']
      );
      wardId = existingWard.rows[0].id;
    }
    console.log('✅ Ward created:', wardId);
    
    // 5. Insert sample department
    console.log('🏢 Creating department...');
    const deptResult = await client.query(`
      INSERT INTO departments (name, description, contact_email, contact_phone)
      VALUES ('Public Works Department', 'Handles infrastructure and maintenance', 'pwd@mumbai.gov.in', '+91-22-12345678')
      ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
      RETURNING id
    `);
    const deptId = deptResult.rows[0].id;
    console.log('✅ Department created:', deptId);
    
    // 6. Create government role
    console.log('👤 Creating government role...');
    const roleResult = await client.query(`
      INSERT INTO government_roles (role_code, role_name, role_level, role_type, description)
      VALUES ('WARD_OFF', 'Ward Officer', 'Ward', 'Administrative', 'Ward level officer')
      ON CONFLICT (role_code) DO UPDATE SET role_name = EXCLUDED.role_name
      RETURNING id
    `);
    const roleId = roleResult.rows[0].id;
    console.log('✅ Role created:', roleId);
    
    // 7. Get all users and update them to be ward officers
    console.log('👥 Updating users...');
    const usersResult = await client.query(`
      SELECT id, email FROM users 
      WHERE role IN ('department_officer', 'department_head', 'admin') 
      OR email LIKE '%officer%'
      OR email LIKE '%official%'
      LIMIT 5
    `);
    
    if (usersResult.rows.length === 0) {
      console.log('⚠️  No users found. Creating a test user...');
      const newUserResult = await client.query(`
        INSERT INTO users (email, password_hash, full_name, role, status, department_id)
        VALUES ('ward.officer@test.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 'Test Ward Officer', 'ward_officer', 'active', $1)
        RETURNING id, email
      `, [deptId]);
      usersResult.rows.push(newUserResult.rows[0]);
    }
    
    for (const user of usersResult.rows) {
      // Update user role to department_officer (ward_officer doesn't exist in enum)
      await client.query(`
        UPDATE users 
        SET role = 'department_officer', department_id = $1
        WHERE id = $2
      `, [deptId, user.id]);
      
      // Insert or update government official record
      const existingOfficial = await client.query(
        'SELECT id FROM government_officials WHERE user_id = $1',
        [user.id]
      );
      
      if (existingOfficial.rows.length > 0) {
        // Update existing
        await client.query(`
          UPDATE government_officials SET
            role_id = $1,
            state_id = $2,
            district_id = $3,
            city_id = $4,
            ward_id = $5,
            department_id = $6,
            designation = $7
          WHERE user_id = $8
        `, [roleId, stateId, districtId, cityId, wardId, deptId, 'Ward Officer', user.id]);
      } else {
        // Insert new
        await client.query(`
          INSERT INTO government_officials (
            user_id, role_id, state_id, district_id, city_id, ward_id, 
            department_id, employee_code, designation, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active')
        `, [user.id, roleId, stateId, districtId, cityId, wardId, deptId, 'WO-' + user.id.substring(0, 6), 'Ward Officer']);
      }
      
      console.log('✅ Updated user:', user.email);
    }
    
    // 8. Insert sample grievances
    console.log('📝 Creating sample grievances...');
    
    // Disable only USER triggers (not system triggers like foreign key constraints)
    await client.query('ALTER TABLE usergrievance DISABLE TRIGGER USER;');
    
    const categories = ['Water', 'Electricity', 'Sanitation', 'Roads'];
    const descriptions = [
      'Water leakage issue in the area',
      'Street light not working',
      'Garbage collection problem',
      'Road pothole repair needed'
    ];
    
    for (let i = 1; i <= 15; i++) {
      const categoryIndex = i % 4;
      const grievanceResult = await client.query(`
        INSERT INTO usergrievance (
          grievance_id, grievance_text, status, priority, 
          department_id, zone, ward, sla_deadline,
          category, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - ($10 || ' days')::INTERVAL)
        ON CONFLICT (grievance_id) DO NOTHING
        RETURNING id
      `, [
        'GRV-' + String(i).padStart(4, '0'),
        'Sample grievance ' + i + ' - ' + descriptions[categoryIndex],
        ['submitted', 'in_progress', 'closed'][i % 3],
        ['high', 'medium', 'low'][i % 3],
        deptId,
        'Zone A',
        'W-001',
        new Date(Date.now() + (i * 3600000)), // i hours from now
        JSON.stringify({ main_category: categories[categoryIndex] }),
        Math.floor(Math.random() * 30) // Random days in past
      ]);
      
      if (grievanceResult.rows.length > 0) {
        // Link grievance to location
        await client.query(`
          INSERT INTO grievance_location_mapping (
            grievance_id, state_id, district_id, city_id, ward_id,
            latitude, longitude, address, location_source
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Manual')
          ON CONFLICT (grievance_id) DO NOTHING
        `, [
          grievanceResult.rows[0].id,
          stateId,
          districtId,
          cityId,
          wardId,
          19.0760 + (Math.random() * 0.1),
          72.8777 + (Math.random() * 0.1),
          'Sample Address ' + i + ', Mumbai'
        ]);
      }
    }
    console.log('✅ Created 15 sample grievances');
    
    // 9. Insert sample workers
    console.log('👷 Creating sample workers...');
    const roles = ['Plumber', 'Electrician', 'Sanitation Worker', 'Road Worker', 'Maintenance Staff'];
    
    for (let i = 1; i <= 5; i++) {
      // Create a user for the worker
      const workerUserResult = await client.query(`
        INSERT INTO users (email, password_hash, full_name, role, status, department_id)
        VALUES ($1, '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', $2, 'department_officer', 'active', $3)
        ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
        RETURNING id
      `, [
        'worker' + i + '@pwd.gov.in',
        roles[i - 1] + ' ' + i,
        deptId
      ]);
      
      const workerUserId = workerUserResult.rows[0].id;
      
      await client.query(`
        INSERT INTO departmentofficers (user_id, department_id, staff_id, role, zone, ward, status, workload, specialization)
        VALUES ($1, $2, $3, $4, 'Zone A', 'W-001', $5, $6, $7)
        ON CONFLICT (staff_id) DO UPDATE SET 
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          workload = EXCLUDED.workload
      `, [
        workerUserId,
        deptId,
        'STAFF-' + String(i).padStart(3, '0'),
        roles[i - 1],
        ['busy', 'available'][i % 2],
        i % 5,
        roles[i - 1]
      ]);
    }
    console.log('✅ Created 5 sample workers');
    
    // 10. Insert sample equipment
    console.log('🔧 Creating sample equipment...');
    const equipmentTypes = [
      { name: 'Water Pump', type: 'Water Equipment' },
      { name: 'Generator', type: 'Power Equipment' },
      { name: 'Garbage Truck', type: 'Sanitation Vehicle' },
      { name: 'Road Roller', type: 'Road Equipment' }
    ];
    
    for (let i = 1; i <= 4; i++) {
      const eq = equipmentTypes[i - 1];
      await client.query(`
        INSERT INTO equipment (equipment_id, name, type, department_id, status, location, condition)
        VALUES ($1, $2, $3, $4, $5, 'Ward Office', 'good')
        ON CONFLICT (equipment_id) DO UPDATE SET 
          status = EXCLUDED.status,
          location = EXCLUDED.location
      `, [
        'EQ-' + String(i).padStart(3, '0'),
        eq.name + ' #' + i,
        eq.type,
        deptId,
        ['available', 'in_use', 'under_maintenance'][i % 3]
      ]);
    }
    console.log('✅ Created 4 sample equipment');
    
    // Re-enable user triggers on usergrievance table
    await client.query('ALTER TABLE usergrievance ENABLE TRIGGER USER;');
    
    await client.query('COMMIT');
    
    console.log('\n✨ Dashboard data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - State: Maharashtra');
    console.log('  - District: Mumbai');
    console.log('  - City: Mumbai City');
    console.log('  - Ward: W-001 (Colaba)');
    console.log('  - Department: Public Works Department');
    console.log('  - Users updated:', usersResult.rows.length);
    console.log('  - Grievances: 15');
    console.log('  - Workers: 5');
    console.log('  - Equipment: 4');
    console.log('\n🎉 You can now login and see the role-based dashboard!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDashboardData()
    .then(() => {
      console.log('\n✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

export default seedDashboardData;
