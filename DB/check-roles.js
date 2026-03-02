import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config({ path: '../Server/.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function checkRoles() {
  try {
    const result = await pool.query('SELECT * FROM government_roles ORDER BY role_name');
    console.log('Government Roles:');
    result.rows.forEach((role, index) => {
      console.log(`${index + 1}. ${role.role_name} (ID: ${role.id}, Level: ${role.role_level})`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRoles();
