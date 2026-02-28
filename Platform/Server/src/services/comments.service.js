/**
 * Comments Service
 * Handles all comment-related database operations
 */

import pool from '../config/database.js';

class CommentsService {
  /**
   * Add a comment to a grievance
   */
  async addComment({ grievanceId, userId, comment, isInternal = false, attachments = null }) {
    const query = `
      INSERT INTO grievancecomments (
        grievance_id,
        user_id,
        comment,
        is_internal,
        attachments
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id,
        grievance_id,
        user_id,
        comment,
        is_internal,
        attachments,
        created_at
    `;

    const values = [grievanceId, userId, comment, isInternal, attachments ? JSON.stringify(attachments) : null];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all comments for a grievance
   */
  async getCommentsByGrievanceId(grievanceId, includeInternal = false) {
    let query = `
      SELECT 
        c.id,
        c.grievance_id,
        c.user_id,
        c.comment,
        c.is_internal,
        c.attachments,
        c.created_at,
        u.full_name as user_name,
        u.email as user_email,
        u.role as user_role,
        cit.full_name as citizen_name
      FROM grievancecomments c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN citizens cit ON u.id = cit.user_id
      WHERE c.grievance_id = $1
    `;

    // Filter internal comments for citizens
    if (!includeInternal) {
      query += ' AND c.is_internal = false';
    }

    query += ' ORDER BY c.created_at ASC';

    const result = await pool.query(query, [grievanceId]);
    
    // Format the response
    return result.rows.map(row => ({
      id: row.id,
      grievance_id: row.grievance_id,
      user_id: row.user_id,
      comment: row.comment,
      is_internal: row.is_internal,
      attachments: row.attachments,
      created_at: row.created_at,
      user: {
        name: row.citizen_name || row.user_name || 'Unknown User',
        email: row.user_email,
        role: row.user_role
      }
    }));
  }

  /**
   * Get a single comment by ID
   */
  async getCommentById(commentId) {
    const query = `
      SELECT 
        c.id,
        c.grievance_id,
        c.user_id,
        c.comment,
        c.is_internal,
        c.attachments,
        c.created_at,
        u.full_name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM grievancecomments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [commentId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      grievance_id: row.grievance_id,
      user_id: row.user_id,
      comment: row.comment,
      is_internal: row.is_internal,
      attachments: row.attachments,
      created_at: row.created_at,
      user: {
        name: row.user_name || 'Unknown User',
        email: row.user_email,
        role: row.user_role
      }
    };
  }

  /**
   * Update a comment
   */
  async updateComment(commentId, userId, { comment, attachments }) {
    const query = `
      UPDATE grievancecomments
      SET 
        comment = COALESCE($1, comment),
        attachments = COALESCE($2, attachments)
      WHERE id = $3 AND user_id = $4
      RETURNING 
        id,
        grievance_id,
        user_id,
        comment,
        is_internal,
        attachments,
        created_at
    `;

    const values = [
      comment || null,
      attachments ? JSON.stringify(attachments) : null,
      commentId,
      userId
    ];

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId, userId) {
    const query = `
      DELETE FROM grievancecomments
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await pool.query(query, [commentId, userId]);
    return result.rows.length > 0;
  }

  /**
   * Get comment count for a grievance
   */
  async getCommentCount(grievanceId, includeInternal = false) {
    let query = `
      SELECT COUNT(*) as count
      FROM grievancecomments
      WHERE grievance_id = $1
    `;

    if (!includeInternal) {
      query += ' AND is_internal = false';
    }

    const result = await pool.query(query, [grievanceId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Check if user can view internal comments
   */
  canViewInternalComments(userRole) {
    const allowedRoles = ['admin', 'department_officer', 'city_official', 'district_official', 'state_official'];
    return allowedRoles.includes(userRole);
  }

  /**
   * Check if user owns the comment
   */
  async isCommentOwner(commentId, userId) {
    const query = 'SELECT user_id FROM grievancecomments WHERE id = $1';
    const result = await pool.query(query, [commentId]);
    
    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].user_id === userId;
  }
}

export default new CommentsService();
