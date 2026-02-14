// Fix for Azure SDK crypto requirement in Docker
const { webcrypto } = require('crypto');
if (!globalThis.crypto) {
    globalThis.crypto = webcrypto;
}

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const grievanceRoutes = require('./routes/grivance.routes');
const telegramRoutes = require('./routes/telegram.routes');
const workerRoutes = require('./routes/worker.routes');
const citizenRoutes = require('./routes/citizen.routes');
const telegramBot = require('./services/telegram.bot.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Routes
app.use('/api', grievanceRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/citizens', citizenRoutes);

// Initialize Telegram Bot
telegramBot.init();

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large! Maximum size is 10MB.'
        });
    }
    
    res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Grievance API server running on http://localhost:${PORT}`);
    console.log(`📁 Temporary uploads directory: ${path.resolve('./uploads')}`);
    console.log(`☁️ Files will be stored in Azure Storage container: ${process.env.AZURE_STORAGE_CONTAINER_NAME || 'test'}`);
    console.log(`🤖 Telegram Bot initialized`);
});