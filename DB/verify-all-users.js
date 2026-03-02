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

async function verifyAllUsers() {
  const client = await pool.connect();
  
  try {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         VERIFYING ALL USERS                                 ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    // First, check what status-related columns exist
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
        AND (column_name LIKE '%status%' 
          OR column_name LIKE '%verified%' 
          OR column_name LIKE '%confirmed%'
          OR column_name LIKE '%approval%')
      ORDER BY column_name
    `);

    log('📋 Status-related columns found:', colors.cyan);
    columns.rows.forEach(col => {
      log(`   - ${col.column_name.padEnd(30)} (${col.data_type})`, colors.blue);
    });

    // Get current status counts
    log('\n📊 Current Status Before Update:', colors.yellow);
    
    const beforeStats = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM users
      GROUP BY status
      ORDER BY count DESC
    `);

    beforeStats.rows.forEach(stat => {
      log(`   ${String(stat.status || 'NULL').padEnd(20)} : ${stat.count} users`, colors.blue);
    });

    const beforeApproval = await client.query(`
      SELECT 
        approval_status,
        COUNT(*) as count
      FROM users
      GROUP BY approval_status
      ORDER BY count DESC
    `);

    log('\n📊 Current Approval Status:', colors.yellow);
    beforeApproval.rows.forEach(stat => {
      log(`   ${String(stat.approval_status || 'NULL').padEnd(20)} : ${stat.count} users`, colors.blue);
    });

    // Get total user count
    const countResult = await client.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(countResult.rows[0].count);
    
    log(`\n📊 Total users to verify: ${totalUsers}`, colors.bright + colors.blue);

    await client.query('BEGIN');

    log('\n🔄 Updating user statuses...', colors.cyan);
    
    // Update all status-related fields (only the ones that work)
    const updateResult = await client.query(`
      UPDATE users
      SET 
        status = 'active',
        approval_status = 'approved',
        email_verified = true,
        approved_at = COALESCE(approved_at, NOW()),
        updated_at = NOW()
      WHERE id IS NOT NULL
      RETURNING id, full_name, email, role, status, approval_status, email_verified
    `);

    await client.query('COMMIT');

    log(`\n✅ Successfully verified ${updateResult.rows.length} users!`, colors.bright + colors.green);

    // Show sample of updated users
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         SAMPLE OF VERIFIED USERS                            ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    const sampleUsers = updateResult.rows.slice(0, 10);
    sampleUsers.forEach((user, index) => {
      log(`${(index + 1).toString().padStart(2)}. ${user.full_name?.padEnd(30) || 'N/A'.padEnd(30)} - ${user.email}`, colors.blue);
      log(`    Role: ${user.role?.padEnd(20)} Status: ${user.status?.padEnd(10)} Approval: ${user.approval_status}`, colors.green);
    });

    if (updateResult.rows.length > 10) {
      log(`\n... and ${updateResult.rows.length - 10} more users`, colors.yellow);
    }

    // Verify by status
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         VERIFICATION BY STATUS (After Update)               ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    const afterStats = await client.query(`
      SELECT 
        status,
        approval_status,
        email_verified,
        COUNT(*) as count
      FROM users
      GROUP BY status, approval_status, email_verified
      ORDER BY count DESC
    `);

    afterStats.rows.forEach(stat => {
      log(`Status: ${String(stat.status).padEnd(15)} Approval: ${String(stat.approval_status).padEnd(15)} Email Verified: ${stat.email_verified ? 'Yes' : 'No'} - ${stat.count} users`, colors.green);
    });

    // Show verification summary
    log('\n╔════════════════════════════════════════════════════════════╗', colors.magenta);
    log('║         VERIFICATION SUMMARY                                ║', colors.magenta);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.magenta);

    const summary = await client.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved_users,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as email_verified_users
      FROM users
    `);

    const stats = summary.rows[0];
    log(`📊 Total Users:              ${stats.total_users}`, colors.blue);
    log(`✅ Active Status:            ${stats.active_users}`, colors.green);
    log(`✅ Approved:                 ${stats.approved_users}`, colors.green);
    log(`✅ Email Verified:           ${stats.email_verified_users}`, colors.green);

    log('\n╔════════════════════════════════════════════════════════════╗', colors.green);
    log('║         ✅ ALL USERS VERIFIED!                             ║', colors.green);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.green);

    log('📝 Changes Applied:', colors.cyan);
    log('   ✅ Status set to: active', colors.green);
    log('   ✅ Approval status set to: approved', colors.green);
    log('   ✅ Email verified: true', colors.green);
    log('   ✅ Approved at: set', colors.green);
    log('\n✅ All users are now fully verified and can login!', colors.bright + colors.green);

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

verifyAllUsers();
