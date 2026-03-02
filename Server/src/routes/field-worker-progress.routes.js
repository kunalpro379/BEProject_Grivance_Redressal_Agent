import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Get all field worker daily reports with AI analysis
 * For admin panel table view
 */
router.get('/reports', authenticateToken, authorizeRoles(['department_head', 'department_officer', 'admin']), async (req, res) => {
  try {
    const { department_id, status, date_from, date_to, user_id } = req.query;

    let query = `
      SELECT 
        dr.*,
        u.full_name as worker_name,
        u.phone as worker_phone,
        d.name as department_name,
        doff.staff_id,
        doff.zone,
        doff.ward,
        doff.specialization
      FROM daily_reports dr
      JOIN users u ON dr.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN departmentofficers doff ON doff.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    // Filter by department if user is department head
    if (req.user.role === 'department_head') {
      query += ` AND u.department_id = $${paramCount}`;
      params.push(req.user.department_id);
      paramCount++;
    } else if (department_id) {
      query += ` AND u.department_id = $${paramCount}`;
      params.push(department_id);
      paramCount++;
    }

    // Filter by status
    if (status) {
      query += ` AND dr.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Filter by date range
    if (date_from) {
      query += ` AND dr.date >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      query += ` AND dr.date <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    // Filter by specific user
    if (user_id) {
      query += ` AND dr.user_id = $${paramCount}`;
      params.push(user_id);
      paramCount++;
    }

    query += ` ORDER BY dr.date DESC, dr.created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching field worker reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports'
    });
  }
});

/**
 * Get single report with full details and chat history
 */
router.get('/reports/:id', authenticateToken, authorizeRoles(['department_head', 'department_officer', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Get report details
    const reportResult = await pool.query(
      `SELECT 
        dr.*,
        u.full_name as worker_name,
        u.phone as worker_phone,
        u.email as worker_email,
        d.name as department_name,
        doff.staff_id,
        doff.zone,
        doff.ward,
        doff.specialization,
        reviewer.full_name as reviewed_by_name
      FROM daily_reports dr
      JOIN users u ON dr.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN departmentofficers doff ON doff.user_id = u.id
      LEFT JOIN users reviewer ON dr.reviewed_by = reviewer.id
      WHERE dr.id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reportResult.rows[0];

    // Get chat history for this worker on this date
    const chatResult = await pool.query(
      `SELECT 
        message,
        is_bot,
        created_at
      FROM whatsapp_conversations
      WHERE user_id = $1 
        AND DATE(created_at) = $2
      ORDER BY created_at ASC`,
      [report.worker_phone, report.date]
    );

    res.json({
      success: true,
      data: {
        report,
        chat_history: chatResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching report details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report details'
    });
  }
});

/**
 * Get field worker statistics
 */
router.get('/stats', authenticateToken, authorizeRoles(['department_head', 'department_officer', 'admin']), async (req, res) => {
  try {
    const { department_id, date_from, date_to } = req.query;

    let query = `
      SELECT 
        COUNT(*) as total_reports,
        COUNT(DISTINCT dr.user_id) as active_workers,
        AVG(dr.productivity_score) as avg_productivity,
        AVG(dr.quality_score) as avg_quality,
        AVG(dr.hours) as avg_hours,
        COUNT(*) FILTER (WHERE dr.sentiment = 'positive') as positive_reports,
        COUNT(*) FILTER (WHERE dr.sentiment = 'neutral') as neutral_reports,
        COUNT(*) FILTER (WHERE dr.sentiment = 'negative') as negative_reports,
        COUNT(*) FILTER (WHERE dr.status = 'submitted') as pending_review,
        COUNT(*) FILTER (WHERE dr.status = 'approved') as approved_reports
      FROM daily_reports dr
      JOIN users u ON dr.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (req.user.role === 'department_head') {
      query += ` AND u.department_id = $${paramCount}`;
      params.push(req.user.department_id);
      paramCount++;
    } else if (department_id) {
      query += ` AND u.department_id = $${paramCount}`;
      params.push(department_id);
      paramCount++;
    }

    if (date_from) {
      query += ` AND dr.date >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      query += ` AND dr.date <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

/**
 * Review/approve report
 */
router.post('/reports/:id/review', authenticateToken, authorizeRoles(['department_head', 'department_officer']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body; // status: 'approved' or 'rejected'

    const result = await pool.query(
      `UPDATE daily_reports 
       SET status = $1,
           reviewed_by = $2,
           reviewed_at = NOW(),
           reviewer_notes = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, req.user.id, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: `Report ${status}`,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error reviewing report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review report'
    });
  }
});

export default router;
