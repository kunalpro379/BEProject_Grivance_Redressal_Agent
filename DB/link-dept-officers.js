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

async function linkDeptOfficers() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔗 Linking department officers to city officials...\n');
    
    // Link all department officers without supervisor to any available city official
    const result = await client.query(`
      UPDATE departmentofficers do_tbl
      SET reports_to_city_official_id = (
        SELECT id FROM city_officials 
        WHERE city_id IS NOT NULL 
        ORDER BY id 
        LIMIT 1
      )
      WHERE reports_to_city_official_id IS NULL 
      AND reports_to_ward_officer_id IS NULL
      RETURNING id
    `);
    
    console.log(`✅ Linked ${result.rowCount} department officers to city officials\n`);
    
    // Show final report
    const report = await client.query('SELECT * FROM generate_hierarchy_report()');
    console.log('📊 Final Hierarchy Report:');
    report.rows.forEach(row => {
      console.log(`  ${row.metric}: ${row.count}`);
    });
    
    // Check for any remaining issues
    const remaining = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM ward_officers_missing_supervisor) as ward_officers,
        (SELECT COUNT(*) FROM dept_officers_missing_supervisor) as dept_officers
    `);
    
    console.log('\n✅ Hierarchy Status:');
    if (remaining.rows[0].ward_officers == 0 && remaining.rows[0].dept_officers == 0) {
      console.log('  ✓ All officers properly linked!');
    } else {
      console.log(`  ⚠️  ${remaining.rows[0].ward_officers} ward officers still missing supervisor`);
      console.log(`  ⚠️  ${remaining.rows[0].dept_officers} dept officers still missing supervisor`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

linkDeptOfficers();
