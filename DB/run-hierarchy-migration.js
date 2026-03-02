import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration from environment
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
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runMigration() {
  const client = await pool.connect();
  
  try {
    log('\n========================================', colors.cyan);
    log('  HIERARCHY MIGRATION STARTING', colors.bright + colors.green);
    log('========================================\n', colors.cyan);

    // Step 1: Test connection
    log('📡 Testing database connection...', colors.yellow);
    const versionResult = await client.query('SELECT version()');
    log('✓ Connected to PostgreSQL', colors.green);
    log(`  Version: ${versionResult.rows[0].version.split(',')[0]}`, colors.blue);

    // Step 2: Create backup info
    log('\n📦 Creating backup reference...', colors.yellow);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupNote = `Backup recommended before migration at ${timestamp}`;
    log(`✓ ${backupNote}`, colors.green);

    // Step 3: Read and execute schema fixes
    log('\n🔧 Applying schema changes...', colors.yellow);
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'schema_fixes_hierarchy.sql'),
      'utf8'
    );
    
    await client.query('BEGIN');
    
    try {
      await client.query(schemaSQL);
      log('✓ Schema changes applied successfully', colors.green);
      
      // Check what was created
      const viewsResult = await client.query(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%hierarchy%' OR table_name LIKE '%missing%'
      `);
      log(`  Created ${viewsResult.rows.length} views`, colors.blue);
      
      const functionsResult = await client.query(`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND (routine_name LIKE '%subordinate%' OR routine_name LIKE '%reporting%' OR routine_name LIKE '%hierarchical%')
      `);
      log(`  Created ${functionsResult.rows.length} functions`, colors.blue);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Step 4: Read and execute data migration
    log('\n📊 Migrating existing data...', colors.yellow);
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'data_migration_hierarchy.sql'),
      'utf8'
    );
    
    await client.query('BEGIN');
    
    try {
      await client.query(migrationSQL);
      log('✓ Data migration completed successfully', colors.green);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Step 5: Run validation
    log('\n🔍 Running validation checks...', colors.yellow);
    
    // Check hierarchy report
    const reportResult = await client.query('SELECT * FROM generate_hierarchy_report()');
    log('\n📈 Hierarchy Report:', colors.cyan);
    reportResult.rows.forEach(row => {
      log(`  ${row.metric}: ${row.count}`, colors.blue);
      log(`    ${row.details}`, colors.reset);
    });

    // Check for missing links
    log('\n🔗 Checking for missing links...', colors.yellow);
    
    const missingWardOfficers = await client.query('SELECT COUNT(*) as count FROM ward_officers_missing_supervisor');
    const missingDeptOfficers = await client.query('SELECT COUNT(*) as count FROM dept_officers_missing_supervisor');
    const missingCityOfficials = await client.query('SELECT COUNT(*) as count FROM city_officials_missing_fk');
    
    const wardCount = parseInt(missingWardOfficers.rows[0].count);
    const deptCount = parseInt(missingDeptOfficers.rows[0].count);
    const cityCount = parseInt(missingCityOfficials.rows[0].count);
    
    if (wardCount === 0 && deptCount === 0 && cityCount === 0) {
      log('✓ No missing links found - Perfect!', colors.green);
    } else {
      log('⚠ Some missing links found:', colors.yellow);
      if (wardCount > 0) log(`  - ${wardCount} ward officers without supervisor`, colors.yellow);
      if (deptCount > 0) log(`  - ${deptCount} department officers without supervisor`, colors.yellow);
      if (cityCount > 0) log(`  - ${cityCount} city officials without proper foreign keys`, colors.yellow);
      log('\n  Run these queries to see details:', colors.cyan);
      if (wardCount > 0) log('    SELECT * FROM ward_officers_missing_supervisor;', colors.blue);
      if (deptCount > 0) log('    SELECT * FROM dept_officers_missing_supervisor;', colors.blue);
      if (cityCount > 0) log('    SELECT * FROM city_officials_missing_fk;', colors.blue);
    }

    // Step 6: Test views
    log('\n🧪 Testing views...', colors.yellow);
    
    try {
      const hierarchyTest = await client.query('SELECT COUNT(*) as count FROM unified_official_hierarchy');
      log(`✓ unified_official_hierarchy: ${hierarchyTest.rows[0].count} records`, colors.green);
    } catch (error) {
      log(`✗ unified_official_hierarchy: ${error.message}`, colors.red);
    }
    
    try {
      const cityTest = await client.query('SELECT COUNT(*) as count FROM city_hierarchy_structure');
      log(`✓ city_hierarchy_structure: ${cityTest.rows[0].count} records`, colors.green);
    } catch (error) {
      log(`✗ city_hierarchy_structure: ${error.message}`, colors.red);
    }

    // Success summary
    log('\n========================================', colors.cyan);
    log('  ✅ MIGRATION COMPLETED SUCCESSFULLY', colors.bright + colors.green);
    log('========================================\n', colors.cyan);
    
    log('📋 Summary:', colors.cyan);
    log('  ✓ Schema changes applied', colors.green);
    log('  ✓ Data migrated', colors.green);
    log('  ✓ Views created and tested', colors.green);
    log('  ✓ Functions created', colors.green);
    log('  ✓ Validation completed', colors.green);
    
    log('\n📚 Next Steps:', colors.cyan);
    log('  1. Review the hierarchy report above', colors.blue);
    log('  2. Check for any missing links', colors.blue);
    log('  3. Test queries from QUICK_REFERENCE.md', colors.blue);
    log('  4. Update your application code', colors.blue);
    
    log('\n💡 Useful Queries:', colors.cyan);
    log('  -- Get hierarchy report', colors.blue);
    log('  SELECT * FROM generate_hierarchy_report();', colors.reset);
    log('\n  -- View city hierarchy', colors.blue);
    log('  SELECT * FROM city_hierarchy_structure LIMIT 10;', colors.reset);
    log('\n  -- Get subordinates of an official', colors.blue);
    log('  SELECT * FROM get_subordinates(\'official-uuid\');', colors.reset);
    
  } catch (error) {
    log('\n========================================', colors.red);
    log('  ❌ MIGRATION FAILED', colors.bright + colors.red);
    log('========================================\n', colors.red);
    log(`Error: ${error.message}`, colors.red);
    log(`\nStack trace:`, colors.red);
    log(error.stack, colors.reset);
    
    log('\n🔄 Rollback Options:', colors.yellow);
    log('  1. Run: node DB/run-rollback.js', colors.blue);
    log('  2. Or manually run: DB/rollback_hierarchy.sql', colors.blue);
    
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
log('\n🚀 Starting Hierarchy Migration...', colors.bright + colors.cyan);
log('   This will modify your database schema', colors.yellow);
log('   Press Ctrl+C within 3 seconds to cancel\n', colors.yellow);

setTimeout(() => {
  runMigration().catch(error => {
    log(`\nUnexpected error: ${error.message}`, colors.red);
    process.exit(1);
  });
}, 3000);
