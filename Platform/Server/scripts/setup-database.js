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

async function setupDatabase() {
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
    console.log('✅ Connected to database');

    // Read SQL file
    const sqlPath = path.join(__dirname, '..', 'DB.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');

    // Generate admin password hash
    const adminPassword = 'Admin@123';
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    // Replace placeholder with actual hash
    sql = sql.replace('$2b$10$YourHashedPasswordHere', passwordHash);

    console.log('📝 Executing database schema...');
    
    // Execute the SQL
    await client.query(sql);
    
    console.log('✅ Database schema created successfully!');
    console.log('\n=================================');
    console.log('🔐 Default Admin Credentials:');
    console.log('=================================');
    console.log('Email: admin@igrs.gov.in');
    console.log('Password:', adminPassword);
    console.log('=================================\n');
    console.log('⚠️  Please change the admin password after first login!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    if (error.detail) {
      console.error('Details:', error.detail);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

setupDatabase();
