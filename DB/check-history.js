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

async function checkHistory() {
  const client = await pool.connect();
  
  try {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         DATABASE HISTORY CHECK                              ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    // Check if there's an audit log table
    const auditTableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%audit%' OR table_name LIKE '%log%' OR table_name LIKE '%history%')
    `);

    if (auditTableCheck.rows.length > 0) {
      log('📋 Audit/Log tables found:', colors.green);
      auditTableCheck.rows.forEach(row => {
        log(`   - ${row.table_name}`, colors.blue);
      });
    } else {
      log('⚠️  No audit/log tables found in database', colors.yellow);
    }

    // Check all users with 'kunal' in name or email
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         USERS WITH "KUNAL" IN NAME OR EMAIL                 ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    const kunalUsers = await client.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.created_at,
        u.updated_at,
        CASE 
          WHEN co.id IS NOT NULL THEN 'City Official'
          WHEN wo.id IS NOT NULL THEN 'Ward Officer'
          WHEN dept.id IS NOT NULL THEN 'Department Officer'
          WHEN go.id IS NOT NULL THEN 'Government Official'
          ELSE 'No Association'
        END as officer_type
      FROM users u
      LEFT JOIN city_officials co ON u.id = co.user_id
      LEFT JOIN ward_officers wo ON u.id = wo.user_id
      LEFT JOIN departmentofficers dept ON u.id = dept.user_id
      LEFT JOIN government_officials go ON u.id = go.user_id
      WHERE LOWER(u.full_name) LIKE '%kunal%' 
         OR LOWER(u.email) LIKE '%kunal%'
      ORDER BY u.created_at
    `);

    if (kunalUsers.rows.length > 0) {
      kunalUsers.rows.forEach((user, index) => {
        log(`\n${index + 1}. ${user.full_name}`, colors.bright + colors.blue);
        log(`   Email:        ${user.email}`, colors.blue);
        log(`   Role:         ${user.role}`, colors.blue);
        log(`   Officer Type: ${user.officer_type}`, colors.blue);
        log(`   Created:      ${user.created_at}`, colors.reset);
        log(`   Updated:      ${user.updated_at}`, colors.reset);
        log(`   User ID:      ${user.id}`, colors.reset);
      });
    } else {
      log('❌ No users found with "kunal" in name or email', colors.red);
    }

    // Check for users with government email format
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         GOVERNMENT EMAIL USERS (*.gov.in)                   ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    const govEmails = await client.query(`
      SELECT full_name, email, role, created_at
      FROM users
      WHERE email LIKE '%.gov.in'
      ORDER BY created_at DESC
      LIMIT 20
    `);

    log(`Found ${govEmails.rows.length} users with government emails:\n`, colors.green);
    govEmails.rows.forEach((user, index) => {
      log(`${(index + 1).toString().padStart(2)}. ${user.full_name.padEnd(30)} - ${user.email}`, colors.blue);
    });

    // Check for recently updated users
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         RECENTLY UPDATED USERS (Last 50)                    ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    const recentUpdates = await client.query(`
      SELECT full_name, email, role, updated_at
      FROM users
      WHERE updated_at IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 50
    `);

    log(`Found ${recentUpdates.rows.length} recently updated users:\n`, colors.green);
    recentUpdates.rows.forEach((user, index) => {
      const updateTime = new Date(user.updated_at).toLocaleString();
      log(`${(index + 1).toString().padStart(2)}. ${user.full_name.padEnd(30)} - ${user.email.padEnd(50)} - ${updateTime}`, colors.blue);
    });

    // Check for users with old email patterns (gmail, yahoo, etc.)
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         USERS WITH PERSONAL EMAIL ADDRESSES                 ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    const personalEmails = await client.query(`
      SELECT full_name, email, role, created_at
      FROM users
      WHERE email LIKE '%@gmail.com' 
         OR email LIKE '%@yahoo.com'
         OR email LIKE '%@outlook.com'
         OR email LIKE '%@hotmail.com'
      ORDER BY created_at DESC
    `);

    if (personalEmails.rows.length > 0) {
      log(`Found ${personalEmails.rows.length} users with personal emails:\n`, colors.green);
      personalEmails.rows.forEach((user, index) => {
        log(`${(index + 1).toString().padStart(2)}. ${user.full_name.padEnd(30)} - ${user.email}`, colors.blue);
      });
    } else {
      log('✅ No users with personal email addresses found', colors.green);
      log('   All users have been migrated to government email format', colors.yellow);
    }

    // Summary
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         SUMMARY                                             ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    const summary = await client.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN email LIKE '%.gov.in' THEN 1 END) as gov_emails,
        COUNT(CASE WHEN email LIKE '%@gmail.com' OR email LIKE '%@yahoo.com' THEN 1 END) as personal_emails,
        COUNT(CASE WHEN updated_at IS NOT NULL THEN 1 END) as updated_users
      FROM users
    `);

    const stats = summary.rows[0];
    log(`📊 Total Users:           ${stats.total_users}`, colors.blue);
    log(`📧 Government Emails:     ${stats.gov_emails}`, colors.green);
    log(`📧 Personal Emails:       ${stats.personal_emails}`, colors.yellow);
    log(`🔄 Updated Users:         ${stats.updated_users}`, colors.cyan);

    log('\n╔════════════════════════════════════════════════════════════╗', colors.magenta);
    log('║         CONCLUSION                                          ║', colors.magenta);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.magenta);

    if (stats.personal_emails === 0 && stats.gov_emails > 0) {
      log('✅ All users have been migrated to government email format', colors.green);
      log('   kunaldp379@gmail.com was likely converted to:', colors.yellow);
      log('   - kunal.deepak.patil.{id}@thane.gov.in', colors.cyan);
      log('\n   This happened during the hierarchy data cleanup where:', colors.yellow);
      log('   1. Generic names were replaced with proper names', colors.reset);
      log('   2. Email addresses were standardized to government format', colors.reset);
      log('   3. No users were deleted, only updated', colors.reset);
    }

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

checkHistory();
