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

async function checkCityCommissioner() {
  try {
    console.log('🔍 Checking City Commissioner data...\n');

    // Find all city commissioners
    const result = await pool.query(`
      SELECT 
        u.id, u.email, u.full_name, u.role,
        go.designation, go.employee_code,
        go.state_id, go.district_id, go.city_id, go.ward_id, go.department_id,
        gr.role_name, gr.role_level,
        c.city_name,
        d.name as department_name
      FROM users u
      LEFT JOIN government_officials go ON u.id = go.user_id
      LEFT JOIN government_roles gr ON go.role_id = gr.id
      LEFT JOIN cities c ON go.city_id = c.id
      LEFT JOIN departments d ON go.department_id = d.id
      WHERE u.role = 'city_commissioner'
      ORDER BY u.full_name
    `);

    if (result.rows.length === 0) {
      console.log('❌ No City Commissioners found in the database');
      return;
    }

    console.log(`✅ Found ${result.rows.length} City Commissioner(s):\n`);

    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Role Name: ${user.role_name || 'Not set'}`);
      console.log(`   Designation: ${user.designation || 'Not set'}`);
      console.log(`   Employee Code: ${user.employee_code || 'Not set'}`);
      console.log(`   City ID: ${user.city_id || '❌ NOT SET'}`);
      console.log(`   City Name: ${user.city_name || 'N/A'}`);
      console.log(`   District ID: ${user.district_id || 'Not set'}`);
      console.log(`   State ID: ${user.state_id || 'Not set'}`);
      console.log(`   Department ID: ${user.department_id || 'Not set'}`);
      console.log(`   Department Name: ${user.department_name || 'N/A'}`);
      
      if (!user.city_id) {
        console.log(`   ⚠️  WARNING: This user has NO city_id assigned!`);
      }
      console.log('');
    });

    // Check if there are any cities in the database
    const citiesResult = await pool.query(`
      SELECT id, city_name, district_id 
      FROM cities 
      ORDER BY city_name 
      LIMIT 10
    `);

    console.log('\n📍 Available Cities in Database:');
    if (citiesResult.rows.length === 0) {
      console.log('   ❌ No cities found in database');
    } else {
      citiesResult.rows.forEach((city, index) => {
        console.log(`   ${index + 1}. ${city.city_name} (ID: ${city.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkCityCommissioner();
