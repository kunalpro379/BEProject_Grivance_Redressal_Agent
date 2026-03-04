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
import departmentRoutes from './src/routes/department.routes.js';
import departmentDashboardRoutes from './src/routes/department-dashboard.routes.js';
import otpRoutes from './src/routes/otp.routes.js';
import settingsRoutes from './src/routes/settings.routes.js';
import budgetRoutes from './src/routes/budget.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import chatRoutes from './src/routes/chat.routes.js';
import rolesRoutes from './src/routes/roles.routes.js';
import commentsRoutes from './src/routes/comments.routes.js';
import whatsappRoutes from './src/routes/whatsapp.routes.js';
import whatsappAdminRoutes from './src/routes/whatsapp-admin.routes.js';
import progressReportsRoutes from './src/routes/progress-reports.routes.js';
import fieldWorkerRequestsRoutes from './src/routes/field-worker-requests.routes.js';
import pendingRegistrationsRoutes from './src/routes/pending-registrations.routes.js';
import contractorAnalysisRoutes from './src/routes/contractor-analysis.routes.js';
import contractorReportsRoutes from './src/routes/contractor-reports.routes.js';
import commentsAnalysisRoutes from './src/routes/comments-analysis.routes.js';
import subscriptionRoutes from './src/routes/subscription.routes.js';

// Import services
import pool from './src/config/db.js';
import telegramBot from './src/services/telegram.bot.service.js';
import telegramFieldWorkerBot from './src/services/telegram-fieldworker-bot.service.js';
import telegramContractorBot from './src/services/telegram-contractor-bot.service.js';
import whatsappScheduler from './src/services/whatsapp.scheduler.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5010', 'http://localhost:5011', 'http://localhost:5173'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // Higher limit for development
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
app.use('/api/otp', otpRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api', commentsRoutes); // Comments routes (includes /api/grievances/:id/comments and /api/comments/:id)
app.use('/api/vector', vectorRoutes);
app.use('/api/citizens', citizenRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/knowledgebase', knowledgeBaseRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/department-dashboard', departmentDashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/whatsapp-admin', whatsappAdminRoutes);
app.use('/api/progress-reports', progressReportsRoutes);
app.use('/api/field-worker-requests', fieldWorkerRequestsRoutes);
app.use('/api/pending-registrations', pendingRegistrationsRoutes);
app.use('/api/contractor-analysis', contractorAnalysisRoutes);
app.use('/api/contractor-reports', contractorReportsRoutes);
app.use('/api/comments-analysis', commentsAnalysisRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

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



// Initialize Telegram Grievance Bot (Citizens)
(async () => {
  try {
    const grievanceToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (grievanceToken && !grievanceToken.includes('your_') && grievanceToken.length > 20) {
      await telegramBot.init();
      console.log(' Telegram Grievance Bot initialized');
    } else {
      console.log('⚠️  Telegram Grievance Bot token not configured - skipping initialization');
    }
  } catch (error) {
    console.warn('⚠️  Telegram Grievance Bot initialization failed:', error.message);
    console.warn('  Server will continue without Grievance bot');
  }
})();

// Initialize Telegram Field Worker Bot (Department Staff)
(async () => {
  try {
    const fieldWorkerToken = process.env.TELEGRAM_FIELDWORKER_BOT_TOKEN;
    
    if (fieldWorkerToken && !fieldWorkerToken.includes('your_') && fieldWorkerToken.length > 20) {
      await telegramFieldWorkerBot.initialize();
      console.log(' Telegram Field Worker Bot initialized');
    } else {
      console.log('⚠️  Telegram Field Worker Bot token not configured - skipping initialization');
    }
  } catch (error) {
    console.warn('⚠️  Telegram Field Worker Bot initialization failed:', error.message);
    console.warn('  Server will continue without Field Worker bot');
  }
})();

// Initialize Telegram Contractor Bot
(async () => {
  try {
    const contractorToken = process.env.TELEGRAM_CONTRACTOR_BOT_TOKEN;
    
    // Only initialize if token is configured and not a placeholder
    if (contractorToken && !contractorToken.includes('your_') && contractorToken.length > 20) {
      telegramContractorBot.initialize();
      console.log(' Telegram Contractor Bot initialized');
    } else {
      console.log('⚠️  Telegram Contractor Bot token not configured - skipping initialization');
      console.log('   Add TELEGRAM_CONTRACTOR_BOT_TOKEN to .env to enable contractor bot');
    }
  } catch (error) {
    console.warn('⚠️  Telegram Contractor Bot initialization failed:', error.message);
    console.warn('  Server will continue without Contractor bot');
  }
})();

// Initialize WhatsApp Scheduler
if (process.env.WHATSAPP_ACCESS_TOKEN) {
  try {
    // Start daily report reminders at 6 PM
    whatsappScheduler.startDailyReportReminders(18, 0);
    
    // Start weekly summaries on Friday at 5 PM
    whatsappScheduler.startWeeklySummary(5, 17, 0);
    
    console.log(' WhatsApp scheduler initialized');
  } catch (error) {
    console.warn('⚠️  WhatsApp scheduler initialization failed:', error.message);
  }
}

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
  whatsappScheduler.stopAll();
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, closing server...');
  whatsappScheduler.stopAll();
  await pool.end();
  process.exit(0);
});
