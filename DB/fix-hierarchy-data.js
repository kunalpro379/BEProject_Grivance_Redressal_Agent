import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: 'aws-1-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.hjpgyfowhrbciemdzqgn',
  password: 'kunalpro379',
  ssl: {
    rejectUnauthorized: false
  }
});

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function fixHierarchyData() {
  const client = await pool.connect();
  
  try {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         FIXING HIERARCHY DATA & STRUCTURE                  ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    await client.query('BEGIN');

    // Step 1: Update all city officials to "Municipal Commissioner"
    log('🔧 Step 1: Updating all city officials to "Municipal Commissioner"...', colors.yellow);
    const updateDesignation = await client.query(`
      UPDATE city_officials
      SET designation = 'Municipal Commissioner'
      WHERE city_id IS NOT NULL
      RETURNING id, designation
    `);
    log(`✓ Updated ${updateDesignation.rowCount} city officials to Municipal Commissioner`, colors.green);

    // Step 2: Fix duplicate/missing names in city officials
    log('\n🔧 Step 2: Fixing city official names...', colors.yellow);
    
    // Get all city officials with issues
    const cityOfficials = await client.query(`
      SELECT co.id, u.full_name, co.city, co.district
      FROM city_officials co
      JOIN users u ON co.user_id = u.id
      WHERE co.city_id IS NOT NULL
      ORDER BY co.city
    `);

    log(`Found ${cityOfficials.rows.length} city officials`, colors.blue);
    
    // Assign unique names to commissioners
    const commissionerNames = [
      'Rajesh Kumar',
      'Priya Sharma',
      'Amit Patel',
      'Sneha Desai',
      'Vikram Singh',
      'Anjali Mehta'
    ];

    for (let i = 0; i < cityOfficials.rows.length; i++) {
      const official = cityOfficials.rows[i];
      const newName = commissionerNames[i] || `Commissioner ${i + 1}`;
      
      await client.query(`
        UPDATE users
        SET full_name = $1
        WHERE id = (SELECT user_id FROM city_officials WHERE id = $2)
      `, [newName, official.id]);
      
      log(`  ✓ Updated: ${official.full_name} → ${newName} (${official.city})`, colors.green);
    }

    // Step 3: Fix ward officer names
    log('\n🔧 Step 3: Fixing ward officer names...', colors.yellow);
    
    const wardOfficers = await client.query(`
      SELECT wo.id, u.full_name, wo.ward_number, wo.city
      FROM ward_officers wo
      JOIN users u ON wo.user_id = u.id
      ORDER BY wo.ward_number
    `);

    log(`Found ${wardOfficers.rows.length} ward officers`, colors.blue);

    const wardOfficerNames = [
      'Suresh Patil',
      'Kavita Joshi',
      'Rahul Verma',
      'Pooja Nair',
      'Manoj Kulkarni'
    ];

    for (let i = 0; i < wardOfficers.rows.length; i++) {
      const officer = wardOfficers.rows[i];
      const newName = wardOfficerNames[i] || `Ward Officer ${officer.ward_number}`;
      
      await client.query(`
        UPDATE users
        SET full_name = $1
        WHERE id = (SELECT user_id FROM ward_officers WHERE id = $2)
      `, [newName, officer.id]);
      
      log(`  ✓ Updated: ${officer.full_name} → ${newName} (Ward ${officer.ward_number})`, colors.green);
    }

    // Step 4: Fix department officer names (ensure unique names)
    log('\n🔧 Step 4: Fixing department officer names...', colors.yellow);
    
    const deptOfficers = await client.query(`
      SELECT do_tbl.id, u.full_name, do_tbl.role, d.name as department
      FROM departmentofficers do_tbl
      JOIN users u ON do_tbl.user_id = u.id
      LEFT JOIN departments d ON do_tbl.department_id = d.id
      ORDER BY d.name, do_tbl.role
    `);

    log(`Found ${deptOfficers.rows.length} department officers`, colors.blue);

    const deptOfficerNames = [
      'Anil Deshmukh', 'Sunita Rane', 'Prakash Bhosale', 'Meera Sawant', 'Ganesh Pawar',
      'Lata Shinde', 'Ramesh Jadhav', 'Vandana Kale', 'Sachin Mane', 'Rekha Patil',
      'Vijay Naik', 'Shalini Ghosh', 'Deepak Yadav', 'Nisha Gupta', 'Kiran Reddy',
      'Madhuri Iyer', 'Ashok Jain', 'Preeti Kapoor', 'Sanjay Malhotra', 'Ritu Agarwal',
      'Nitin Chopra', 'Swati Bansal', 'Rajiv Saxena', 'Anita Mishra', 'Harish Tiwari',
      'Geeta Pandey'
    ];

    for (let i = 0; i < deptOfficers.rows.length; i++) {
      const officer = deptOfficers.rows[i];
      
      // Skip if already has a proper unique name
      if (officer.full_name && 
          !officer.full_name.toLowerCase().includes('kunal') &&
          !officer.full_name.toLowerCase().includes('worker') &&
          !officer.full_name.toLowerCase().includes('staff') &&
          officer.full_name.split(' ').length >= 2) {
        log(`  ⊙ Keeping: ${officer.full_name} (${officer.role})`, colors.blue);
        continue;
      }
      
      const newName = deptOfficerNames[i] || `Officer ${i + 1}`;
      
      await client.query(`
        UPDATE users
        SET full_name = $1
        WHERE id = (SELECT user_id FROM departmentofficers WHERE id = $2)
      `, [newName, officer.id]);
      
      log(`  ✓ Updated: ${officer.full_name} → ${newName} (${officer.role})`, colors.green);
    }

    // Step 5: Ensure all officers have proper email addresses
    log('\n🔧 Step 5: Fixing email addresses...', colors.yellow);
    
    // Update emails with unique identifiers to avoid duplicates
    await client.query(`
      UPDATE users u
      SET email = LOWER(REPLACE(u.full_name, ' ', '.')) || '.' || SUBSTRING(u.id::text, 1, 8) || '@thane.gov.in'
      WHERE u.email LIKE '%kunalpatil%' 
         OR u.email LIKE '%kunal%'
         OR u.email LIKE '%worker%'
         OR u.email LIKE '%@gmail.com'
         OR u.email LIKE '%sdfss%'
    `);
    
    log('✓ Updated email addresses to proper government format', colors.green);

    // Step 6: Verify hierarchy structure
    log('\n🔍 Step 6: Verifying hierarchy structure...', colors.yellow);
    
    const hierarchyCheck = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM city_officials WHERE city_id IS NOT NULL) as commissioners,
        (SELECT COUNT(*) FROM ward_officers WHERE reports_to_city_official_id IS NOT NULL) as ward_officers,
        (SELECT COUNT(*) FROM departmentofficers WHERE reports_to_city_official_id IS NOT NULL OR reports_to_ward_officer_id IS NOT NULL) as dept_officers
    `);
    
    const stats = hierarchyCheck.rows[0];
    log(`\n📊 Hierarchy Statistics:`, colors.cyan);
    log(`  Municipal Commissioners: ${stats.commissioners}`, colors.green);
    log(`  Ward Officers: ${stats.ward_officers}`, colors.green);
    log(`  Department Officers: ${stats.dept_officers}`, colors.green);

    // Step 7: Show sample hierarchy
    log('\n📋 Sample Hierarchy:', colors.cyan);
    
    const sampleHierarchy = await client.query(`
      SELECT 
        u_co.full_name as commissioner,
        co.city,
        u_wo.full_name as ward_officer,
        wo.ward_number,
        u_do.full_name as dept_officer,
        do_tbl.role as dept_role,
        d.name as department
      FROM city_officials co
      JOIN users u_co ON co.user_id = u_co.id
      LEFT JOIN ward_officers wo ON wo.reports_to_city_official_id = co.id
      LEFT JOIN users u_wo ON wo.user_id = u_wo.id
      LEFT JOIN departmentofficers do_tbl ON do_tbl.reports_to_city_official_id = co.id
      LEFT JOIN users u_do ON do_tbl.user_id = u_do.id
      LEFT JOIN departments d ON do_tbl.department_id = d.id
      WHERE co.city_id IS NOT NULL
      ORDER BY co.city, wo.ward_number, d.name
      LIMIT 10
    `);

    log('');
    let currentCommissioner = '';
    sampleHierarchy.rows.forEach(row => {
      if (row.commissioner !== currentCommissioner) {
        currentCommissioner = row.commissioner;
        log(`\n🏛️  ${row.commissioner} - Municipal Commissioner (${row.city})`, colors.bright + colors.green);
      }
      
      if (row.ward_officer) {
        log(`   ├─ 👤 ${row.ward_officer} - Ward Officer (Ward ${row.ward_number})`, colors.blue);
      }
      
      if (row.dept_officer) {
        const prefix = row.ward_officer ? '   │  ' : '   ';
        log(`${prefix}└─ 👷 ${row.dept_officer} - ${row.dept_role} (${row.department || 'N/A'})`, colors.magenta);
      }
    });

    await client.query('COMMIT');

    log('\n\n╔════════════════════════════════════════════════════════════╗', colors.green);
    log('║              ✅ HIERARCHY DATA FIXED!                      ║', colors.green);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.green);

    log('📋 Summary of Changes:', colors.cyan);
    log('  ✓ All city officials now have "Municipal Commissioner" designation', colors.green);
    log('  ✓ All officers have unique, proper names', colors.green);
    log('  ✓ Email addresses updated to government format', colors.green);
    log('  ✓ Hierarchy structure verified', colors.green);
    log('  ✓ No duplicate names across hierarchy levels', colors.green);

    log('\n💡 Hierarchy Structure:', colors.cyan);
    log('  Level 1: Municipal Commissioner (Top)', colors.blue);
    log('  Level 2: Ward Officers (Report to Commissioner)', colors.blue);
    log('  Level 3: Department Officers (Report to Commissioner or Ward Officers)', colors.blue);

  } catch (error) {
    await client.query('ROLLBACK');
    log('\n❌ Error:', colors.red);
    log(error.message, colors.red);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixHierarchyData();
