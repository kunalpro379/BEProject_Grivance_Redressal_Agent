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
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function showCompleteHierarchy() {
  const client = await pool.connect();
  
  try {
    log('\n' + '═'.repeat(100), colors.cyan);
    log('           COMPLETE HIERARCHY: COMMISSIONER → WARD OFFICERS → DEPARTMENT OFFICERS', colors.bright + colors.cyan);
    log('═'.repeat(100) + '\n', colors.cyan);

    // Get commissioners with ward officers
    const commissioners = await client.query(`
      SELECT DISTINCT
        co.id as commissioner_id,
        u_co.full_name as commissioner_name,
        co.designation,
        c.city_name,
        d.district_name
      FROM city_officials co
      JOIN users u_co ON co.user_id = u_co.id
      LEFT JOIN cities c ON co.city_id = c.id
      LEFT JOIN districts d ON co.district_id = d.id
      WHERE co.city_id IS NOT NULL
      ORDER BY c.city_name, u_co.full_name
    `);

    for (const commissioner of commissioners.rows) {
      // Get ward officers under this commissioner
      const wardOfficers = await client.query(`
        SELECT 
          wo.id,
          u.full_name,
          wo.ward_number,
          wo.zone
        FROM ward_officers wo
        JOIN users u ON wo.user_id = u.id
        WHERE wo.reports_to_city_official_id = $1
        ORDER BY wo.ward_number
      `, [commissioner.commissioner_id]);

      // Get department officers directly under commissioner
      const directDeptOfficers = await client.query(`
        SELECT 
          do_tbl.id,
          u.full_name,
          do_tbl.staff_id,
          do_tbl.role,
          d.name as department_name
        FROM departmentofficers do_tbl
        JOIN users u ON do_tbl.user_id = u.id
        LEFT JOIN departments d ON do_tbl.department_id = d.id
        WHERE do_tbl.reports_to_city_official_id = $1
          AND do_tbl.reports_to_ward_officer_id IS NULL
        ORDER BY d.name, do_tbl.role
      `, [commissioner.commissioner_id]);

      // Only show commissioners that have ward officers or department officers
      if (wardOfficers.rows.length > 0 || directDeptOfficers.rows.length > 0) {
        log('▓'.repeat(100), colors.green);
        log('🏛️  LEVEL 1: MUNICIPAL COMMISSIONER', colors.bright + colors.green);
        log('▓'.repeat(100), colors.green);
        log(`   Name:        ${commissioner.commissioner_name}`, colors.bright + colors.green);
        log(`   Designation: ${commissioner.designation}`, colors.green);
        log(`   Location:    ${commissioner.city_name}, ${commissioner.district_name}`, colors.green);
        log(`   ID:          ${commissioner.commissioner_id}`, colors.reset);

        // Show ward officers
        if (wardOfficers.rows.length > 0) {
          log(`\n   ${'─'.repeat(96)}`, colors.blue);
          log(`   👤 LEVEL 2: WARD OFFICERS (${wardOfficers.rows.length})`, colors.bright + colors.blue);
          log(`   ${'─'.repeat(96)}`, colors.blue);
          
          for (const wo of wardOfficers.rows) {
            log(`\n      ├─ Ward Officer: ${wo.full_name}`, colors.bright + colors.blue);
            log(`      │  Ward Number: ${wo.ward_number}`, colors.blue);
            log(`      │  Zone:        ${wo.zone || 'N/A'}`, colors.blue);
            log(`      │  ID:          ${wo.id}`, colors.reset);

            // Get department officers under this ward officer
            const wardDeptOfficers = await client.query(`
              SELECT 
                do_tbl.id,
                u.full_name,
                do_tbl.staff_id,
                do_tbl.role,
                do_tbl.status,
                do_tbl.workload,
                d.name as department_name
              FROM departmentofficers do_tbl
              JOIN users u ON do_tbl.user_id = u.id
              LEFT JOIN departments d ON do_tbl.department_id = d.id
              WHERE do_tbl.reports_to_ward_officer_id = $1
              ORDER BY d.name, do_tbl.role
            `, [wo.id]);

            if (wardDeptOfficers.rows.length > 0) {
              log(`      │`, colors.blue);
              log(`      │  ${'─'.repeat(88)}`, colors.magenta);
              log(`      │  👷 LEVEL 3: DEPARTMENT OFFICERS (${wardDeptOfficers.rows.length})`, colors.bright + colors.magenta);
              log(`      │  ${'─'.repeat(88)}`, colors.magenta);
              
              wardDeptOfficers.rows.forEach((dept, index) => {
                const isLast = index === wardDeptOfficers.rows.length - 1;
                const prefix = isLast ? '└─' : '├─';
                const continuation = isLast ? '   ' : '│  ';
                
                log(`      │     ${prefix} ${dept.full_name}`, colors.bright + colors.magenta);
                log(`      │     ${continuation}   Role:       ${dept.role}`, colors.magenta);
                log(`      │     ${continuation}   Department: ${dept.department_name || 'N/A'}`, colors.magenta);
                log(`      │     ${continuation}   Staff ID:   ${dept.staff_id || 'N/A'}`, colors.magenta);
                log(`      │     ${continuation}   Status:     ${dept.status}`, colors.magenta);
                log(`      │     ${continuation}   Workload:   ${dept.workload} tasks`, colors.magenta);
                if (!isLast) log(`      │     │`, colors.magenta);
              });
            } else {
              log(`      │  (No department officers under this ward)`, colors.yellow);
            }
            log(`      │`, colors.blue);
          }
        }

        // Show department officers directly under commissioner (not under any ward)
        if (directDeptOfficers.rows.length > 0) {
          log(`\n   ${'─'.repeat(96)}`, colors.magenta);
          log(`   👷 LEVEL 3: DEPARTMENT OFFICERS (Directly under Commissioner) (${directDeptOfficers.rows.length})`, colors.bright + colors.magenta);
          log(`   ${'─'.repeat(96)}`, colors.magenta);
          
          directDeptOfficers.rows.forEach((dept, index) => {
            log(`\n      ${index + 1}. ${dept.full_name}`, colors.bright + colors.magenta);
            log(`         Role:       ${dept.role}`, colors.magenta);
            log(`         Department: ${dept.department_name || 'N/A'}`, colors.magenta);
            log(`         Staff ID:   ${dept.staff_id || 'N/A'}`, colors.magenta);
          });
        }

        log('\n' + '═'.repeat(100) + '\n', colors.cyan);
      }
    }

    // Summary
    log('═'.repeat(100), colors.cyan);
    log('                                    SUMMARY', colors.bright + colors.cyan);
    log('═'.repeat(100), colors.cyan);

    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM city_officials WHERE city_id IS NOT NULL) as total_commissioners,
        (SELECT COUNT(*) FROM ward_officers WHERE reports_to_city_official_id IS NOT NULL) as total_ward_officers,
        (SELECT COUNT(*) FROM departmentofficers WHERE reports_to_city_official_id IS NOT NULL OR reports_to_ward_officer_id IS NOT NULL) as total_dept_officers,
        (SELECT COUNT(*) FROM departmentofficers WHERE reports_to_ward_officer_id IS NOT NULL) as dept_under_wards,
        (SELECT COUNT(*) FROM departmentofficers WHERE reports_to_city_official_id IS NOT NULL AND reports_to_ward_officer_id IS NULL) as dept_under_commissioners
    `);

    const summary = stats.rows[0];
    log(`\n📊 Total Municipal Commissioners:                    ${summary.total_commissioners}`, colors.green);
    log(`📊 Total Ward Officers:                              ${summary.total_ward_officers}`, colors.blue);
    log(`📊 Total Department Officers:                        ${summary.total_dept_officers}`, colors.magenta);
    log(`   ├─ Under Ward Officers:                           ${summary.dept_under_wards}`, colors.magenta);
    log(`   └─ Directly under Commissioners:                  ${summary.dept_under_commissioners}`, colors.magenta);
    log(`\n📊 Total Officers in Complete Hierarchy:             ${parseInt(summary.total_commissioners) + parseInt(summary.total_ward_officers) + parseInt(summary.total_dept_officers)}`, colors.bright + colors.cyan);

    log('\n' + '═'.repeat(100) + '\n', colors.cyan);

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

showCompleteHierarchy();
