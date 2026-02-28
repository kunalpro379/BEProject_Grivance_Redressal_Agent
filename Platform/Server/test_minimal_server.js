import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const app = express();

// Create pool with minimal settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

let connectCount = 0;
pool.on('connect', () => {
  connectCount++;
  console.log(`Connection #${connectCount} established`);
});

pool.on('error', (err) => {
  console.error('Pool error:', err.message);
});

// Simple health check
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

const PORT = 4001;
app.listen(PORT, () => {
  console.log(`\nMinimal test server running on port ${PORT}`);
  console.log('Try: http://localhost:4001/health');
  console.log('Try: http://localhost:4001/test\n');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await pool.end();
  process.exit(0);
});
