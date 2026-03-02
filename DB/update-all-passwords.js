import pg from 'pg';
import bcrypt from 'bcrypt';

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

async function updateAllPasswords() {
  const client = await pool.connect();
  
  try {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         UPDATING ALL USER PASSWORDS                         ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    const newPassword = 'abc@123';
    log(`🔐 New Password: ${newPassword}`, colors.bright + colors.yellow);
    log('🔄 Hashing password with bcrypt...', colors.cyan);

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    log(`✅ Password hashed: ${hashedPassword.substring(0, 30)}...`, colors.green);

    // Get total user count
    const countResult = await client.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(countResult.rows[0].count);
    
    log(`\n📊 Total users to update: ${totalUsers}`, colors.blue);

    await client.query('BEGIN');

    // Update all users
    log('\n🔄 Updating passwords...', colors.cyan);
    
    const updateResult = await client.query(`
      UPDATE users
      SET password_hash = $1,
          updated_at = NOW()
      WHERE id IS NOT NULL
      RETURNING id, full_name, email, role
    `, [hashedPassword]);

    await client.query('COMMIT');

    log(`\n✅ Successfully updated ${updateResult.rows.length} users!`, colors.bright + colors.green);

    // Show sample of updated users
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         SAMPLE OF UPDATED USERS                             ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    const sampleUsers = updateResult.rows.slice(0, 10);
    sampleUsers.forEach((user, index) => {
      log(`${(index + 1).toString().padStart(2)}. ${user.full_name?.padEnd(30) || 'N/A'.padEnd(30)} - ${user.email}`, colors.blue);
      log(`    Role: ${user.role}`, colors.reset);
    });

    if (updateResult.rows.length > 10) {
      log(`\n... and ${updateResult.rows.length - 10} more users`, colors.yellow);
    }

    // Verify by role
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         VERIFICATION BY ROLE                                ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    const roleStats = await client.query(`
      SELECT 
        role,
        COUNT(*) as count
      FROM users
      WHERE password_hash = $1
      GROUP BY role
      ORDER BY count DESC
    `, [hashedPassword]);

    roleStats.rows.forEach(stat => {
      log(`${stat.role?.padEnd(30) || 'NULL'.padEnd(30)} : ${stat.count} users`, colors.green);
    });

    // Show some test credentials
    log('\n╔════════════════════════════════════════════════════════════╗', colors.magenta);
    log('║         TEST CREDENTIALS (Ready to Use)                     ║', colors.magenta);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.magenta);

    // Get one of each role type
    const testUsers = await client.query(`
      SELECT DISTINCT ON (role)
        full_name,
        email,
        role
      FROM users
      WHERE email IS NOT NULL
        AND role IN ('city_commissioner', 'ward_officer', 'department_officer', 'department_head', 'citizen')
      ORDER BY role, created_at
    `);

    testUsers.rows.forEach(user => {
      log(`\n${user.role?.toUpperCase()}:`, colors.bright + colors.cyan);
      log(`  Email:    ${user.email}`, colors.green);
      log(`  Password: ${newPassword}`, colors.yellow);
      log(`  Name:     ${user.full_name}`, colors.blue);
    });

    log('\n╔════════════════════════════════════════════════════════════╗', colors.green);
    log('║         ✅ PASSWORD UPDATE COMPLETE!                       ║', colors.green);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.green);

    log('📝 Summary:', colors.cyan);
    log(`   Total users updated: ${updateResult.rows.length}`, colors.green);
    log(`   New password: ${newPassword}`, colors.yellow);
    log(`   Password hash: ${hashedPassword}`, colors.reset);
    log('\n✅ All users can now login with password: abc@123', colors.bright + colors.green);

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

updateAllPasswords();
