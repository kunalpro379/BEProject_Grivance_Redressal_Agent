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

async function redistributeDeptOfficers() {
  const client = await pool.connect();
  
  try {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║     REDISTRIBUTING DEPARTMENT OFFICERS TO WARD OFFICERS     ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    await client.query('BEGIN');

    // Get the 2 ward officers under Kavita Joshi
    const wardOfficers = await client.query(`
      SELECT 
        wo.id,
        u.full_name,
        wo.ward_number,
        wo.reports_to_city_official_id
      FROM ward_officers wo
      JOIN users u ON wo.user_id = u.id
      WHERE wo.reports_to_city_official_id = '2dd46e86-3e43-4cdb-951e-1436a790b3ed'
      ORDER BY wo.ward_number
    `);

    log(`Found ${wardOfficers.rows.length} ward officers:`, colors.blue);
    wardOfficers.rows.forEach(wo => {
      log(`  - ${wo.full_name} (${wo.ward_number})`, colors.blue);
    });

    // Get all department officers currently under Vikram Singh
    const deptOfficers = await client.query(`
      SELECT 
        do_tbl.id,
        u.full_name,
        do_tbl.role,
        d.name as department_name,
        do_tbl.staff_id
      FROM departmentofficers do_tbl
      JOIN users u ON do_tbl.user_id = u.id
      LEFT JOIN departments d ON do_tbl.department_id = d.id
      WHERE do_tbl.reports_to_city_official_id = '1d81fdcb-beba-4afb-8602-8443e837b9c8'
        AND do_tbl.reports_to_ward_officer_id IS NULL
      ORDER BY d.name, do_tbl.role
    `);

    log(`\nFound ${deptOfficers.rows.length} department officers to redistribute\n`, colors.magenta);

    if (wardOfficers.rows.length === 0) {
      log('❌ No ward officers found to redistribute to!', colors.red);
      await client.query('ROLLBACK');
      return;
    }

    // Distribute department officers evenly among ward officers
    const officersPerWard = Math.ceil(deptOfficers.rows.length / wardOfficers.rows.length);
    
    log(`📊 Distribution Plan:`, colors.cyan);
    log(`   Total Department Officers: ${deptOfficers.rows.length}`, colors.cyan);
    log(`   Total Ward Officers: ${wardOfficers.rows.length}`, colors.cyan);
    log(`   Officers per Ward: ~${officersPerWard}\n`, colors.cyan);

    let officerIndex = 0;
    
    for (let i = 0; i < wardOfficers.rows.length; i++) {
      const wardOfficer = wardOfficers.rows[i];
      const isLastWard = i === wardOfficers.rows.length - 1;
      
      // Calculate how many officers this ward should get
      const remainingOfficers = deptOfficers.rows.length - officerIndex;
      const remainingWards = wardOfficers.rows.length - i;
      const officersForThisWard = isLastWard ? remainingOfficers : Math.ceil(remainingOfficers / remainingWards);
      
      log(`${'─'.repeat(80)}`, colors.blue);
      log(`👤 Ward Officer: ${wardOfficer.full_name} (${wardOfficer.ward_number})`, colors.bright + colors.blue);
      log(`${'─'.repeat(80)}`, colors.blue);
      log(`   Assigning ${officersForThisWard} department officers:\n`, colors.blue);
      
      for (let j = 0; j < officersForThisWard && officerIndex < deptOfficers.rows.length; j++, officerIndex++) {
        const deptOfficer = deptOfficers.rows[officerIndex];
        
        // Update the department officer to report to this ward officer
        await client.query(`
          UPDATE departmentofficers
          SET reports_to_ward_officer_id = $1,
              ward_id = (SELECT ward_id FROM ward_officers WHERE id = $1)
          WHERE id = $2
        `, [wardOfficer.id, deptOfficer.id]);
        
        log(`   ✓ ${(j + 1).toString().padStart(2)}. ${deptOfficer.full_name.padEnd(30)} - ${deptOfficer.role}`, colors.green);
        log(`      Department: ${deptOfficer.department_name || 'N/A'}`, colors.reset);
      }
      log('');
    }

    await client.query('COMMIT');

    // Verification
    log('\n╔════════════════════════════════════════════════════════════╗', colors.green);
    log('║                    VERIFICATION                             ║', colors.green);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.green);

    for (const wardOfficer of wardOfficers.rows) {
      const count = await client.query(`
        SELECT COUNT(*) as count
        FROM departmentofficers
        WHERE reports_to_ward_officer_id = $1
      `, [wardOfficer.id]);
      
      log(`✓ ${wardOfficer.full_name} (${wardOfficer.ward_number}): ${count.rows[0].count} department officers`, colors.green);
    }

    // Check if any officers are still directly under commissioner
    const remainingDirect = await client.query(`
      SELECT COUNT(*) as count
      FROM departmentofficers
      WHERE reports_to_city_official_id = '1d81fdcb-beba-4afb-8602-8443e837b9c8'
        AND reports_to_ward_officer_id IS NULL
    `);

    log(`\n📊 Officers still directly under Vikram Singh: ${remainingDirect.rows[0].count}`, colors.cyan);

    log('\n╔════════════════════════════════════════════════════════════╗', colors.green);
    log('║         ✅ REDISTRIBUTION COMPLETE!                        ║', colors.green);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.green);

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

redistributeDeptOfficers();
