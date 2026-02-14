import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Client } = pg;

async function rollback() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env file');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get the last migration
    const result = await client.query(
      'SELECT migration_name FROM "Migrations" ORDER BY id DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('📝 No migrations to rollback');
      return;
    }

    const lastMigration = result.rows[0].migration_name;
    console.log(`⚠️  Rolling back migration: ${lastMigration}`);
    console.log('⚠️  WARNING: This will drop all tables and data!\n');

    // Confirm rollback
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('Are you sure you want to rollback? (yes/no): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Rollback cancelled');
      return;
    }

    console.log('\n🔄 Rolling back...');

    await client.query('BEGIN');

    // Drop all tables in reverse order
    await client.query('DROP TABLE IF EXISTS "AuditLog" CASCADE');
    await client.query('DROP TABLE IF EXISTS "GrievanceComments" CASCADE');
    await client.query('DROP TABLE IF EXISTS "UserGrievance" CASCADE');
    await client.query('DROP TABLE IF EXISTS "RefreshTokens" CASCADE');
    await client.query('DROP TABLE IF EXISTS "Users" CASCADE');
    await client.query('DROP TABLE IF EXISTS "Departments" CASCADE');
    await client.query('DROP TABLE IF EXISTS "Migrations" CASCADE');

    // Drop types
    await client.query('DROP TYPE IF EXISTS grievance_status CASCADE');
    await client.query('DROP TYPE IF EXISTS user_status CASCADE');
    await client.query('DROP TYPE IF EXISTS user_role CASCADE');

    await client.query('COMMIT');

    console.log('✅ Rollback completed successfully');
    console.log('💡 Run "npm run migrate" to reapply migrations');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

rollback();
