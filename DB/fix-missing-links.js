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
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function fixMissingLinks() {
  const client = await pool.connect();
  
  try {
    log('\n========================================', colors.cyan);
    log('  FIXING MISSING LINKS', colors.bright + colors.yellow);
    log('========================================\n', colors.cyan);

    // 1. Check and display missing city officials
    log('🔍 Checking city officials...', colors.yellow);
    const missingCityOfficials = await client.query(`
      SELECT 
        co.id,
        u.full_name,
        co.city,
        co.district,
        co.designation
      FROM city_officials co
      JOIN users u ON co.user_id = u.id
      WHERE co.city_id IS NULL OR co.district_id IS NULL
    `);

    if (missingCityOfficials.rows.length > 0) {
      log(`\n⚠️  Found ${missingCityOfficials.rows.length} city officials with missing links:`, colors.yellow);
      missingCityOfficials.rows.forEach(row => {
        log(`  - ${row.full_name} (${row.designation}) in ${row.city}, ${row.district}`, colors.blue);
      });
    }

    // 2. Check and display missing ward officers
    log('\n🔍 Checking ward officers...', colors.yellow);
    const missingWardOfficers = await client.query(`
      SELECT 
        wo.id,
        u.full_name,
        wo.ward_number,
        wo.city,
        wo.district
      FROM ward_officers wo
      JOIN users u ON wo.user_id = u.id
      WHERE wo.reports_to_city_official_id IS NULL
    `);

    if (missingWardOfficers.rows.length > 0) {
      log(`\n⚠️  Found ${missingWardOfficers.rows.length} ward officers without supervisor:`, colors.yellow);
      missingWardOfficers.rows.forEach(row => {
        log(`  - ${row.full_name} (Ward ${row.ward_number}) in ${row.city}`, colors.blue);
      });
    }

    // 3. Check and display missing department officers
    log('\n🔍 Checking department officers...', colors.yellow);
    const missingDeptOfficers = await client.query(`
      SELECT 
        do_tbl.id,
        u.full_name,
        do_tbl.staff_id,
        do_tbl.role,
        d.name as department,
        do_tbl.zone,
        do_tbl.ward
      FROM departmentofficers do_tbl
      JOIN users u ON do_tbl.user_id = u.id
      LEFT JOIN departments d ON do_tbl.department_id = d.id
      WHERE do_tbl.reports_to_city_official_id IS NULL 
      AND do_tbl.reports_to_ward_officer_id IS NULL
    `);

    if (missingDeptOfficers.rows.length > 0) {
      log(`\n⚠️  Found ${missingDeptOfficers.rows.length} department officers without supervisor:`, colors.yellow);
      missingDeptOfficers.rows.forEach(row => {
        log(`  - ${row.full_name} (${row.role}) in ${row.department || 'Unknown Dept'}`, colors.blue);
      });
    }

    // 4. Attempt automatic fixes
    log('\n🔧 Attempting automatic fixes...', colors.yellow);
    
    await client.query('BEGIN');
    
    try {
      // Fix city officials by matching city/district names (case-insensitive, trimmed)
      const cityOfficialsFix = await client.query(`
        UPDATE city_officials co
        SET 
          city_id = c.id,
          district_id = d.id
        FROM cities c
        JOIN districts d ON c.district_id = d.id
        WHERE LOWER(TRIM(co.city)) = LOWER(TRIM(c.city_name))
        AND LOWER(TRIM(co.district)) = LOWER(TRIM(d.district_name))
        AND (co.city_id IS NULL OR co.district_id IS NULL)
        RETURNING co.id
      `);
      log(`✓ Fixed ${cityOfficialsFix.rowCount} city officials`, colors.green);

      // Fix ward officers by matching city and linking to city officials
      const wardOfficersFix = await client.query(`
        UPDATE ward_officers wo
        SET 
          city_id = c.id,
          district_id = d.id
        FROM cities c
        JOIN districts d ON c.district_id = d.id
        WHERE LOWER(TRIM(wo.city)) = LOWER(TRIM(c.city_name))
        AND LOWER(TRIM(wo.district)) = LOWER(TRIM(d.district_name))
        AND (wo.city_id IS NULL OR wo.district_id IS NULL)
        RETURNING wo.id
      `);
      log(`✓ Fixed ${wardOfficersFix.rowCount} ward officers (city/district links)`, colors.green);

      // Link ward officers to city officials in the same city
      const wardToCity = await client.query(`
        UPDATE ward_officers wo
        SET reports_to_city_official_id = co.id
        FROM city_officials co
        WHERE wo.city_id = co.city_id
        AND co.designation ILIKE '%commissioner%'
        AND wo.reports_to_city_official_id IS NULL
        RETURNING wo.id
      `);
      log(`✓ Linked ${wardToCity.rowCount} ward officers to city officials`, colors.green);

      // For department officers, try to link based on zone/ward
      const deptOfficersFix = await client.query(`
        UPDATE departmentofficers do_tbl
        SET 
          city_id = c.id
        FROM cities c
        WHERE LOWER(TRIM(do_tbl.zone)) = LOWER(TRIM(c.city_name))
        AND do_tbl.city_id IS NULL
        RETURNING do_tbl.id
      `);
      log(`✓ Fixed ${deptOfficersFix.rowCount} department officers (city links)`, colors.green);

      // Link department officers to ward officers if they have ward assignment
      const deptToWard = await client.query(`
        UPDATE departmentofficers do_tbl
        SET 
          ward_id = w.id,
          reports_to_ward_officer_id = wo.id
        FROM wards w
        JOIN ward_officers wo ON wo.ward_id = w.id
        WHERE w.ward_number = do_tbl.ward
        AND w.city_id = do_tbl.city_id
        AND do_tbl.reports_to_ward_officer_id IS NULL
        AND do_tbl.ward IS NOT NULL
        RETURNING do_tbl.id
      `);
      log(`✓ Linked ${deptToWard.rowCount} department officers to ward officers`, colors.green);

      // Link remaining department officers directly to city officials
      const deptToCity = await client.query(`
        UPDATE departmentofficers do_tbl
        SET reports_to_city_official_id = co.id
        FROM city_officials co
        WHERE do_tbl.city_id = co.city_id
        AND do_tbl.reports_to_city_official_id IS NULL
        AND do_tbl.reports_to_ward_officer_id IS NULL
        AND co.designation ILIKE '%commissioner%'
        RETURNING do_tbl.id
      `);
      log(`✓ Linked ${deptToCity.rowCount} department officers to city officials`, colors.green);

      await client.query('COMMIT');
      log('\n✓ All automatic fixes committed', colors.green);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // 5. Re-check for remaining issues
    log('\n🔍 Re-checking for remaining issues...', colors.yellow);
    
    const stillMissingCityOfficials = await client.query('SELECT COUNT(*) as count FROM city_officials_missing_fk');
    const stillMissingWardOfficers = await client.query('SELECT COUNT(*) as count FROM ward_officers_missing_supervisor');
    const stillMissingDeptOfficers = await client.query('SELECT COUNT(*) as count FROM dept_officers_missing_supervisor');
    
    const cityCount = parseInt(stillMissingCityOfficials.rows[0].count);
    const wardCount = parseInt(stillMissingWardOfficers.rows[0].count);
    const deptCount = parseInt(stillMissingDeptOfficers.rows[0].count);
    
    if (cityCount === 0 && wardCount === 0 && deptCount === 0) {
      log('\n✅ All links fixed successfully!', colors.bright + colors.green);
    } else {
      log('\n⚠️  Some issues remain:', colors.yellow);
      if (cityCount > 0) log(`  - ${cityCount} city officials still need manual fixing`, colors.yellow);
      if (wardCount > 0) log(`  - ${wardCount} ward officers still need manual fixing`, colors.yellow);
      if (deptCount > 0) log(`  - ${deptCount} department officers still need manual fixing`, colors.yellow);
      
      log('\n💡 Manual fix required:', colors.cyan);
      log('  These records likely have city/district names that don\'t match the cities/districts tables.', colors.blue);
      log('  You can fix them manually with SQL updates or by creating the missing cities/districts.', colors.blue);
    }

    // 6. Show final report
    log('\n📊 Final Hierarchy Report:', colors.cyan);
    const finalReport = await client.query('SELECT * FROM generate_hierarchy_report()');
    finalReport.rows.forEach(row => {
      log(`  ${row.metric}: ${row.count}`, colors.blue);
    });

    log('\n========================================', colors.cyan);
    log('  ✅ LINK FIXING COMPLETED', colors.bright + colors.green);
    log('========================================\n', colors.cyan);

  } catch (error) {
    log('\n❌ Error:', colors.red);
    log(error.message, colors.red);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixMissingLinks().catch(error => {
  log(`\nUnexpected error: ${error.message}`, colors.red);
  process.exit(1);
});
