import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Client } = pg;

async function runMigrations() {
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

    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Migrations" (
        id serial PRIMARY KEY,
        migration_name varchar(255) NOT NULL UNIQUE,
        executed_at timestamptz DEFAULT now()
      )
    `);

    // Get list of executed migrations
    const executedResult = await client.query(
      'SELECT migration_name FROM "Migrations" ORDER BY id'
    );
    const executedMigrations = new Set(executedResult.rows.map(r => r.migration_name));

    // Get all migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('📝 No migration files found');
      return;
    }

    console.log(`📋 Found ${migrationFiles.length} migration file(s)\n`);

    let executedCount = 0;

    for (const file of migrationFiles) {
      const migrationName = file.replace('.sql', '');
      
      if (executedMigrations.has(migrationName)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`🔄 Running migration: ${file}`);
      
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        
        console.log(`✅ Migration ${file} completed successfully\n`);
        executedCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error running migration ${file}:`, error.message);
        throw error;
      }
    }

    // Create admin user if it doesn't exist
    console.log('👤 Checking for admin user...');
    const adminCheck = await client.query(
      'SELECT id FROM "Users" WHERE email = $1',
      ['admin@igrs.gov.in']
    );

    if (adminCheck.rows.length === 0) {
      console.log('🔐 Creating admin user...');
      const adminPassword = 'Admin@123';
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      await client.query(`
        INSERT INTO "Users" (email, password_hash, full_name, role, status, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['admin@igrs.gov.in', passwordHash, 'System Administrator', 'admin', 'active', true]);

      console.log('✅ Admin user created\n');
      console.log('=================================');
      console.log('🔐 Default Admin Credentials:');
      console.log('=================================');
      console.log('Email: admin@igrs.gov.in');
      console.log('Password:', adminPassword);
      console.log('=================================\n');
      console.log('⚠️  Please change the admin password after first login!\n');
    } else {
      console.log('✅ Admin user already exists\n');
    }

    if (executedCount === 0) {
      console.log('✨ All migrations are up to date!');
    } else {
      console.log(`✨ Successfully executed ${executedCount} migration(s)!`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) {
      console.error('Details:', error.detail);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migrations
runMigrations();
