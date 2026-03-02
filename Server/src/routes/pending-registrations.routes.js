import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Get all pending registrations
 * Only accessible by department heads and admins
 */
router.get('/', authenticateToken, authorizeRoles(['department_head', 'admin']), async (req, res) => {
  try {
    const { status = 'pending', department_id } = req.query;

    let query = `
      SELECT 
        pr.*,
        d.name as department_name,
        u.full_name as reviewed_by_name
      FROM pending_registrations pr
      LEFT JOIN departments d ON pr.department_id = d.id
      LEFT JOIN users u ON pr.reviewed_by = u.id
      WHERE pr.status = $1
    `;

    const params = [status];

    // Filter by department if user is department head
    if (req.user.role === 'department_head') {
      query += ` AND pr.department_id = $2`;
      params.push(req.user.department_id);
    } else if (department_id) {
      query += ` AND pr.department_id = $2`;
      params.push(department_id);
    }

    query += ` ORDER BY pr.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching pending registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending registrations'
    });
  }
});

/**
 * Get single pending registration
 */
router.get('/:id', authenticateToken, authorizeRoles(['department_head', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        pr.*,
        d.name as department_name,
        u.full_name as reviewed_by_name
       FROM pending_registrations pr
       LEFT JOIN departments d ON pr.department_id = d.id
       LEFT JOIN users u ON pr.reviewed_by = u.id
       WHERE pr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration request not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registration'
    });
  }
});

/**
 * Approve registration
 */
router.post('/:id/approve', authenticateToken, authorizeRoles(['department_head', 'admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { department_id } = req.body;

    // Get pending registration
    const regResult = await client.query(
      'SELECT * FROM pending_registrations WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (regResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Pending registration not found'
      });
    }

    const registration = regResult.rows[0];

    // Create user account
    const userResult = await client.query(
      `INSERT INTO users (full_name, phone, role, department_id, status, password_hash)
       VALUES ($1, $2, $3, $4, 'active', 'telegram_whatsapp_user')
       RETURNING id`,
      [
        registration.full_name,
        registration.telegram_user_id || registration.whatsapp_phone,
        registration.user_type === 'contractor' ? 'contractor' : 'department_officer',
        department_id || registration.department_id
      ]
    );

    const userId = userResult.rows[0].id;

    // Create citizen record (for foreign key constraints)
    await client.query(
      `INSERT INTO citizens (user_id, phone, full_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, registration.telegram_user_id || registration.whatsapp_phone, registration.full_name]
    );

    // Create type-specific record
    if (registration.user_type === 'contractor') {
      const contractorId = `CONT-${Date.now().toString().slice(-6)}`;
      await client.query(
        `INSERT INTO contractors 
         (contractor_id, company_name, contact_person, phone, specialization, documents, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [
          contractorId,
          registration.company_name,
          registration.full_name,
          registration.telegram_user_id || registration.whatsapp_phone,
          registration.category,
          JSON.stringify({
            license_number: registration.license_number,
            gst: registration.gst_number,
            status: 'approved'
          })
        ]
      );
    } else if (registration.user_type === 'field_worker') {
      const staffId = `STAFF-${Date.now().toString().slice(-6)}`;
      await client.query(
        `INSERT INTO departmentofficers 
         (staff_id, user_id, role, zone, ward, specialization, status)
         VALUES ($1, $2, 'field_worker', $3, $4, $5, 'active')`,
        [
          staffId,
          userId,
          registration.zone,
          registration.ward,
          registration.specialization
        ]
      );
    }

    // Update pending registration status
    await client.query(
      `UPDATE pending_registrations 
       SET status = 'approved', 
           reviewed_by = $1, 
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [req.user.id, id]
    );

    await client.query('COMMIT');

    // TODO: Send notification to user via Telegram/WhatsApp

    res.json({
      success: true,
      message: 'Registration approved successfully',
      data: { userId }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve registration'
    });
  } finally {
    client.release();
  }
});

/**
 * Reject registration
 */
router.post('/:id/reject', authenticateToken, authorizeRoles(['department_head', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE pending_registrations 
       SET status = 'rejected', 
           reviewed_by = $1, 
           reviewed_at = NOW(),
           rejection_reason = $2,
           updated_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [req.user.id, reason, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pending registration not found'
      });
    }

    // TODO: Send notification to user via Telegram/WhatsApp

    res.json({
      success: true,
      message: 'Registration rejected',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error rejecting registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject registration'
    });
  }
});

export default router;
