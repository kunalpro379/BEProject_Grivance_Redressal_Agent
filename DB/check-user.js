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
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function checkUser() {
  const client = await pool.connect();
  
  try {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         CHECKING USER: kunaldp379@gmail.com                 ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    // Check if user exists
    const userCheck = await client.query(`
      SELECT id, full_name, email, role, created_at
      FROM users
      WHERE email = 'kunaldp379@gmail.com'
    `);

    if (userCheck.rows.length > 0) {
      const user = userCheck.rows[0];
      log('✅ USER FOUND!', colors.green);
      log('─'.repeat(60), colors.cyan);
      log(`ID:         ${user.id}`, colors.blue);
      log(`Name:       ${user.full_name}`, colors.blue);
      log(`Email:      ${user.email}`, colors.blue);
      log(`Role:       ${user.role}`, colors.blue);
      log(`Created:    ${user.created_at}`, colors.blue);
      log('─'.repeat(60), colors.cyan);

      // Check if user is in any officer tables
      const cityOfficial = await client.query(`
        SELECT id FROM city_officials WHERE user_id = $1
      `, [user.id]);

      const wardOfficer = await client.query(`
        SELECT id FROM ward_officers WHERE user_id = $1
      `, [user.id]);

      const deptOfficer = await client.query(`
        SELECT id FROM departmentofficers WHERE user_id = $1
      `, [user.id]);

      const govOfficial = await client.query(`
        SELECT id FROM government_officials WHERE user_id = $1
      `, [user.id]);

      log('\n📋 User Associations:', colors.cyan);
      log(`   City Official:       ${cityOfficial.rows.length > 0 ? '✅ Yes' : '❌ No'}`, colors.blue);
      log(`   Ward Officer:        ${wardOfficer.rows.length > 0 ? '✅ Yes' : '❌ No'}`, colors.blue);
      log(`   Department Officer:  ${deptOfficer.rows.length > 0 ? '✅ Yes' : '❌ No'}`, colors.blue);
      log(`   Government Official: ${govOfficial.rows.length > 0 ? '✅ Yes' : '❌ No'}`, colors.blue);

    } else {
      log('❌ USER NOT FOUND!', colors.red);
      log('─'.repeat(60), colors.red);
      log('The user kunaldp379@gmail.com does not exist in the database.', colors.yellow);
      
      // Check if there are any similar emails
      const similarEmails = await client.query(`
        SELECT email FROM users WHERE email LIKE '%kunal%' OR email LIKE '%dp379%'
      `);
      
      if (similarEmails.rows.length > 0) {
        log('\n📧 Similar emails found:', colors.cyan);
        similarEmails.rows.forEach(row => {
          log(`   - ${row.email}`, colors.blue);
        });
      }
    }

    // Show total user count
    const totalUsers = await client.query(`SELECT COUNT(*) as count FROM users`);
    log(`\n📊 Total users in database: ${totalUsers.rows[0].count}`, colors.cyan);

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

checkUser();
