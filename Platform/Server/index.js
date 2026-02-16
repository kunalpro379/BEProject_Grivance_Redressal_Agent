// Fix for Azure SDK crypto requirement in Docker
import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './src/routes/auth.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import grievanceRoutes from './src/routes/grievance.routes.js';
import vectorRoutes from './src/routes/vector.routes.js';
import citizenRoutes from './src/routes/citizen.routes.js';
import workerRoutes from './src/routes/worker.routes.js';
import telegramRoutes from './src/routes/telegram.routes.js';
import knowledgeBaseRoutes from './src/routes/knowledgebase.routes.js';

// Import services
import pool from './src/config/database.js';
import telegramBot from './src/services/telegram.bot.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'connected',
        azure_storage: 'configured',
        azure_queue: 'configured'
      }
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      message: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint for frontend connectivity
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/vector', vectorRoutes);
app.use('/api/citizens', citizenRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/knowledgebase', knowledgeBaseRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large! Maximum size is 10MB.'
    });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Initialize Telegram Bot (non-blocking)
(async () => {
  try {
    await telegramBot.init();
    console.log('Telegram Bot initialized');
  } catch (error) {
    console.warn('⚠️  Telegram Bot initialization failed:', error.message);
    console.warn('⚠️  Server will continue without Telegram bot');
  }
})();

// Start server
app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('   IGRS Full-Stack Server');
  console.log('========================================\n');
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
  console.log(`Database: Connected`);
  console.log(`Vector search: Enabled with pgvector`);
  console.log(`Azure Storage: ${process.env.AZURE_STORAGE_CONTAINER_NAME || 'igrs'}`);
  console.log('\n========================================\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, closing server...');
  await pool.end();
  process.exit(0);
});
