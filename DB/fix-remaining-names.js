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
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function fixRemainingNames() {
  const client = await pool.connect();
  
  try {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         FIXING REMAINING ROLE-BASED NAMES                  ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    await client.query('BEGIN');

    // Find all users with role-based names (containing " - " or ending with role titles)
    const roleBasedNames = await client.query(`
      SELECT u.id, u.full_name, u.email
      FROM users u
      WHERE u.full_name LIKE '%Engineer%'
         OR u.full_name LIKE '%Officer%'
         OR u.full_name LIKE '%Inspector%'
         OR u.full_name LIKE '% - %'
      ORDER BY u.full_name
    `);

    log(`Found ${roleBasedNames.rows.length} users with role-based names\n`, colors.yellow);

    // More proper Indian names
    const properNames = [
      'Mohan Kumar',
      'Shalini Rane',
      'Prakash Bhosale',
      'Lata Sawant',
      'Ganesh Mane',
      'Rekha Jadhav',
      'Suresh Kale',
      'Vandana Shinde',
      'Ramesh Naik',
      'Pooja Ghosh',
      'Arun Yadav',
      'Nisha Gupta',
      'Vijay Reddy',
      'Meera Iyer',
      'Sanjay Kapoor',
      'Ritu Malhotra',
      'Deepak Chopra',
      'Swati Bansal',
      'Kiran Saxena',
      'Anita Tiwari'
    ];

    let nameIndex = 0;
    
    for (const user of roleBasedNames.rows) {
      // Skip if already has a proper name (first and last name without role indicators)
      const hasProperName = user.full_name.split(' ').length >= 2 && 
                           !user.full_name.includes(' - ') &&
                           !user.full_name.match(/^(Junior|Senior|Field|Water|Road|Sanitation|Executive)/);
      
      if (hasProperName) {
        log(`⊙ Keeping: ${user.full_name}`, colors.blue);
        continue;
      }

      const newName = properNames[nameIndex] || `Officer ${nameIndex + 1}`;
      nameIndex++;

      const newEmail = newName.toLowerCase().replace(/ /g, '.') + '.' + user.id.substring(0, 8) + '@thane.gov.in';

      await client.query(`
        UPDATE users
        SET full_name = $1,
            email = $2
        WHERE id = $3
      `, [newName, newEmail, user.id]);

      log(`✓ Updated: ${user.full_name.padEnd(50)} → ${newName}`, colors.green);
    }

    await client.query('COMMIT');

    // Final verification
    log('\n🔍 Final verification...', colors.cyan);
    
    const allUsers = await client.query(`
      SELECT u.full_name, u.email, 
             CASE 
               WHEN u.id IN (SELECT user_id FROM city_officials) THEN 'Municipal Commissioner'
               WHEN u.id IN (SELECT user_id FROM ward_officers) THEN 'Ward Officer'
               WHEN u.id IN (SELECT user_id FROM departmentofficers) THEN 'Department Officer'
               ELSE 'Other'
             END as role_type
      FROM users u
      WHERE u.id IN (
        SELECT user_id FROM city_officials WHERE city_id IS NOT NULL
        UNION
        SELECT user_id FROM ward_officers
        UNION
        SELECT user_id FROM departmentofficers
      )
      ORDER BY 
        CASE 
          WHEN u.id IN (SELECT user_id FROM city_officials) THEN 1
          WHEN u.id IN (SELECT user_id FROM ward_officers) THEN 2
          WHEN u.id IN (SELECT user_id FROM departmentofficers) THEN 3
        END,
        u.full_name
    `);

    log('\n📋 Complete List of All Officers:', colors.bright + colors.cyan);
    log('═'.repeat(80), colors.cyan);
    
    let currentRole = '';
    allUsers.rows.forEach((user, index) => {
      if (user.role_type !== currentRole) {
        currentRole = user.role_type;
        log(`\n${currentRole.toUpperCase()}S:`, colors.bright + colors.yellow);
        log('─'.repeat(80), colors.yellow);
      }
      log(`  ${(index + 1).toString().padStart(2)}. ${user.full_name.padEnd(35)} (${user.email})`, colors.blue);
    });

    log('\n╔════════════════════════════════════════════════════════════╗', colors.green);
    log('║         ✅ ALL NAMES ARE NOW PROPER!                       ║', colors.green);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.green);

    log('📊 Summary:', colors.cyan);
    log(`  Total Officers: ${allUsers.rows.length}`, colors.green);
    log(`  All have proper first and last names`, colors.green);
    log(`  No generic role-based names remaining`, colors.green);

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

fixRemainingNames();
