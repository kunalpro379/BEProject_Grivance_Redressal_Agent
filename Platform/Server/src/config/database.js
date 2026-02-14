import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use DATABASE_URL if available, otherwise fall back to individual params
const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: {
          rejectUnauthorized: false, // Required for Neon DB
        },
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
