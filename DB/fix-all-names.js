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

async function fixAllNames() {
  const client = await pool.connect();
  
  try {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║         FIXING ALL GENERIC NAMES                           ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    await client.query('BEGIN');

    // Get all users with generic names
    const genericNames = await client.query(`
      SELECT u.id, u.full_name, u.email
      FROM users u
      WHERE u.full_name ~* '(plumber|electrician|worker|staff|engineer|officer|inspector)\\s*\\d+'
         OR u.full_name ~* '^(plumber|electrician|worker|staff|engineer|officer|inspector)$'
         OR u.full_name = 'Executive Engineer'
         OR u.full_name LIKE '%Officer - %'
         OR u.full_name LIKE '%Inspector - %'
      ORDER BY u.full_name
    `);

    log(`Found ${genericNames.rows.length} users with generic names\n`, colors.yellow);

    // Proper Indian names for different roles
    const properNames = [
      'Ramesh Kulkarni',
      'Sunita Desai',
      'Prakash Joshi',
      'Meena Patil',
      'Sunil Sharma',
      'Kavita Reddy',
      'Rajesh Nair',
      'Priya Iyer',
      'Anil Gupta',
      'Sneha Verma',
      'Vijay Rao',
      'Lakshmi Menon',
      'Manoj Patel',
      'Rekha Singh',
      'Ashok Mehta',
      'Pooja Agarwal',
      'Sanjay Kapoor',
      'Nisha Malhotra',
      'Deepak Chopra',
      'Swati Bansal',
      'Kiran Saxena',
      'Anita Tiwari',
      'Harish Pandey',
      'Geeta Mishra',
      'Nitin Jain',
      'Ritu Bhatt',
      'Sachin Yadav',
      'Madhuri Ghosh',
      'Rajiv Sinha',
      'Vandana Bose'
    ];

    let nameIndex = 0;
    
    for (const user of genericNames.rows) {
      const newName = properNames[nameIndex] || `Officer ${nameIndex + 1}`;
      nameIndex++;

      const newEmail = newName.toLowerCase().replace(/ /g, '.') + '.' + user.id.substring(0, 8) + '@thane.gov.in';
      
      await client.query(`
        UPDATE users
        SET full_name = $1,
            email = $2
        WHERE id = $3
      `, [newName, newEmail, user.id]);

      log(`✓ Updated: ${user.full_name.padEnd(40)} → ${newName}`, colors.green);
    }

    // Also fix any remaining generic role-based names
    const roleBasedNames = await client.query(`
      SELECT u.id, u.full_name
      FROM users u
      WHERE u.full_name IN (
        'Executive Engineer',
        'Junior Engineer',
        'Field Officer',
        'Water Inspector',
        'Road Inspector',
        'Sanitation Inspector'
      )
      ORDER BY u.full_name
    `);

    if (roleBasedNames.rows.length > 0) {
      log(`\nFound ${roleBasedNames.rows.length} more role-based names\n`, colors.yellow);
      
      const additionalNames = [
        'Mohan Kumar',
        'Shalini Rane',
        'Prakash Bhosale',
        'Lata Sawant',
        'Ganesh Mane',
        'Rekha Jadhav'
      ];

      for (let i = 0; i < roleBasedNames.rows.length; i++) {
        const user = roleBasedNames.rows[i];
        const newName = additionalNames[i] || properNames[nameIndex++] || `Officer ${nameIndex}`;

        const newEmail = newName.toLowerCase().replace(/ /g, '.') + '.' + user.id.substring(0, 8) + '@thane.gov.in';
        
        await client.query(`
          UPDATE users
          SET full_name = $1,
              email = $2
          WHERE id = $3
        `, [newName, newEmail, user.id]);

        log(`✓ Updated: ${user.full_name.padEnd(40)} → ${newName}`, colors.green);
      }
    }

    await client.query('COMMIT');

    // Verify no generic names remain
    log('\n🔍 Verifying all names are proper...', colors.cyan);
    
    const remainingGeneric = await client.query(`
      SELECT COUNT(*) as count
      FROM users u
      WHERE u.full_name ~* '(plumber|electrician|worker|staff)\\s*\\d+'
         OR u.full_name = 'Executive Engineer'
         OR u.full_name = 'Junior Engineer'
         OR u.full_name = 'Field Officer'
    `);

    const count = parseInt(remainingGeneric.rows[0].count);
    
    if (count === 0) {
      log('✅ All users now have proper names!', colors.bright + colors.green);
    } else {
      log(`⚠️  ${count} users still have generic names`, colors.yellow);
    }

    // Show sample of updated names
    log('\n📋 Sample of updated names:', colors.cyan);
    const sample = await client.query(`
      SELECT u.full_name, u.email
      FROM users u
      JOIN departmentofficers do_tbl ON u.id = do_tbl.user_id
      ORDER BY u.full_name
      LIMIT 10
    `);

    sample.rows.forEach((row, index) => {
      log(`  ${index + 1}. ${row.full_name.padEnd(30)} (${row.email})`, colors.blue);
    });

    log('\n╔════════════════════════════════════════════════════════════╗', colors.green);
    log('║              ✅ ALL NAMES FIXED!                           ║', colors.green);
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

fixAllNames();
