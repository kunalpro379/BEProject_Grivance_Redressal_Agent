import pool from '../config/database.js';
import grievanceDBService from '../services/grievance.db.service.js';
import azureQueryAnalystQueueService from '../services/azure.queue.queryanalyst.service.js';

export const createGrievance = async (req, res) => {
  try {
    const { grievance_text, image_path, image_description, enhanced_query } = req.body;
    const userId = req.user.id;

    // Get citizen_id from user_id (for web-registered citizens)
    const citizenResult = await pool.query(
      'SELECT id FROM "Citizens" WHERE user_id = $1',
      [userId]
    );

    if (citizenResult.rows.length === 0) {
      return res.status(400).json({ error: 'User is not registered as a citizen' });
    }

    const citizenId = citizenResult.rows[0].id;

    // Use the common grievance service (same as Telegram bot)
    const grievanceResult = await grievanceDBService.submitGrievance({
      citizen_id: citizenId,
      grievance_text,
      image_path: image_path || null,
      image_description: image_description || null,
      enhanced_query: enhanced_query || null,
      embedding: null // Can be added later with vector search
    });

    // Push to AI analysis queue (same as Telegram bot)
    const queueMessage = {
      grievance_id: grievanceResult.grievance_id,
      citizen_id: citizenId,
      user_id: userId,
      grievance_text,
      image_path: image_path || null,
      timestamp: new Date().toISOString(),
      source: 'web'
    };

    await azureQueryAnalystQueueService.sendMessage(queueMessage);

    res.status(201).json({
      success: true,
      message: 'Grievance submitted successfully',
      grievance_id: grievanceResult.grievance_id,
      status: 'pending_analysis'
    });
  } catch (error) {
    console.error('Create grievance error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create grievance',
      message: error.message 
    });
  }
};

export const getGrievances = async (req, res) => {
  try {
    const { status, department_id, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT g.*, u.full_name as user_name, u.email as user_email,
             o.full_name as officer_name, d.name as department_name
      FROM "UserGrievance" g
      LEFT JOIN "Users" u ON g.user_id = u.id
      LEFT JOIN "Users" o ON g.assigned_officer_id = o.id
      LEFT JOIN "Departments" d ON g.department_id = d.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (userRole === 'citizen') {
      query += ` AND g.user_id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    } else if (userRole === 'department_officer') {
      query += ` AND (g.assigned_officer_id = $${paramCount} OR g.department_id = $${paramCount + 1})`;
      params.push(userId, req.user.department_id);
      paramCount += 2;
    } else if (userRole === 'department_head') {
      query += ` AND g.department_id = $${paramCount}`;
      params.push(req.user.department_id);
      paramCount++;
    }

    if (status) {
      query += ` AND g.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (department_id && (userRole === 'admin' || userRole === 'department_head')) {
      query += ` AND g.department_id = $${paramCount}`;
      params.push(department_id);
      paramCount++;
    }

    query += ` ORDER BY g.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await pool.query(query, params);

    res.json({
      grievances: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get grievances error:', error);
    res.status(500).json({ error: 'Failed to fetch grievances' });
  }
};

export const getGrievanceById = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT g.*, u.full_name as user_name, u.email as user_email, u.phone as user_phone,
             o.full_name as officer_name, d.name as department_name,
             r.full_name as resolver_name
      FROM "UserGrievance" g
      LEFT JOIN "Users" u ON g.user_id = u.id
      LEFT JOIN "Users" o ON g.assigned_officer_id = o.id
      LEFT JOIN "Users" r ON g.resolved_by = r.id
      LEFT JOIN "Departments" d ON g.department_id = d.id
      WHERE g.id = $1
    `;

    const params = [grievanceId];

    if (userRole === 'citizen') {
      query += ' AND g.user_id = $2';
      params.push(userId);
    } else if (userRole === 'department_officer') {
      query += ' AND (g.assigned_officer_id = $2 OR g.department_id = $3)';
      params.push(userId, req.user.department_id);
    } else if (userRole === 'department_head') {
      query += ' AND g.department_id = $2';
      params.push(req.user.department_id);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    const commentsResult = await pool.query(
      `SELECT c.*, u.full_name as user_name, u.role
       FROM "GrievanceComments" c
       LEFT JOIN "Users" u ON c.user_id = u.id
       WHERE c.grievance_id = $1
       ORDER BY c.created_at ASC`,
      [grievanceId]
    );

    res.json({
      grievance: result.rows[0],
      comments: commentsResult.rows
    });
  } catch (error) {
    console.error('Get grievance error:', error);
    res.status(500).json({ error: 'Failed to fetch grievance' });
  }
};

export const updateGrievance = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { grievanceId } = req.params;
    const { status, assigned_officer_id, resolution_text } = req.body;
    const userRole = req.user.role;

    if (userRole === 'citizen') {
      return res.status(403).json({ error: 'Citizens cannot update grievances' });
    }

    await client.query('BEGIN');

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (status) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;

      if (status === 'resolved') {
        updates.push(`resolved_at = NOW()`);
        updates.push(`resolved_by = $${paramCount}`);
        params.push(req.user.id);
        paramCount++;
      }
    }

    if (assigned_officer_id !== undefined) {
      updates.push(`assigned_officer_id = $${paramCount}`);
      params.push(assigned_officer_id);
      paramCount++;
    }

    if (resolution_text) {
      updates.push(`resolution_text = $${paramCount}`);
      params.push(resolution_text);
      paramCount++;
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(grievanceId);

    const query = `
      UPDATE "UserGrievance"
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Grievance not found' });
    }

    await client.query('COMMIT');

    res.json({
      message: 'Grievance updated successfully',
      grievance: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update grievance error:', error);
    res.status(500).json({ error: 'Failed to update grievance' });
  } finally {
    client.release();
  }
};

export const addComment = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const { comment, is_internal = false } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO "GrievanceComments" (grievance_id, user_id, comment, is_internal)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [grievanceId, userId, comment, is_internal]
    );

    res.status(201).json({
      message: 'Comment added successfully',
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

export const getStats = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereClause = '';
    const params = [];

    if (userRole === 'citizen') {
      whereClause = 'WHERE user_id = $1';
      params.push(userId);
    } else if (userRole === 'department_officer') {
      whereClause = 'WHERE (assigned_officer_id = $1 OR department_id = $2)';
      params.push(userId, req.user.department_id);
    } else if (userRole === 'department_head') {
      whereClause = 'WHERE department_id = $1';
      params.push(req.user.department_id);
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM "UserGrievance"
      ${whereClause}
    `;

    const result = await pool.query(statsQuery, params);

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};
