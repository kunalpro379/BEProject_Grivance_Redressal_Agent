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
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function getCredentials() {
  const client = await pool.connect();
  
  try {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         FETCHING USER CREDENTIALS                           ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    // First check the users table structure
    const tableStructure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    log('📋 Users Table Structure:', colors.cyan);
    tableStructure.rows.forEach(col => {
      log(`   - ${col.column_name.padEnd(20)} (${col.data_type})`, colors.reset);
    });

    // Check if password_hash exists
    const hasPasswordHash = tableStructure.rows.some(col => col.column_name === 'password_hash');
    const passwordColumn = hasPasswordHash ? 'password_hash' : 'password';

    // Get one Municipal Commissioner
    log('\n🏛️  MUNICIPAL COMMISSIONER:', colors.bright + colors.green);
    log('─'.repeat(60), colors.green);

    const commissioner = await client.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.${passwordColumn} as password,
        u.role,
        co.designation,
        c.city_name,
        d.district_name
      FROM users u
      JOIN city_officials co ON u.id = co.user_id
      LEFT JOIN cities c ON co.city_id = c.id
      LEFT JOIN districts d ON co.district_id = d.id
      WHERE co.designation = 'Municipal Commissioner'
        AND u.email IS NOT NULL
      LIMIT 1
    `);

    if (commissioner.rows.length > 0) {
      const comm = commissioner.rows[0];
      log(`Name:        ${comm.full_name}`, colors.green);
      log(`Email:       ${comm.email}`, colors.bright + colors.cyan);
      log(`Password:    ${comm.password}`, colors.bright + colors.yellow);
      log(`Role:        ${comm.role}`, colors.green);
      log(`Designation: ${comm.designation}`, colors.green);
      log(`Location:    ${comm.city_name || 'N/A'}, ${comm.district_name || 'N/A'}`, colors.green);
      log(`User ID:     ${comm.id}`, colors.reset);
    } else {
      log('❌ No Municipal Commissioner found', colors.red);
    }

    // Get one Department Officer
    log('\n👷 DEPARTMENT OFFICER:', colors.bright + colors.blue);
    log('─'.repeat(60), colors.blue);

    const deptOfficer = await client.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.${passwordColumn} as password,
        u.role,
        dept_off.role as officer_role,
        dept_off.staff_id,
        d.name as department_name
      FROM users u
      JOIN departmentofficers dept_off ON u.id = dept_off.user_id
      LEFT JOIN departments d ON dept_off.department_id = d.id
      WHERE u.role = 'department_officer'
        AND u.email IS NOT NULL
      LIMIT 1
    `);

    if (deptOfficer.rows.length > 0) {
      const officer = deptOfficer.rows[0];
      log(`Name:        ${officer.full_name}`, colors.blue);
      log(`Email:       ${officer.email}`, colors.bright + colors.cyan);
      log(`Password:    ${officer.password}`, colors.bright + colors.yellow);
      log(`Role:        ${officer.role}`, colors.blue);
      log(`Officer Role: ${officer.officer_role}`, colors.blue);
      log(`Staff ID:    ${officer.staff_id || 'N/A'}`, colors.blue);
      log(`Department:  ${officer.department_name || 'N/A'}`, colors.blue);
      log(`User ID:     ${officer.id}`, colors.reset);
    } else {
      log('❌ No Department Officer found', colors.red);
    }

    // Summary for easy copy-paste
    log('\n╔════════════════════════════════════════════════════════════╗', colors.magenta);
    log('║         CREDENTIALS SUMMARY (Copy-Paste Ready)              ║', colors.magenta);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.magenta);

    if (commissioner.rows.length > 0) {
      const comm = commissioner.rows[0];
      log('MUNICIPAL COMMISSIONER:', colors.bright + colors.green);
      log(`Email:    ${comm.email}`, colors.cyan);
      log(`Password: ${comm.password}`, colors.yellow);
      log('');
    }

    if (deptOfficer.rows.length > 0) {
      const officer = deptOfficer.rows[0];
      log('DEPARTMENT OFFICER:', colors.bright + colors.blue);
      log(`Email:    ${officer.email}`, colors.cyan);
      log(`Password: ${officer.password}`, colors.yellow);
      log('');
    }

    log('─'.repeat(60), colors.cyan);
    log('✅ Credentials fetched successfully!', colors.green);

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

getCredentials();
