/**
 * Database Migration System
 * Programmatically runs SQL migrations with tracking
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from Server/.env
const envPath = path.join(__dirname, 'Server', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✓ Loaded environment from Server/.env\n');
} else {
  console.warn('⚠ Warning: Server/.env file not found. Using environment variables or defaults.\n');
}

const { Pool } = pg;

// Create database connection pool
const connectionString = process.env.DATABASE_URL;
const dbConfig = connectionString
  ? {
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'igrs_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    };

console.log('🔌 Database Config:');
console.log(`   Host: ${dbConfig.host || 'from connection string'}`);
console.log(`   Port: ${dbConfig.port || 'from connection string'}`);
console.log(`   Database: ${dbConfig.database || 'from connection string'}`);
console.log(`   User: ${(dbConfig.user || process.env.DB_USER || 'postgres').substring(0, 20)}...\n`);

const pool = new Pool(dbConfig);

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);

class MigrationRunner {
  constructor() {
    this.migrationsPath = path.join(__dirname, 'DB');
    this.tableName = 'schema_migrations';
  }

  /**
   * Initialize migrations tracking table
   */
  async initMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW(),
        success BOOLEAN DEFAULT true,
        error_message TEXT
      );
    `;
    
    try {
      await pool.query(query);
      console.log('✓ Migrations table initialized');
    } catch (error) {
      console.error('✗ Failed to initialize migrations table:', error.message);
      throw error;
    }
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations() {
    const query = `SELECT migration_name FROM ${this.tableName} WHERE success = true ORDER BY id`;
    
    try {
      const result = await pool.query(query);
      return result.rows.map(row => row.migration_name);
    } catch (error) {
      console.error('✗ Failed to fetch executed migrations:', error.message);
      return [];
    }
  }

  /**
   * Record migration execution
   */
  async recordMigration(migrationName, success = true, errorMessage = null) {
    const query = `
      INSERT INTO ${this.tableName} (migration_name, success, error_message)
      VALUES ($1, $2, $3)
      ON CONFLICT (migration_name) DO UPDATE
      SET executed_at = NOW(), success = $2, error_message = $3
    `;
    
    try {
      await pool.query(query, [migrationName, success, errorMessage]);
    } catch (error) {
      console.error('✗ Failed to record migration:', error.message);
    }
  }

  /**
   * Get all migration files from DB directory
   */
  async getMigrationFiles() {
    try {
      const files = await readdir(this.migrationsPath);
      
      // Filter for SQL migration files (e.g., 001_name.sql, 002_name.sql)
      const migrationFiles = files
        .filter(file => file.match(/^\d{3}_.*\.sql$/) && !file.includes('rollback'))
        .sort();
      
      return migrationFiles;
    } catch (error) {
      console.error('✗ Failed to read migration files:', error.message);
      return [];
    }
  }

  /**
   * Execute a single migration file
   */
  async executeMigration(filename) {
    const filePath = path.join(this.migrationsPath, filename);
    
    console.log(`\n📄 Running migration: ${filename}`);
    console.log('─'.repeat(60));
    
    try {
      // Read SQL file
      const sql = await readFile(filePath, 'utf8');
      
      // Execute SQL (PostgreSQL can handle multiple statements in one query)
      await pool.query(sql);
      
      // Record success
      await this.recordMigration(filename, true);
      
      console.log(`✓ Migration ${filename} executed successfully`);
      return { success: true, filename };
    } catch (error) {
      console.error(`✗ Migration ${filename} failed:`, error.message);
      
      // Record failure
      await this.recordMigration(filename, false, error.message);
      
      return { success: false, filename, error: error.message };
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations() {
    console.log('\n🚀 Starting Database Migrations');
    console.log('═'.repeat(60));
    
    try {
      // Initialize tracking table
      await this.initMigrationsTable();
      
      // Get executed migrations
      const executedMigrations = await this.getExecutedMigrations();
      console.log(`\n📊 Already executed: ${executedMigrations.length} migrations`);
      
      // Get all migration files
      const allMigrations = await this.getMigrationFiles();
      console.log(`📋 Total migration files: ${allMigrations.length}`);
      
      // Find pending migrations
      const pendingMigrations = allMigrations.filter(
        file => !executedMigrations.includes(file)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('\n✓ All migrations are up to date!');
        return { success: true, executed: 0, failed: 0 };
      }
      
      console.log(`\n⏳ Pending migrations: ${pendingMigrations.length}`);
      console.log('─'.repeat(60));
      pendingMigrations.forEach(file => console.log(`  • ${file}`));
      
      // Execute pending migrations
      const results = [];
      for (const migration of pendingMigrations) {
        const result = await this.executeMigration(migration);
        results.push(result);
        
        // Stop on first failure
        if (!result.success) {
          console.log('\n⚠️  Migration stopped due to error');
          break;
        }
      }
      
      // Summary
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log('\n' + '═'.repeat(60));
      console.log('📊 Migration Summary:');
      console.log(`   ✓ Successful: ${successful}`);
      console.log(`   ✗ Failed: ${failed}`);
      console.log('═'.repeat(60));
      
      return { success: failed === 0, executed: successful, failed };
    } catch (error) {
      console.error('\n✗ Migration process failed:', error.message);
      return { success: false, executed: 0, failed: 1, error: error.message };
    }
  }

  /**
   * Rollback last migration
   */
  async rollbackLastMigration() {
    console.log('\n🔄 Rolling back last migration');
    console.log('═'.repeat(60));
    
    try {
      // Get last executed migration
      const query = `
        SELECT migration_name FROM ${this.tableName} 
        WHERE success = true 
        ORDER BY id DESC 
        LIMIT 1
      `;
      const result = await pool.query(query);
      
      if (result.rows.length === 0) {
        console.log('⚠️  No migrations to rollback');
        return { success: false, message: 'No migrations to rollback' };
      }
      
      const lastMigration = result.rows[0].migration_name;
      console.log(`\n📄 Last migration: ${lastMigration}`);
      
      // Find rollback file
      const rollbackFile = lastMigration.replace('.sql', '_rollback.sql');
      const rollbackPath = path.join(this.migrationsPath, rollbackFile);
      
      // Check if rollback file exists
      if (!fs.existsSync(rollbackPath)) {
        console.log(`⚠️  Rollback file not found: ${rollbackFile}`);
        return { success: false, message: 'Rollback file not found' };
      }
      
      // Read and execute rollback SQL
      const sql = await readFile(rollbackPath, 'utf8');
      await pool.query(sql);
      
      // Remove from tracking table
      await pool.query(
        `DELETE FROM ${this.tableName} WHERE migration_name = $1`,
        [lastMigration]
      );
      
      console.log(`✓ Successfully rolled back: ${lastMigration}`);
      return { success: true, rolledBack: lastMigration };
    } catch (error) {
      console.error('✗ Rollback failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Show migration status
   */
  async showStatus() {
    console.log('\n📊 Migration Status');
    console.log('═'.repeat(60));
    
    try {
      await this.initMigrationsTable();
      
      const allMigrations = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      console.log('\nMigrations:');
      console.log('─'.repeat(60));
      
      for (const migration of allMigrations) {
        const isExecuted = executedMigrations.includes(migration);
        const status = isExecuted ? '✓ EXECUTED' : '⏳ PENDING';
        const symbol = isExecuted ? '✓' : '○';
        console.log(`  ${symbol} ${migration.padEnd(50)} ${status}`);
      }
      
      console.log('─'.repeat(60));
      console.log(`Total: ${allMigrations.length} | Executed: ${executedMigrations.length} | Pending: ${allMigrations.length - executedMigrations.length}`);
      console.log('═'.repeat(60));
      
      return { allMigrations, executedMigrations };
    } catch (error) {
      console.error('✗ Failed to fetch status:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Create a new migration file
   */
  async createMigration(name) {
    try {
      // Get next migration number
      const files = await this.getMigrationFiles();
      const lastNumber = files.length > 0 
        ? parseInt(files[files.length - 1].substring(0, 3)) 
        : 0;
      const nextNumber = String(lastNumber + 1).padStart(3, '0');
      
      // Create filename
      const filename = `${nextNumber}_${name.toLowerCase().replace(/\s+/g, '_')}.sql`;
      const rollbackFilename = `${nextNumber}_${name.toLowerCase().replace(/\s+/g, '_')}_rollback.sql`;
      
      const filePath = path.join(this.migrationsPath, filename);
      const rollbackPath = path.join(this.migrationsPath, rollbackFilename);
      
      // Create migration file
      const template = `-- ============================================================================
-- MIGRATION: ${name}
-- Description: 
-- Author: System
-- Date: ${new Date().toISOString().split('T')[0]}
-- ============================================================================

BEGIN;

-- Your migration SQL here

COMMIT;

-- Verification queries (commented)
-- SELECT ...
`;

      const rollbackTemplate = `-- ============================================================================
-- ROLLBACK: ${name}
-- Description: Rollback for ${filename}
-- ============================================================================

BEGIN;

-- Your rollback SQL here

COMMIT;
`;

      await fs.promises.writeFile(filePath, template, 'utf8');
      await fs.promises.writeFile(rollbackPath, rollbackTemplate, 'utf8');
      
      console.log(`✓ Created migration: ${filename}`);
      console.log(`✓ Created rollback: ${rollbackFilename}`);
      
      return { success: true, filename, rollbackFilename };
    } catch (error) {
      console.error('✗ Failed to create migration:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// CLI interface
const runner = new MigrationRunner();

const command = process.argv[2];

switch (command) {
  case 'up':
  case 'run':
    await runner.runMigrations();
    process.exit(0);
    break;
    
  case 'down':
  case 'rollback':
    await runner.rollbackLastMigration();
    process.exit(0);
    break;
    
  case 'status':
    await runner.showStatus();
    process.exit(0);
    break;
    
  case 'create':
    const migrationName = process.argv[3];
    if (!migrationName) {
      console.error('⚠️  Please provide a migration name');
      console.log('Usage: node migrate.js create "migration_name"');
      process.exit(1);
    }
    await runner.createMigration(migrationName);
    process.exit(0);
    break;
    
  default:
    console.log('\n📖 Database Migration Tool');
    console.log('═'.repeat(60));
    console.log('\nUsage:');
    console.log('  node migrate.js <command> [options]\n');
    console.log('Commands:');
    console.log('  run, up          Run all pending migrations');
    console.log('  rollback, down   Rollback the last migration');
    console.log('  status           Show migration status');
    console.log('  create <name>    Create a new migration file\n');
    console.log('Examples:');
    console.log('  node migrate.js run');
    console.log('  node migrate.js status');
    console.log('  node migrate.js rollback');
    console.log('  node migrate.js create "add_users_table"');
    console.log('═'.repeat(60));
    process.exit(0);
}
