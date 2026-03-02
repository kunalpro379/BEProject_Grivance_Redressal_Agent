/**
 * Script: Populate department location and contact information
 * 
 * This script helps populate the latitude, longitude, contact_information,
 * and jurisdiction fields for departments to enable geographic matching.
 */

const { Pool } = require('pg');
require('dotenv').config();

// Sample department locations (update with actual data)
const DEPARTMENT_LOCATIONS = [
  {
    name: 'Municipal Corporation Sanitation Department',
    latitude: 28.6139,
    longitude: 77.2090,
    jurisdiction: 'Central Delhi, Connaught Place area',
    contact_information: {
      phone: '+91-11-23412345',
      email: 'sanitation.central@mcd.gov.in',
      office_hours: '9:00 AM - 5:00 PM',
      emergency_contact: '+91-11-23412346'
    }
  },
  {
    name: 'Public Works Department',
    latitude: 28.7041,
    longitude: 77.1025,
    jurisdiction: 'North Delhi, Civil Lines area',
    contact_information: {
      phone: '+91-11-23456789',
      email: 'pwd.north@delhi.gov.in',
      office_hours: '9:00 AM - 5:00 PM'
    }
  },
  {
    name: 'Water Supply Department',
    latitude: 28.5355,
    longitude: 77.3910,
    jurisdiction: 'East Delhi, Noida border area',
    contact_information: {
      phone: '+91-11-23567890',
      email: 'water.east@delhi.gov.in',
      office_hours: '24/7 Emergency Service',
      emergency_contact: '1916'
    }
  },
  {
    name: 'Traffic Police Department',
    latitude: 28.6692,
    longitude: 77.4538,
    jurisdiction: 'Entire Delhi NCR',
    contact_information: {
      phone: '100',
      email: 'traffic@delhipolice.gov.in',
      office_hours: '24/7',
      emergency_contact: '100'
    }
  },
  {
    name: 'Electricity Distribution Department',
    latitude: 28.6304,
    longitude: 77.2177,
    jurisdiction: 'South Delhi area',
    contact_information: {
      phone: '1912',
      email: 'complaints@bses.co.in',
      office_hours: '24/7 Helpline',
      emergency_contact: '1912'
    }
  }
];

async function populateLocations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Populating department locations...\n');
    
    let updated = 0;
    let notFound = 0;
    
    for (const dept of DEPARTMENT_LOCATIONS) {
      // Check if department exists
      const checkResult = await pool.query(
        'SELECT id, name FROM departments WHERE name ILIKE $1',
        [dept.name]
      );
      
      if (checkResult.rows.length === 0) {
        console.log(`⚠️  Department not found: ${dept.name}`);
        notFound++;
        continue;
      }
      
      const deptId = checkResult.rows[0].id;
      
      // Update location and contact information
      await pool.query(`
        UPDATE departments
        SET 
          latitude = $1,
          longitude = $2,
          jurisdiction = $3,
          contact_information = $4,
          updated_at = NOW()
        WHERE id = $5
      `, [
        dept.latitude,
        dept.longitude,
        dept.jurisdiction,
        JSON.stringify(dept.contact_information),
        deptId
      ]);
      
      console.log(`✅ Updated: ${dept.name}`);
      console.log(`   Location: (${dept.latitude}, ${dept.longitude})`);
      console.log(`   Jurisdiction: ${dept.jurisdiction}`);
      console.log(`   Contact: ${dept.contact_information.phone}\n`);
      
      updated++;
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updated} departments`);
    console.log(`   Not found: ${notFound} departments`);
    
    // Show departments still missing location data
    const missingResult = await pool.query(`
      SELECT id, name, address
      FROM departments
      WHERE latitude IS NULL OR longitude IS NULL
      ORDER BY name
      LIMIT 10;
    `);
    
    if (missingResult.rows.length > 0) {
      console.log(`\n⚠️  Departments still missing location data (showing first 10):`);
      missingResult.rows.forEach(dept => {
        console.log(`   - ${dept.name}`);
        if (dept.address) {
          console.log(`     Address: ${dept.address}`);
        }
      });
      console.log(`\n💡 Tip: Add their coordinates to DEPARTMENT_LOCATIONS array and run this script again.`);
    } else {
      console.log(`\n✅ All departments have location data!`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Interactive mode: Add location for a specific department
async function addDepartmentLocation(departmentName) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise(resolve => rl.question(query, resolve));
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log(`\n📍 Adding location for: ${departmentName}\n`);
    
    const latitude = await question('Enter latitude: ');
    const longitude = await question('Enter longitude: ');
    const jurisdiction = await question('Enter jurisdiction: ');
    const phone = await question('Enter phone: ');
    const email = await question('Enter email: ');
    
    const contact_information = {
      phone,
      email,
      office_hours: '9:00 AM - 5:00 PM'
    };
    
    await pool.query(`
      UPDATE departments
      SET 
        latitude = $1,
        longitude = $2,
        jurisdiction = $3,
        contact_information = $4,
        updated_at = NOW()
      WHERE name ILIKE $5
    `, [
      parseFloat(latitude),
      parseFloat(longitude),
      jurisdiction,
      JSON.stringify(contact_information),
      departmentName
    ]);
    
    console.log('\n✅ Location added successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
    await pool.end();
  }
}

// Run script
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--add' && args[1]) {
    // Interactive mode for single department
    addDepartmentLocation(args[1])
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  } else {
    // Batch mode for predefined departments
    populateLocations()
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  }
}

module.exports = { populateLocations, addDepartmentLocation };
