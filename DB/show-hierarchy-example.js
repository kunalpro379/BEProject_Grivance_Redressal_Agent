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

async function showHierarchyExample() {
  const client = await pool.connect();
  
  try {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         CITY COMMISSIONER HIERARCHY EXAMPLE                ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    // Get all city officials with their details
    const cityOfficials = await client.query(`
      SELECT 
        co.id,
        u.full_name,
        u.email,
        u.phone,
        co.designation,
        co.corporation_name,
        c.city_name,
        d.district_name
      FROM city_officials co
      JOIN users u ON co.user_id = u.id
      LEFT JOIN cities c ON co.city_id = c.id
      LEFT JOIN districts d ON co.district_id = d.id
      WHERE co.city_id IS NOT NULL
      ORDER BY c.city_name, co.designation
    `);

    if (cityOfficials.rows.length === 0) {
      log('❌ No city officials found with valid locations', colors.red);
      return;
    }

    // Display each city official and their subordinates
    for (const official of cityOfficials.rows) {
      log('═══════════════════════════════════════════════════════════', colors.bright + colors.green);
      log(`🏛️  CITY COMMISSIONER`, colors.bright + colors.green);
      log('═══════════════════════════════════════════════════════════', colors.bright + colors.green);
      log(`Name:         ${official.full_name}`, colors.cyan);
      log(`Designation:  ${official.designation}`, colors.cyan);
      log(`Corporation:  ${official.corporation_name || 'N/A'}`, colors.cyan);
      log(`Location:     ${official.city_name}, ${official.district_name}`, colors.cyan);
      log(`Email:        ${official.email}`, colors.blue);
      log(`Phone:        ${official.phone || 'N/A'}`, colors.blue);
      log(`ID:           ${official.id}`, colors.reset);

      // Get ward officers under this city official
      const wardOfficers = await client.query(`
        SELECT 
          wo.id,
          u.full_name,
          u.email,
          u.phone,
          wo.ward_number,
          wo.zone,
          c.city_name,
          d.district_name
        FROM ward_officers wo
        JOIN users u ON wo.user_id = u.id
        LEFT JOIN cities c ON wo.city_id = c.id
        LEFT JOIN districts d ON wo.district_id = d.id
        WHERE wo.reports_to_city_official_id = $1
        ORDER BY wo.ward_number
      `, [official.id]);

      log('\n┌───────────────────────────────────────────────────────────┐', colors.yellow);
      log('│  WARD OFFICERS REPORTING TO THIS COMMISSIONER            │', colors.yellow);
      log('└───────────────────────────────────────────────────────────┘', colors.yellow);

      if (wardOfficers.rows.length === 0) {
        log('  ⚠️  No ward officers found under this commissioner', colors.yellow);
      } else {
        wardOfficers.rows.forEach((wo, index) => {
          log(`\n  ${index + 1}. Ward Officer - Ward ${wo.ward_number}`, colors.bright + colors.blue);
          log(`     ├─ Name:     ${wo.full_name}`, colors.blue);
          log(`     ├─ Zone:     ${wo.zone || 'N/A'}`, colors.blue);
          log(`     ├─ Location: ${wo.city_name}, ${wo.district_name}`, colors.blue);
          log(`     ├─ Email:    ${wo.email}`, colors.reset);
          log(`     ├─ Phone:    ${wo.phone || 'N/A'}`, colors.reset);
          log(`     └─ ID:       ${wo.id}`, colors.reset);
        });
      }

      // Get department officers under this city official
      const deptOfficers = await client.query(`
        SELECT 
          do_tbl.id,
          u.full_name,
          u.email,
          do_tbl.staff_id,
          do_tbl.role,
          do_tbl.specialization,
          do_tbl.status,
          do_tbl.workload,
          d.name as department_name
        FROM departmentofficers do_tbl
        JOIN users u ON do_tbl.user_id = u.id
        LEFT JOIN departments d ON do_tbl.department_id = d.id
        WHERE do_tbl.reports_to_city_official_id = $1
        ORDER BY d.name, do_tbl.role
        LIMIT 10
      `, [official.id]);

      log('\n┌───────────────────────────────────────────────────────────┐', colors.magenta);
      log('│  DEPARTMENT OFFICERS REPORTING TO THIS COMMISSIONER      │', colors.magenta);
      log('└───────────────────────────────────────────────────────────┘', colors.magenta);

      if (deptOfficers.rows.length === 0) {
        log('  ⚠️  No department officers found under this commissioner', colors.yellow);
      } else {
        log(`  (Showing first 10 of ${deptOfficers.rows.length} officers)\n`, colors.reset);
        
        deptOfficers.rows.forEach((dept, index) => {
          log(`  ${index + 1}. ${dept.role} - ${dept.department_name || 'Unknown Dept'}`, colors.bright + colors.magenta);
          log(`     ├─ Name:           ${dept.full_name}`, colors.magenta);
          log(`     ├─ Staff ID:       ${dept.staff_id || 'N/A'}`, colors.magenta);
          log(`     ├─ Specialization: ${dept.specialization || 'N/A'}`, colors.magenta);
          log(`     ├─ Status:         ${dept.status}`, colors.magenta);
          log(`     ├─ Workload:       ${dept.workload} tasks`, colors.magenta);
          log(`     ├─ Email:          ${dept.email}`, colors.reset);
          log(`     └─ ID:             ${dept.id}`, colors.reset);
        });
      }

      log('\n');
    }

    // Show hierarchy using the view
    log('═══════════════════════════════════════════════════════════', colors.bright + colors.cyan);
    log('📊 USING THE city_hierarchy_structure VIEW', colors.bright + colors.cyan);
    log('═══════════════════════════════════════════════════════════', colors.bright + colors.cyan);
    
    const hierarchyView = await client.query(`
      SELECT 
        city_official_name,
        city_official_designation,
        city,
        ward_officer_name,
        ward_number,
        zone,
        dept_officer_name,
        dept_officer_role,
        department_name
      FROM city_hierarchy_structure
      WHERE city_official_name IS NOT NULL
      ORDER BY city, ward_number, department_name
      LIMIT 15
    `);

    if (hierarchyView.rows.length > 0) {
      log('\nFlattened Hierarchy View (first 15 rows):\n', colors.cyan);
      
      let currentCommissioner = '';
      let currentWard = '';
      
      hierarchyView.rows.forEach(row => {
        if (row.city_official_name !== currentCommissioner) {
          currentCommissioner = row.city_official_name;
          log(`\n🏛️  ${row.city_official_name} (${row.city_official_designation})`, colors.bright + colors.green);
          log(`   Location: ${row.city}`, colors.green);
        }
        
        if (row.ward_officer_name && row.ward_number !== currentWard) {
          currentWard = row.ward_number;
          log(`   ├─ 👤 ${row.ward_officer_name} (Ward ${row.ward_number}, Zone: ${row.zone || 'N/A'})`, colors.blue);
        }
        
        if (row.dept_officer_name) {
          const prefix = row.ward_officer_name ? '   │  └─' : '   └─';
          log(`   ${prefix} 👷 ${row.dept_officer_name} (${row.dept_officer_role}) - ${row.department_name || 'Unknown'}`, colors.magenta);
        }
      });
    }

    // Show SQL query example
    log('\n\n═══════════════════════════════════════════════════════════', colors.bright + colors.yellow);
    log('💡 SQL QUERY TO GET THIS DATA', colors.bright + colors.yellow);
    log('═══════════════════════════════════════════════════════════', colors.bright + colors.yellow);
    
    log('\n-- Get a specific commissioner and their ward officers:', colors.cyan);
    log(`
SELECT 
  co.id as commissioner_id,
  u_co.full_name as commissioner_name,
  co.designation,
  co.city,
  wo.id as ward_officer_id,
  u_wo.full_name as ward_officer_name,
  wo.ward_number,
  wo.zone
FROM city_officials co
JOIN users u_co ON co.user_id = u_co.id
LEFT JOIN ward_officers wo ON wo.reports_to_city_official_id = co.id
LEFT JOIN users u_wo ON wo.user_id = u_wo.id
WHERE co.city_id IS NOT NULL
ORDER BY co.city, wo.ward_number;
    `.trim(), colors.reset);

    log('\n-- Or use the pre-built view:', colors.cyan);
    log(`
SELECT * FROM city_hierarchy_structure
WHERE city = 'Ambernath'
ORDER BY ward_number;
    `.trim(), colors.reset);

    log('\n\n✅ Hierarchy example complete!\n', colors.green);

  } catch (error) {
    log('\n❌ Error:', colors.red);
    log(error.message, colors.red);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

showHierarchyExample();
