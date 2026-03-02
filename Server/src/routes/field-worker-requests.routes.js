import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';
import telegramFieldWorkerBot from '../services/telegram-fieldworker-bot.service.js';

const router = express.Router();

/**
 * Get pending field worker registration requests for the logged-in department officer
 */
router.get('/pending', authenticateToken, authorizeRoles(['department_head', 'department_officer']), async (req, res) => {
  try {
    console.log('🔍 Field worker requests - User data:', {
      userId: req.user.userId,
      role: req.user.role,
      department_id: req.user.department_id,
      fullUser: req.user
    });
    
    const departmentId = req.user.department_id;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: 'User is not associated with any department'
      });
    }

    const result = await pool.query(
      `SELECT 
        pr.id,
        pr.telegram_user_id,
        pr.phone,
        pr.full_name,
        pr.specialization,
        pr.zone,
        pr.ward,
        pr.status,
        pr.channel,
        pr.created_at
      FROM pending_registrations pr
      WHERE pr.user_type = 'field_worker'
        AND pr.status = 'pending'
        AND (pr.department_id = $1 OR pr.department_id IS NULL)
      ORDER BY pr.created_at DESC`,
      [departmentId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending requests'
    });
  }
});

/**
 * Approve field worker registration request
 */
router.post('/approve/:requestId', authenticateToken, authorizeRoles(['department_head', 'department_officer']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { requestId } = req.params;
    const departmentId = req.user.department_id;
    const reviewerId = req.user.id;

    if (!departmentId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'User is not associated with any department'
      });
    }

    // Get pending registration
    const regResult = await client.query(
      'SELECT * FROM pending_registrations WHERE id = $1 AND status = $2 AND user_type = $3',
      [requestId, 'pending', 'field_worker']
    );

    if (regResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Pending request not found'
      });
    }

    const registration = regResult.rows[0];

    // Generate a default email if not provided
    const email = registration.email || `${registration.phone.replace(/\+/g, '')}@fieldworker.local`;

    // Create user account with real phone number
    const userResult = await client.query(
      `INSERT INTO users (full_name, phone, email, role, department_id, status, password_hash)
       VALUES ($1, $2, $3, 'department_officer', $4, 'active', 'telegram_whatsapp_user')
       RETURNING id`,
      [registration.full_name, registration.phone, email, departmentId]
    );

    const userId = userResult.rows[0].id;

    // Create citizen record (for foreign key constraints)
    // Check if citizen already exists first
    const existingCitizen = await client.query(
      'SELECT id FROM citizens WHERE user_id = $1',
      [userId]
    );

    if (existingCitizen.rows.length === 0) {
      await client.query(
        `INSERT INTO citizens (user_id, phone, full_name)
         VALUES ($1, $2, $3)`,
        [userId, registration.phone, registration.full_name]
      );
    }

    // Create department officer record (field worker)
    const staffId = `STAFF-${Date.now().toString().slice(-6)}`;
    await client.query(
      `INSERT INTO departmentofficers 
       (staff_id, user_id, department_id, role, zone, ward, specialization, status)
       VALUES ($1, $2, $3, 'field_worker', $4, $5, $6, 'active')`,
      [
        staffId,
        userId,
        departmentId,
        registration.zone || null,
        registration.ward || null,
        registration.specialization || null
      ]
    );

    // Update pending registration status
    await client.query(
      `UPDATE pending_registrations 
       SET status = 'approved', 
           reviewed_by = $1, 
           reviewed_at = NOW(),
           department_id = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [reviewerId, departmentId, requestId]
    );

    await client.query('COMMIT');

    // Send notification to user via Telegram
    if (registration.channel === 'telegram' && registration.telegram_user_id) {
      try {
        const message = `✅ *Registration Approved!*\n\n` +
                       `Congratulations ${registration.full_name}! Your field worker registration has been approved.\n\n` +
                       `📋 *Your Details:*\n` +
                       `• Staff ID: ${staffId}\n` +
                       `• Phone: ${registration.phone}\n` +
                       `• Department: ${departmentId}\n` +
                       `${registration.specialization ? `• Specialization: ${registration.specialization}\n` : ''}` +
                       `${registration.zone ? `• Zone: ${registration.zone}\n` : ''}\n\n` +
                       `You can now submit daily work reports through this bot. Just send me your daily progress!`;
        
        await telegramFieldWorkerBot.sendNotification(registration.telegram_user_id, message);
        console.log(`✅ Approval notification sent to Telegram user ${registration.telegram_user_id}`);
      } catch (notifError) {
        console.error('⚠️  Failed to send Telegram notification:', notifError.message);
        // Don't fail the approval if notification fails
      }
    }

    res.json({
      success: true,
      message: 'Field worker approved and added to your department',
      data: {
        userId,
        staffId,
        full_name: registration.full_name,
        phone: registration.phone
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving field worker:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve request',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * Reject field worker registration request
 */
router.post('/reject/:requestId', authenticateToken, authorizeRoles(['department_head', 'department_officer']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const reviewerId = req.user.id;

    const result = await pool.query(
      `UPDATE pending_registrations 
       SET status = 'rejected', 
           reviewed_by = $1, 
           reviewed_at = NOW(),
           rejection_reason = $2,
           updated_at = NOW()
       WHERE id = $3 AND status = 'pending' AND user_type = 'field_worker'
       RETURNING *`,
      [reviewerId, reason, requestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pending request not found'
      });
    }

    const registration = result.rows[0];

    // Send notification to user via Telegram
    if (registration.channel === 'telegram' && registration.telegram_user_id) {
      try {
        const message = `❌ *Registration Rejected*\n\n` +
                       `Dear ${registration.full_name},\n\n` +
                       `Unfortunately, your field worker registration request has been rejected.\n\n` +
                       `📋 *Reason:*\n${reason || 'No reason provided'}\n\n` +
                       `If you believe this is a mistake, please contact your department administrator.`;
        
        await telegramFieldWorkerBot.sendNotification(registration.telegram_user_id, message);
        console.log(`✅ Rejection notification sent to Telegram user ${registration.telegram_user_id}`);
      } catch (notifError) {
        console.error('⚠️  Failed to send Telegram notification:', notifError.message);
        // Don't fail the rejection if notification fails
      }
    }

    res.json({
      success: true,
      message: 'Request rejected',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject request'
    });
  }
});

/**
 * Manually add a field worker (direct addition without approval)
 */
router.post('/add', authenticateToken, authorizeRoles(['department_head', 'department_officer']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { full_name, phone, email, specialization, zone, ward } = req.body;
    const departmentId = req.user.department_id;
    const addedBy = req.user.userId;

    if (!departmentId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'User is not associated with any department'
      });
    }

    if (!full_name || !phone) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Full name and phone number are required'
      });
    }

    // Check if phone number already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'A user with this phone number already exists'
      });
    }

    // Create user account with phone number
    const userResult = await client.query(
      `INSERT INTO users (full_name, phone, email, role, department_id, status, password_hash)
       VALUES ($1, $2, $3, 'department_officer', $4, 'active', 'manual_add_default_password')
       RETURNING id`,
      [full_name, phone, email || null, departmentId]
    );

    const userId = userResult.rows[0].id;

    // Create citizen record (for foreign key constraints)
    // Check if citizen already exists first
    const existingCitizen = await client.query(
      'SELECT id FROM citizens WHERE user_id = $1',
      [userId]
    );

    if (existingCitizen.rows.length === 0) {
      await client.query(
        `INSERT INTO citizens (user_id, phone, full_name, email)
         VALUES ($1, $2, $3, $4)`,
        [userId, phone, full_name, email || null]
      );
    }

    // Create department officer record (field worker)
    const staffId = `STAFF-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    await client.query(
      `INSERT INTO departmentofficers 
       (staff_id, user_id, department_id, role, zone, ward, specialization, status)
       VALUES ($1, $2, $3, 'field_worker', $4, $5, $6, 'active')`,
      [
        staffId,
        userId,
        departmentId,
        zone || null,
        ward || null,
        specialization || null
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Field worker added successfully',
      data: {
        userId,
        staffId,
        full_name,
        phone,
        email,
        specialization,
        zone,
        ward
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding field worker:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add field worker',
      error: error.message
    });
  } finally {
    client.release();
  }
});

export default router;
