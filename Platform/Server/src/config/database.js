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
          rejectUnauthorized: false,
        },
        max: 10, // Reduced for Supabase pooler - it handles pooling for us
        min: 1,  // Reduced minimum
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: false,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'igrs_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        max: 10,
        min: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: false,
      }
);

// Connection event handlers
let connectionCount = 0;
pool.on('connect', (client) => {
  connectionCount++;
  if (connectionCount <= 3) {
    console.log(`[Pool] Connection #${connectionCount} established`);
  }
});

pool.on('error', (err, client) => {
  console.error('[Pool] Unexpected database error:', err.message);
  // Don't exit the process, just log the error
});

// Helper function to execute queries
export const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const start = Date.now();
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Query executed', { 
        text: text.substring(0, 50) + '...', 
        duration: `${duration}ms`, 
        rows: res.rowCount 
      });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Helper function to get a client from pool
export const getClient = async () => {
  return await pool.connect();
};

export default pool;
