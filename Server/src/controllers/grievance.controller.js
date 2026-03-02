import fs from 'fs';
import pool from '../config/database.js';
import grievanceDBService from '../services/grievance.db.service.js';
import azureQueryAnalystQueueService from '../services/azure.queue.queryanalyst.service.js';
import azureStorageService from '../services/azure.storage.services.js';

/**
 * Submit grievance from platform form (same flow as Telegram: DB + AI queue).
 * Accepts multipart: category, age, city, title, description, proof (optional file).
 */
export const submitGrievanceFromForm = async (req, res) => {
  try {
    const { category, age, city, title, description } = req.body;
    const userId = req.user.id;

    if (!title || !description || !category || !age || !city) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Category, age, city, title, and description are required.'
      });
    }

    // Platform citizens: req.user.id is already citizen id (from citizens table).
    let citizenId;
    if (req.user.role === 'citizen') {
      citizenId = userId;
    } else {
      const citizenResult = await pool.query(
        'SELECT id FROM citizens WHERE user_id = $1',
        [userId]
      );
      if (citizenResult.rows.length === 0) {
        return res.status(400).json({ error: 'User is not registered as a citizen' });
      }
      citizenId = citizenResult.rows[0].id;
    }

    // Build grievance_text for AI (same idea as Telegram: one text block)
    const grievance_text = [
      `Title: ${title}`,
      `Category: ${category}`,
      `City: ${city}`,
      `Age: ${age}`,
      '',
      'Description:',
      description
    ].join('\n');

    let image_path = null;
    let image_description = null;

    if (req.file && req.file.path) {
      try {
        const fileName = `grievances/${Date.now()}_${req.file.originalname}`;
        const azureResult = await azureStorageService.uploadFile(req.file.path, fileName);
        image_path = azureResult.url;
        image_description = req.file.originalname;
        console.log(`[Grievance] Proof uploaded to blob: ${image_path}`);
      } catch (uploadErr) {
        console.error('Proof upload error:', uploadErr);
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(500).json({
          success: false,
          error: 'Failed to upload proof/evidence',
          message: uploadErr.message
        });
      }
      if (fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
    }

    const grievanceResult = await grievanceDBService.submitGrievance({
      citizen_id: citizenId,
      grievance_text,
      image_path,
      image_description,
      enhanced_query: JSON.stringify({ category, age, city }),
      embedding: null
    });

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
    console.error('Submit grievance from form error:', error);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({
      success: false,
      error: 'Failed to submit grievance',
      message: error.message
    });
  }
};

export const createGrievance = async (req, res) => {
  try {
    const { grievance_text, image_path, image_description, enhanced_query } = req.body;
    const userId = req.user.id;

    // Platform citizens: req.user.id is already citizen id. Else resolve from users -> citizens.
    let citizenId;
    if (req.user.role === 'citizen') {
      citizenId = userId;
    } else {
      const citizenResult = await pool.query(
        'SELECT id FROM citizens WHERE user_id = $1',
        [userId]
      );
      if (citizenResult.rows.length === 0) {
        return res.status(400).json({ error: 'User is not registered as a citizen' });
      }
      citizenId = citizenResult.rows[0].id;
    }

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
    const { status, department_id, page = 1, limit = 20, all: allParam } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    const citizenLoadAll = userRole === 'citizen' && (allParam === 'true' || allParam === true);

    // IMPORTANT: Enforce maximum limit to prevent connection exhaustion
    const requestedLimit = parseInt(limit, 10) || 20;
    const maxLimit = 50; // Maximum 50 items per request
    const limitVal = Math.min(requestedLimit, maxLimit);

    let query = `
      SELECT g.id, g.grievance_id, g.citizen_id, g.grievance_text, g.status, g.priority, g.created_at, g.updated_at,
             g.department_id, g.assigned_officer_id, g.image_path, g.image_description,
             g.sla_deadline, g.resolution_time, g.enhanced_query,
             g.full_result, g.validation_status,
             g.category, g.extracted_latitude as latitude, g.extracted_longitude as longitude, g.extracted_address as location_address,
             c.full_name as citizen_name, c.email as citizen_email,
             o.full_name as officer_name, d.name as department_name
      FROM usergrievance g
      LEFT JOIN citizens c ON g.citizen_id = c.id
      LEFT JOIN users o ON g.assigned_officer_id = o.id
      LEFT JOIN departments d ON g.department_id = d.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (userRole === 'citizen' && !citizenLoadAll) {
      query += ` AND g.citizen_id = $${paramCount}`;
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
      query += ` AND g.status::text = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (department_id && (userRole === 'admin' || userRole === 'department_head')) {
      query += ` AND g.department_id = $${paramCount}`;
      params.push(department_id);
      paramCount++;
    }

    const offsetVal = (Math.max(1, parseInt(page, 10)) - 1) * limitVal;
    query += ` ORDER BY g.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitVal, offsetVal);

    const result = await pool.query(query, params);

    res.json({
      grievances: result.rows,
      pagination: {
        page: Math.max(1, parseInt(page, 10)),
        limit: limitVal
      }
    });
  } catch (error) {
    console.error('Get grievances error:', error?.message || error);
    res.status(500).json({ error: 'Failed to fetch grievances' });
  }
};

export const getGrievanceById = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const { viewAll } = req.query; // Check if viewing from "all grievances" page
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('[getGrievanceById]', { grievanceId, viewAll, userId, userRole });

    let query = `
      SELECT g.*, 
             g.extracted_latitude as latitude, 
             g.extracted_longitude as longitude, 
             g.extracted_address as location_address,
             c.full_name as citizen_name, c.email as citizen_email, c.phone as citizen_phone,
             o.full_name as officer_name, 
             d.name as department_name, d.description as department_description,
             d.address as department_address, d.contact_email as department_email,
             d.contact_phone as department_phone
      FROM usergrievance g
      LEFT JOIN citizens c ON g.citizen_id = c.id
      LEFT JOIN users o ON g.assigned_officer_id = o.id
      LEFT JOIN departments d ON g.department_id = d.id
      WHERE g.id = $1
    `;

    const params = [grievanceId];

    // Department officers can only view their assigned grievances
    if (userRole === 'department_officer') {
      query += ' AND (g.assigned_officer_id = $2 OR g.department_id = $3)';
      params.push(userId, req.user.department_id);
    } else if (userRole === 'department_head') {
      query += ' AND g.department_id = $2';
      params.push(req.user.department_id);
    }
    // Citizens and admins can view any grievance (no filter)

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    const commentsResult = await pool.query(
      `SELECT c.id, c.comment, c.is_internal, c.created_at, 
              COALESCE(u.full_name, cit.full_name) as user_name, 
              COALESCE(u.role, 'citizen') as role
       FROM grievancecomments c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN citizens cit ON c.user_id = cit.id
       WHERE c.grievance_id = $1
       ORDER BY c.created_at ASC`,
      [grievanceId]
    );

    // Timeline: workflow steps from grievanceworkflow (if any) + workflow jsonb
    let timelineResult = { rows: [] };
    try {
      timelineResult = await pool.query(
        `SELECT id, step_number, status::text, officer_name, action_taken, notes, progress_percentage, is_completed, completed_at, created_at
         FROM grievanceworkflow
         WHERE grievance_id = $1
         ORDER BY step_number ASC, created_at ASC`,
        [grievanceId]
      );
    } catch (_) {}

    const grievance = result.rows[0];
    const workflow = (grievance.workflow && typeof grievance.workflow === 'object') ? grievance.workflow : {};
    const timeline = (workflow.history && Array.isArray(workflow.history)) ? workflow.history : [];
    // Prepend submission and add workflow steps
    const fullTimeline = [
      { stage: 'submitted', at: grievance.created_at, label: 'Submitted', description: 'Grievance submitted' },
      ...(workflow.assigned_at ? [{ stage: 'assigned', at: workflow.assigned_at, label: 'Assigned', description: 'Assigned to department/officer' }] : []),
      ...timeline,
      ...(timelineResult.rows.map(r => ({
        stage: r.status,
        at: r.completed_at || r.created_at,
        label: r.action_taken || r.status,
        description: r.notes || null,
        officer_name: r.officer_name,
        progress: r.progress_percentage
      }))),
      ...(workflow.resolved_at ? [{ stage: 'resolved', at: workflow.resolved_at, label: 'Resolved', description: 'Grievance resolved' }] : [])
    ].filter(Boolean);

    res.json({
      grievance: result.rows[0],
      comments: commentsResult.rows,
      timeline: fullTimeline.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0)),
      currentUser: {
        id: userId,
        role: userRole
      }
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
      UPDATE usergrievance
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
    const userName = req.user.full_name || req.user.name || 'User';

    // Verify grievance exists first
    const grievanceCheck = await pool.query(
      'SELECT id, comments FROM usergrievance WHERE id = $1',
      [grievanceId]
    );

    if (grievanceCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Grievance not found',
        message: 'The grievance you are trying to comment on does not exist.'
      });
    }

    // Check if user exists in users table
    let userCheck = await pool.query(
      'SELECT id, full_name, role FROM users WHERE id = $1',
      [userId]
    );

    // If user doesn't exist, try to create from citizens table
    if (userCheck.rows.length === 0) {
      console.log(`[addComment] User ${userId} not found in users table, checking citizens...`);
      
      const citizenCheck = await pool.query(
        'SELECT id, user_id, full_name, email, phone FROM citizens WHERE user_id = $1',
        [userId]
      );

      if (citizenCheck.rows.length > 0) {
        const citizen = citizenCheck.rows[0];
        console.log(`[addComment] Creating user from citizen: ${citizen.full_name}`);
        
        await pool.query(
          `INSERT INTO users (id, email, password_hash, full_name, phone, role, status, created_at)
           VALUES ($1, $2, $3, $4, $5, 'citizen', 'active', NOW())
           ON CONFLICT (id) DO NOTHING`,
          [citizen.user_id, citizen.email, '$2b$10$created.from.citizen.for.comment', citizen.full_name, citizen.phone]
        );

        // Also ensure citizen record is linked
        await pool.query(
          `UPDATE citizens SET user_id = $1 WHERE id = $2`,
          [citizen.user_id, citizen.id]
        );

        // Re-check user
        userCheck = await pool.query(
          'SELECT id, full_name, role FROM users WHERE id = $1',
          [userId]
        );
      } else {
        // Create placeholder user if not found anywhere
        console.log(`[addComment] Creating placeholder user for ${userId}`);
        
        // Create user
        await pool.query(
          `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at)
           VALUES ($1, $2, $3, $4, 'citizen', 'active', NOW())
           ON CONFLICT (id) DO NOTHING`,
          [userId, `user_${userId.substring(0, 8)}@system.local`, '$2b$10$placeholder.hash.for.system.user', userName]
        );

        // Create corresponding citizen record
        await pool.query(
          `INSERT INTO citizens (user_id, full_name, email, phone, is_registered, is_active, created_at)
           VALUES ($1, $2, $3, $4, true, true, NOW())
           ON CONFLICT (user_id) DO NOTHING`,
          [userId, userName, `user_${userId.substring(0, 8)}@system.local`, `+91-${userId.substring(0, 10)}`]
        );

        // Re-check user
        userCheck = await pool.query(
          'SELECT id, full_name, role FROM users WHERE id = $1',
          [userId]
        );
      }
    }

    // Try to insert into grievancecomments table
    try {
      const result = await pool.query(
        `INSERT INTO grievancecomments (grievance_id, user_id, comment, is_internal)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [grievanceId, userId, comment, is_internal]
      );

      // Fetch user details to return with comment
      const commentWithUser = await pool.query(
        `SELECT c.id, c.comment, c.is_internal, c.created_at, 
                u.full_name as user_name, u.role
         FROM grievancecomments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.id = $1`,
        [result.rows[0].id]
      );

      res.status(201).json({
        message: 'Comment added successfully',
        comment: commentWithUser.rows[0]
      });
    } catch (insertError) {
      // Fallback: Add to JSONB comments field in usergrievance
      console.log('[addComment] Falling back to JSONB comments field:', insertError.message);
      
      const existingComments = grievanceCheck.rows[0].comments || [];
      const newComment = {
        id: Date.now().toString(),
        user_id: userId,
        user_name: userCheck.rows[0]?.full_name || userName,
        role: userCheck.rows[0]?.role || 'citizen',
        comment: comment,
        is_internal: is_internal,
        created_at: new Date().toISOString()
      };
      
      const updatedComments = [...existingComments, newComment];
      
      await pool.query(
        'UPDATE usergrievance SET comments = $1 WHERE id = $2',
        [JSON.stringify(updatedComments), grievanceId]
      );

      res.status(201).json({
        message: 'Comment added successfully',
        comment: newComment
      });
    }
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
      whereClause = 'WHERE citizen_id = $1';
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
        COUNT(*) FILTER (WHERE status::text IN ('submitted', 'pending')) as pending,
        COUNT(*) FILTER (WHERE status::text = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status::text = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status::text = 'rejected') as rejected
      FROM usergrievance
      ${whereClause}
    `;

    const result = await pool.query(statsQuery, params);

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};
