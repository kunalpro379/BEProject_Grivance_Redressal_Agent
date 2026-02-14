const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool with optimized settings for Supabase
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'grievance_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10, // Reduced from 20 for Supabase pooler
    min: 2, // Keep minimum connections
    idleTimeoutMillis: 10000, // Reduced from 30000
    connectionTimeoutMillis: 5000, // Increased from 2000
    allowExitOnIdle: true, // Allow pool to close when idle
});

// Test connection
pool.on('connect', (client) => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err, client) => {
    console.error('❌ Unexpected database error:', err.message);
    // Don't exit on error, just log it
});

pool.on('remove', () => {
    console.log('🔌 Database connection removed from pool');
});

// Helper function to execute queries
const query = async (text, params) => {
    const client = await pool.connect();
    try {
        const start = Date.now();
        const res = await client.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text: text.substring(0, 50) + '...', duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    } finally {
        client.release();
    }
};

// Helper function to get a client from pool
const getClient = async () => {
    return await pool.connect();
};

module.exports = {
    query,
    getClient,
    pool
};
