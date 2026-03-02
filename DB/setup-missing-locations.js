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

async function setupLocations() {
  const client = await pool.connect();
  
  try {
    log('\n========================================', colors.cyan);
    log('  SETTING UP MISSING LOCATIONS', colors.bright + colors.yellow);
    log('========================================\n', colors.cyan);

    // 1. Check existing states
    log('🗺️  Checking existing states...', colors.yellow);
    const states = await client.query('SELECT * FROM states ORDER BY state_name');
    if (states.rows.length > 0) {
      log(`Found ${states.rows.length} states:`, colors.green);
      states.rows.forEach(s => log(`  - ${s.state_name} (${s.state_code})`, colors.blue));
    } else {
      log('No states found!', colors.red);
    }

    // 2. Check existing districts
    log('\n🏙️  Checking existing districts...', colors.yellow);
    const districts = await client.query(`
      SELECT d.*, s.state_name 
      FROM districts d
      JOIN states s ON d.state_id = s.id
      ORDER BY s.state_name, d.district_name
    `);
    if (districts.rows.length > 0) {
      log(`Found ${districts.rows.length} districts:`, colors.green);
      districts.rows.forEach(d => log(`  - ${d.district_name} in ${d.state_name}`, colors.blue));
    } else {
      log('No districts found!', colors.red);
    }

    // 3. Check existing cities
    log('\n🏘️  Checking existing cities...', colors.yellow);
    const cities = await client.query(`
      SELECT c.*, d.district_name, s.state_name 
      FROM cities c
      JOIN districts d ON c.district_id = d.id
      JOIN states s ON d.state_id = s.id
      ORDER BY s.state_name, d.district_name, c.city_name
    `);
    if (cities.rows.length > 0) {
      log(`Found ${cities.rows.length} cities:`, colors.green);
      cities.rows.forEach(c => log(`  - ${c.city_name} in ${c.district_name}, ${c.state_name}`, colors.blue));
    } else {
      log('No cities found!', colors.red);
    }

    // 4. Create Maharashtra state if not exists
    log('\n🔧 Creating Maharashtra state (if not exists)...', colors.yellow);
    const maharashtraResult = await client.query(`
      INSERT INTO states (state_name, state_code, capital, is_active)
      VALUES ('Maharashtra', 'MH', 'Mumbai', true)
      ON CONFLICT (state_code) DO UPDATE SET state_name = EXCLUDED.state_name
      RETURNING id, state_name
    `);
    const maharashtraId = maharashtraResult.rows[0].id;
    log(`✓ Maharashtra state ready (ID: ${maharashtraId})`, colors.green);

    // 5. Create Thane district
    log('\n🔧 Creating Thane district...', colors.yellow);
    const thaneDistrictResult = await client.query(`
      INSERT INTO districts (state_id, district_name, district_code, headquarters, is_active)
      VALUES ($1, 'Thane', 'TH', 'Thane', true)
      ON CONFLICT (district_code) DO UPDATE SET district_name = EXCLUDED.district_name
      RETURNING id, district_name
    `, [maharashtraId]);
    const thaneDistrictId = thaneDistrictResult.rows[0].id;
    log(`✓ Thane district ready (ID: ${thaneDistrictId})`, colors.green);

    // 6. Create cities
    log('\n🔧 Creating cities...', colors.yellow);
    
    const citiesToCreate = [
      { name: 'Thane', code: 'THN', type: 'Municipal Corporation' },
      { name: 'Ambernath', code: 'AMB', type: 'Municipal Corporation' },
      { name: 'Mumbai', code: 'MUM', type: 'Municipal Corporation' }
    ];

    for (const city of citiesToCreate) {
      const cityResult = await client.query(`
        INSERT INTO cities (district_id, city_name, city_code, city_type, is_active)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (city_code) DO UPDATE SET city_name = EXCLUDED.city_name
        RETURNING id, city_name
      `, [thaneDistrictId, city.name, city.code, city.type]);
      log(`✓ ${city.name} city ready (ID: ${cityResult.rows[0].id})`, colors.green);
    }

    // 7. Now fix the links
    log('\n🔗 Fixing links with new locations...', colors.yellow);
    
    await client.query('BEGIN');
    
    try {
      // Fix city officials
      const cityOfficialsFix = await client.query(`
        UPDATE city_officials co
        SET 
          city_id = c.id,
          district_id = d.id
        FROM cities c
        JOIN districts d ON c.district_id = d.id
        WHERE (
          LOWER(TRIM(co.city)) = LOWER(TRIM(c.city_name))
          OR LOWER(TRIM(co.city)) LIKE '%' || LOWER(TRIM(c.city_name)) || '%'
        )
        AND (
          LOWER(TRIM(co.district)) = LOWER(TRIM(d.district_name))
          OR LOWER(TRIM(co.district)) LIKE '%' || LOWER(TRIM(d.district_name)) || '%'
        )
        AND (co.city_id IS NULL OR co.district_id IS NULL)
        RETURNING co.id, co.city, co.district
      `);
      log(`✓ Fixed ${cityOfficialsFix.rowCount} city officials`, colors.green);
      if (cityOfficialsFix.rowCount > 0) {
        cityOfficialsFix.rows.forEach(row => {
          log(`  - Linked: ${row.city}, ${row.district}`, colors.blue);
        });
      }

      // Fix ward officers
      const wardOfficersFix = await client.query(`
        UPDATE ward_officers wo
        SET 
          city_id = c.id,
          district_id = d.id
        FROM cities c
        JOIN districts d ON c.district_id = d.id
        WHERE (
          LOWER(TRIM(wo.city)) = LOWER(TRIM(c.city_name))
          OR LOWER(TRIM(wo.city)) LIKE '%' || LOWER(TRIM(c.city_name)) || '%'
        )
        AND (
          LOWER(TRIM(wo.district)) = LOWER(TRIM(d.district_name))
          OR LOWER(TRIM(wo.district)) LIKE '%' || LOWER(TRIM(d.district_name)) || '%'
        )
        AND (wo.city_id IS NULL OR wo.district_id IS NULL)
        RETURNING wo.id, wo.city, wo.district
      `);
      log(`✓ Fixed ${wardOfficersFix.rowCount} ward officers (location)`, colors.green);

      // Link ward officers to city officials
      const wardToCity = await client.query(`
        UPDATE ward_officers wo
        SET reports_to_city_official_id = co.id
        FROM city_officials co
        WHERE wo.city_id = co.city_id
        AND wo.reports_to_city_official_id IS NULL
        RETURNING wo.id
      `);
      log(`✓ Linked ${wardToCity.rowCount} ward officers to city officials`, colors.green);

      // Fix department officers
      const deptOfficersFix = await client.query(`
        UPDATE departmentofficers do_tbl
        SET city_id = c.id
        FROM cities c
        WHERE (
          LOWER(TRIM(do_tbl.zone)) = LOWER(TRIM(c.city_name))
          OR LOWER(TRIM(do_tbl.zone)) LIKE '%' || LOWER(TRIM(c.city_name)) || '%'
        )
        AND do_tbl.city_id IS NULL
        RETURNING do_tbl.id
      `);
      log(`✓ Fixed ${deptOfficersFix.rowCount} department officers (location)`, colors.green);

      // Link department officers to city officials
      const deptToCity = await client.query(`
        UPDATE departmentofficers do_tbl
        SET reports_to_city_official_id = co.id
        FROM city_officials co
        WHERE do_tbl.city_id = co.city_id
        AND do_tbl.reports_to_city_official_id IS NULL
        AND do_tbl.reports_to_ward_officer_id IS NULL
        RETURNING do_tbl.id
      `);
      log(`✓ Linked ${deptToCity.rowCount} department officers to city officials`, colors.green);

      await client.query('COMMIT');
      log('\n✓ All fixes committed', colors.green);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // 8. Final report
    log('\n📊 Final Hierarchy Report:', colors.cyan);
    const finalReport = await client.query('SELECT * FROM generate_hierarchy_report()');
    finalReport.rows.forEach(row => {
      const color = row.metric.includes('Linked') && row.count > 0 ? colors.green : colors.blue;
      log(`  ${row.metric}: ${row.count}`, color);
    });

    // Check remaining issues
    const stillMissing = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM city_officials_missing_fk) as city_officials,
        (SELECT COUNT(*) FROM ward_officers_missing_supervisor) as ward_officers,
        (SELECT COUNT(*) FROM dept_officers_missing_supervisor) as dept_officers
    `);
    
    const remaining = stillMissing.rows[0];
    if (remaining.city_officials == 0 && remaining.ward_officers == 0 && remaining.dept_officers == 0) {
      log('\n✅ All links fixed successfully!', colors.bright + colors.green);
    } else {
      log('\n⚠️  Some issues remain:', colors.yellow);
      if (remaining.city_officials > 0) {
        log(`  - ${remaining.city_officials} city officials with invalid city/district names`, colors.yellow);
        const invalid = await client.query(`
          SELECT city, district FROM city_officials_missing_fk LIMIT 5
        `);
        invalid.rows.forEach(row => {
          log(`    • ${row.city}, ${row.district}`, colors.red);
        });
      }
    }

    log('\n========================================', colors.cyan);
    log('  ✅ LOCATION SETUP COMPLETED', colors.bright + colors.green);
    log('========================================\n', colors.cyan);

  } catch (error) {
    log('\n❌ Error:', colors.red);
    log(error.message, colors.red);
    log(error.stack, colors.reset);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupLocations().catch(error => {
  log(`\nUnexpected error: ${error.message}`, colors.red);
  process.exit(1);
});
