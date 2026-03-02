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

async function assignCityToCommissioners() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Assigning cities to City Commissioners...\n');

    await client.query('BEGIN');

    // Get Thane city ID (using the first Thane entry)
    const thaneCity = await client.query(`
      SELECT id, city_name 
      FROM cities 
      WHERE city_name = 'Thane' 
      LIMIT 1
    `);

    if (thaneCity.rows.length === 0) {
      console.log('❌ Thane city not found in database');
      await client.query('ROLLBACK');
      return;
    }

    const thaneCityId = thaneCity.rows[0].id;
    console.log(`✅ Found Thane city: ${thaneCity.rows[0].city_name} (ID: ${thaneCityId})\n`);

    // Get all city commissioners
    const commissioners = await client.query(`
      SELECT u.id, u.email, u.full_name
      FROM users u
      WHERE u.role = 'city_commissioner'
    `);

    if (commissioners.rows.length === 0) {
      console.log('❌ No City Commissioners found');
      await client.query('ROLLBACK');
      return;
    }

    console.log(`Found ${commissioners.rows.length} City Commissioner(s):\n`);

    // Assign Thane city to all commissioners
    for (const commissioner of commissioners.rows) {
      // Check if government_officials record exists
      const govOfficial = await client.query(`
        SELECT id FROM government_officials WHERE user_id = $1
      `, [commissioner.id]);

      if (govOfficial.rows.length === 0) {
        // Create government_officials record
        console.log(`   Creating government_officials record for ${commissioner.full_name}...`);
        
        // Get Municipal Commissioner role_id (not City Commissioner)
        const roleResult = await client.query(`
          SELECT id FROM government_roles WHERE role_name = 'Municipal Commissioner' LIMIT 1
        `);
        
        const roleId = roleResult.rows[0]?.id;
        
        await client.query(`
          INSERT INTO government_officials (
            user_id, role_id, designation, employee_code, city_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `, [commissioner.id, roleId, 'Municipal Commissioner', `MC-${Date.now()}`, thaneCityId]);
        
        console.log(`   ✅ Created record and assigned Thane city to ${commissioner.full_name}`);
      } else {
        // Update existing record
        console.log(`   Updating ${commissioner.full_name}...`);
        await client.query(`
          UPDATE government_officials 
          SET city_id = $1, 
              designation = COALESCE(designation, 'Municipal Commissioner'),
              updated_at = NOW()
          WHERE user_id = $2
        `, [thaneCityId, commissioner.id]);
        
        console.log(`   ✅ Assigned Thane city to ${commissioner.full_name}`);
      }
    }

    await client.query('COMMIT');
    
    console.log('\n✅ Successfully assigned cities to all City Commissioners!');
    
    // Verify the changes
    console.log('\n📋 Verification:');
    const verification = await client.query(`
      SELECT 
        u.full_name, u.email,
        c.city_name,
        go.designation
      FROM users u
      JOIN government_officials go ON u.id = go.user_id
      LEFT JOIN cities c ON go.city_id = c.id
      WHERE u.role = 'city_commissioner'
    `);

    verification.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.full_name}`);
      console.log(`      Email: ${row.email}`);
      console.log(`      City: ${row.city_name}`);
      console.log(`      Designation: ${row.designation}`);
      console.log('');
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

assignCityToCommissioners();
