import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Client } = pg;

async function checkStatus() {
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

    // Check if migrations table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'Migrations'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('📝 No migrations have been run yet');
      console.log('💡 Run "npm run migrate" to apply migrations\n');
      return;
    }

    // Get executed migrations
    const executedResult = await client.query(
      'SELECT migration_name, executed_at FROM "Migrations" ORDER BY id'
    );
    const executedMigrations = new Map(
      executedResult.rows.map(r => [r.migration_name, r.executed_at])
    );

    // Get all migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log('📊 Migration Status\n');
    console.log('='.repeat(70));

    if (migrationFiles.length === 0) {
      console.log('No migration files found');
    } else {
      for (const file of migrationFiles) {
        const migrationName = file.replace('.sql', '');
        const executed = executedMigrations.get(migrationName);
        
        if (executed) {
          const date = new Date(executed).toLocaleString();
          console.log(`✅ ${file.padEnd(40)} (executed: ${date})`);
        } else {
          console.log(`⏳ ${file.padEnd(40)} (pending)`);
        }
      }
    }

    console.log('='.repeat(70));
    console.log(`\nTotal: ${migrationFiles.length} migration(s)`);
    console.log(`Executed: ${executedMigrations.size}`);
    console.log(`Pending: ${migrationFiles.length - executedMigrations.size}\n`);

    if (migrationFiles.length > executedMigrations.size) {
      console.log('💡 Run "npm run migrate" to apply pending migrations');
    } else {
      console.log('✨ All migrations are up to date!');
    }

  } catch (error) {
    console.error('❌ Error checking migration status:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

checkStatus();
