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

function formatTable(rows, title) {
  if (rows.length === 0) {
    log(`\n${title}: No results found`, colors.yellow);
    return;
  }

  log(`\n${'═'.repeat(120)}`, colors.cyan);
  log(title, colors.bright + colors.cyan);
  log('═'.repeat(120), colors.cyan);
  log(`Total Rows: ${rows.length}\n`, colors.green);

  rows.forEach((row, index) => {
    log(`Row ${index + 1}:`, colors.bright + colors.yellow);
    log('─'.repeat(120), colors.yellow);
    
    Object.entries(row).forEach(([key, value]) => {
      const displayValue = value === null ? 'NULL' : value;
      const color = value === null ? colors.reset : colors.blue;
      log(`  ${key.padEnd(30)}: ${displayValue}`, color);
    });
    
    log('');
  });
}

async function runQueries() {
  const client = await pool.connect();
  
  try {
    log('\n╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗', colors.green);
    log('║                                    RUNNING HIERARCHY QUERIES                                                       ║', colors.green);
    log('╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝', colors.green);

    // Query 1: Get specific commissioner and subordinates
    log('\n\n📋 QUERY 1: Get specific commissioner and all their subordinates', colors.bright + colors.cyan);
    log('─'.repeat(120), colors.cyan);
    log(`
SELECT * FROM city_hierarchy_structure
WHERE city_official_id = '2dd46e86-3e43-4cdb-951e-1436a790b3ed'
ORDER BY ward_number, department_name;
    `.trim(), colors.reset);

    const query1Result = await client.query(`
      SELECT * FROM city_hierarchy_structure
      WHERE city_official_id = '2dd46e86-3e43-4cdb-951e-1436a790b3ed'
      ORDER BY ward_number, department_name
    `);

    formatTable(query1Result.rows, '📊 RESULTS FOR QUERY 1');

    // Query 2: Get by city name
    log('\n\n📋 QUERY 2: Get all hierarchy by city name', colors.bright + colors.cyan);
    log('─'.repeat(120), colors.cyan);
    log(`
SELECT * FROM city_hierarchy_structure
WHERE city = 'Thane'
ORDER BY ward_number, department_name;
    `.trim(), colors.reset);

    const query2Result = await client.query(`
      SELECT * FROM city_hierarchy_structure
      WHERE city = 'Thane'
      ORDER BY ward_number, department_name
    `);

    formatTable(query2Result.rows, '📊 RESULTS FOR QUERY 2');

    // Bonus: Show a cleaner summary view
    log('\n\n📋 BONUS: Cleaner Summary View', colors.bright + colors.magenta);
    log('─'.repeat(120), colors.magenta);
    
    const summaryQuery = await client.query(`
      SELECT 
        city_official_name as "Commissioner",
        city_official_designation as "Designation",
        city as "City",
        corporation_name as "Corporation",
        ward_officer_name as "Ward Officer",
        ward_number as "Ward #",
        zone as "Zone",
        dept_officer_name as "Department Officer",
        dept_officer_role as "Role",
        department_name as "Department",
        dept_officer_status as "Status",
        workload as "Workload"
      FROM city_hierarchy_structure
      WHERE city_official_id = '2dd46e86-3e43-4cdb-951e-1436a790b3ed'
      ORDER BY ward_number, department_name
    `);

    log('\n📊 FORMATTED SUMMARY:', colors.bright + colors.magenta);
    log('═'.repeat(120), colors.magenta);
    
    if (summaryQuery.rows.length > 0) {
      const commissioner = summaryQuery.rows[0];
      log(`\n🏛️  CITY COMMISSIONER`, colors.bright + colors.green);
      log(`   Name:         ${commissioner.Commissioner}`, colors.green);
      log(`   Designation:  ${commissioner.Designation}`, colors.green);
      log(`   City:         ${commissioner.City}`, colors.green);
      log(`   Corporation:  ${commissioner.Corporation || 'N/A'}`, colors.green);

      // Group by ward officers
      const wardOfficers = [...new Set(summaryQuery.rows
        .filter(r => r['Ward Officer'])
        .map(r => JSON.stringify({
          name: r['Ward Officer'],
          ward: r['Ward #'],
          zone: r.Zone
        })))].map(s => JSON.parse(s));

      if (wardOfficers.length > 0) {
        log(`\n   👥 WARD OFFICERS (${wardOfficers.length}):`, colors.bright + colors.blue);
        wardOfficers.forEach((wo, i) => {
          log(`      ${i + 1}. ${wo.name} - Ward ${wo.ward} ${wo.zone ? `(Zone: ${wo.zone})` : ''}`, colors.blue);
        });
      }

      // Group by department officers
      const deptOfficers = summaryQuery.rows.filter(r => r['Department Officer']);
      if (deptOfficers.length > 0) {
        log(`\n   👷 DEPARTMENT OFFICERS (${deptOfficers.length}):`, colors.bright + colors.magenta);
        deptOfficers.forEach((dept, i) => {
          log(`      ${i + 1}. ${dept['Department Officer']} - ${dept.Role}`, colors.magenta);
          log(`         Department: ${dept.Department || 'N/A'}`, colors.reset);
          log(`         Status: ${dept.Status} | Workload: ${dept.Workload} tasks`, colors.reset);
        });
      }
    }

    // Show hierarchy tree
    log('\n\n🌳 HIERARCHY TREE VIEW:', colors.bright + colors.cyan);
    log('═'.repeat(120), colors.cyan);
    
    const treeData = await client.query(`
      SELECT 
        city_official_name,
        city_official_designation,
        city,
        ward_officer_name,
        ward_number,
        dept_officer_name,
        dept_officer_role,
        department_name
      FROM city_hierarchy_structure
      WHERE city_official_id = '2dd46e86-3e43-4cdb-951e-1436a790b3ed'
      ORDER BY ward_number, department_name
    `);

    if (treeData.rows.length > 0) {
      const commissioner = treeData.rows[0];
      log(`\n${commissioner.city_official_name} (${commissioner.city_official_designation})`, colors.bright + colors.green);
      log(`└─ ${commissioner.city}`, colors.green);
      
      let currentWard = null;
      treeData.rows.forEach(row => {
        if (row.ward_officer_name && row.ward_number !== currentWard) {
          currentWard = row.ward_number;
          log(`   ├─ 👤 ${row.ward_officer_name} (Ward ${row.ward_number})`, colors.blue);
        }
        
        if (row.dept_officer_name) {
          const prefix = row.ward_officer_name ? '   │  ' : '   ';
          log(`${prefix}└─ 👷 ${row.dept_officer_name} (${row.dept_officer_role}) - ${row.department_name || 'Unknown'}`, colors.magenta);
        }
      });
    }

    log('\n\n✅ Queries completed successfully!\n', colors.green);

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

runQueries();
