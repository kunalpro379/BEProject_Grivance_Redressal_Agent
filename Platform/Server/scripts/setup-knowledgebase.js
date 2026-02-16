import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupKnowledgeBase() {
  console.log('Setting up Knowledge Base...\n');

  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✓ Created uploads directory');
    } else {
      console.log('✓ Uploads directory already exists');
    }

    // Run migration
    console.log('\nRunning database migration...');
    const migrationPath = path.join(__dirname, '..', 'migrations', '007_create_knowledgebase_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSQL);
    console.log('✓ Database migration completed successfully');

    console.log('\n✅ Knowledge Base setup completed!\n');
    console.log('Next steps:');
    console.log('1. Configure Azure Storage and Queue in your .env file');
    console.log('2. Restart the server');
    console.log('3. Access the Knowledge Base at /admin/knowledge-base\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupKnowledgeBase();
