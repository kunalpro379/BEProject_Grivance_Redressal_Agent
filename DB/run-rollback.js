import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
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
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runRollback() {
  const client = await pool.connect();
  
  try {
    log('\n========================================', colors.cyan);
    log('  HIERARCHY ROLLBACK STARTING', colors.bright + colors.yellow);
    log('========================================\n', colors.cyan);

    log('⚠️  WARNING: This will undo all hierarchy changes!', colors.yellow);
    log('   Press Ctrl+C within 5 seconds to cancel\n', colors.yellow);
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    log('📡 Connecting to database...', colors.yellow);
    await client.query('SELECT 1');
    log('✓ Connected', colors.green);

    log('\n🔄 Reading rollback script...', colors.yellow);
    const rollbackSQL = fs.readFileSync(
      path.join(__dirname, 'rollback_hierarchy.sql'),
      'utf8'
    );

    log('🗑️  Executing rollback...', colors.yellow);
    await client.query('BEGIN');
    
    try {
      await client.query(rollbackSQL);
      await client.query('COMMIT');
      log('✓ Rollback completed successfully', colors.green);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    log('\n🔍 Verifying rollback...', colors.yellow);
    const verifyResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('city_officials', 'ward_officers', 'departmentofficers')
        AND column_name IN ('city_id', 'district_id', 'ward_id', 'reports_to', 
                           'reports_to_city_official_id', 'reports_to_ward_officer_id')
    `);

    if (verifyResult.rows.length === 0) {
      log('✓ All hierarchy columns removed', colors.green);
    } else {
      log('⚠️  Some columns still exist:', colors.yellow);
      verifyResult.rows.forEach(row => {
        log(`  - ${row.column_name}`, colors.yellow);
      });
    }

    log('\n========================================', colors.cyan);
    log('  ✅ ROLLBACK COMPLETED', colors.bright + colors.green);
    log('========================================\n', colors.cyan);

  } catch (error) {
    log('\n========================================', colors.red);
    log('  ❌ ROLLBACK FAILED', colors.bright + colors.red);
    log('========================================\n', colors.red);
    log(`Error: ${error.message}`, colors.red);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runRollback().catch(error => {
  log(`\nUnexpected error: ${error.message}`, colors.red);
  process.exit(1);
});
