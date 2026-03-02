import express from 'express';
import whatsappService from '../services/whatsapp.service.js';
import whatsappScheduler from '../services/whatsapp.scheduler.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import pool from '../config/database.js';

const router = express.Router();

/**
 * Admin routes for WhatsApp management
 * All routes require authentication
 */

/**
 * Send manual message to a user
 * POST /api/whatsapp-admin/send
 */
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required'
      });
    }

    await whatsappService.sendMessage(phone, message);

    res.json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Error sending manual message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

/**
 * Send message with buttons
 * POST /api/whatsapp-admin/send-buttons
 */
router.post('/send-buttons', authenticateToken, async (req, res) => {
  try {
    const { phone, message, buttons } = req.body;

    if (!phone || !message || !buttons || !Array.isArray(buttons)) {
      return res.status(400).json({
        success: false,
        message: 'Phone, message, and buttons array are required'
      });
    }

    await whatsappService.sendButtons(phone, message, buttons);

    res.json({
      success: true,
      message: 'Buttons sent successfully'
    });
  } catch (error) {
    console.error('Error sending buttons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send buttons',
      error: error.message
    });
  }
});

/**
 * Trigger daily report reminders manually
 * POST /api/whatsapp-admin/trigger-daily-reports
 */
router.post('/trigger-daily-reports', authenticateToken, async (req, res) => {
  try {
    // Run in background
    whatsappScheduler.sendDailyReportReminders().catch(err => {
      console.error('Error in manual daily reports:', err);
    });

    res.json({
      success: true,
      message: 'Daily report reminders triggered'
    });
  } catch (error) {
    console.error('Error triggering daily reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger daily reports',
      error: error.message
    });
  }
});

/**
 * Trigger weekly summaries manually
 * POST /api/whatsapp-admin/trigger-weekly-summaries
 */
router.post('/trigger-weekly-summaries', authenticateToken, async (req, res) => {
  try {
    // Run in background
    whatsappScheduler.sendWeeklySummaries().catch(err => {
      console.error('Error in manual weekly summaries:', err);
    });

    res.json({
      success: true,
      message: 'Weekly summaries triggered'
    });
  } catch (error) {
    console.error('Error triggering weekly summaries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger weekly summaries',
      error: error.message
    });
  }
});

/**
 * Send grievance update notification
 * POST /api/whatsapp-admin/notify-grievance
 */
router.post('/notify-grievance', authenticateToken, async (req, res) => {
  try {
    const { grievanceId } = req.body;

    if (!grievanceId) {
      return res.status(400).json({
        success: false,
        message: 'Grievance ID is required'
      });
    }

    await whatsappScheduler.sendGrievanceUpdateNotification(grievanceId);

    res.json({
      success: true,
      message: 'Grievance notification sent'
    });
  } catch (error) {
    console.error('Error sending grievance notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

/**
 * Broadcast message to all users of a specific role
 * POST /api/whatsapp-admin/broadcast
 */
router.post('/broadcast', authenticateToken, async (req, res) => {
  try {
    const { role, message } = req.body;

    if (!role || !message) {
      return res.status(400).json({
        success: false,
        message: 'Role and message are required'
      });
    }

    // Get users with specified role
    const result = await pool.query(
      `SELECT phone, name FROM users WHERE role = $1 AND phone IS NOT NULL`,
      [role]
    );

    let sent = 0;
    let failed = 0;

    for (const user of result.rows) {
      try {
        await whatsappService.sendMessage(user.phone, message);
        sent++;
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to send to ${user.name}:`, error.message);
        failed++;
      }
    }

    res.json({
      success: true,
      message: 'Broadcast completed',
      stats: {
        total: result.rows.length,
        sent,
        failed
      }
    });
  } catch (error) {
    console.error('Error broadcasting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast',
      error: error.message
    });
  }
});

/**
 * Get WhatsApp conversation history
 * GET /api/whatsapp-admin/conversations/:userId
 */
router.get('/conversations/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const result = await pool.query(
      `SELECT * FROM whatsapp_conversations 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );

    res.json({
      success: true,
      conversations: result.rows
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
});

/**
 * Get WhatsApp statistics
 * GET /api/whatsapp-admin/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT user_id) as total_users,
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE is_bot = false) as user_messages,
        COUNT(*) FILTER (WHERE is_bot = true) as bot_messages,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as messages_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as messages_7d
      FROM whatsapp_conversations
    `);

    res.json({
      success: true,
      stats: stats.rows[0]
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

export default router;
