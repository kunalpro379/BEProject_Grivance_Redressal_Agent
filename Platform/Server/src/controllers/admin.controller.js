import pool from '../config/database.js';

class AdminController {
  // Get all pending users awaiting approval
  async getPendingUsers(req, res) {
    try {
      const result = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.phone, u.role, u.created_at,
                u.approval_status, d.name as department_name
         FROM "Users" u
         LEFT JOIN "Departments" d ON u.department_id = d.id
         WHERE u.approval_status = 'pending'
         ORDER BY u.created_at ASC`,
        []
      );

      res.json({
        success: true,
        users: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('Get pending users error:', error);
      res.status(500).json({ error: 'Failed to fetch pending users' });
    }
  }

  // Approve a user
  async approveUser(req, res) {
    const client = await pool.connect();
    
    try {
      const { userId } = req.params;
      const adminId = req.user.id;

      await client.query('BEGIN');

      // Check if user exists and is pending
      const userCheck = await client.query(
        'SELECT id, email, full_name, role, approval_status FROM "Users" WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userCheck.rows[0];

      if (user.approval_status !== 'pending') {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `User is already ${user.approval_status}` 
        });
      }

      // Approve the user
      const result = await client.query(
        `UPDATE "Users"
         SET approval_status = 'approved',
             approved_by = $1,
             approved_at = NOW(),
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, email, full_name, role, approval_status, approved_at`,
        [adminId, userId]
      );

      // Log the action in audit log
      await client.query(
        `INSERT INTO "AuditLog" (user_id, action, entity_type, entity_id, details)
         VALUES ($1, 'APPROVE_USER', 'User', $2, $3)`,
        [adminId, userId, JSON.stringify({ 
          user_email: user.email,
          user_role: user.role 
        })]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'User approved successfully',
        user: result.rows[0]
      });

      // TODO: Send email notification to user
      console.log(`User ${user.email} approved by admin ${adminId}`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Approve user error:', error);
      res.status(500).json({ error: 'Failed to approve user' });
    } finally {
      client.release();
    }
  }

  // Reject a user
  async rejectUser(req, res) {
    const client = await pool.connect();
    
    try {
      const { userId } = req.params;
      const { rejection_reason } = req.body;
      const adminId = req.user.id;

      if (!rejection_reason || rejection_reason.trim() === '') {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      await client.query('BEGIN');

      // Check if user exists and is pending
      const userCheck = await client.query(
        'SELECT id, email, full_name, role, approval_status FROM "Users" WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userCheck.rows[0];

      if (user.approval_status !== 'pending') {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `User is already ${user.approval_status}` 
        });
      }

      // Reject the user
      const result = await client.query(
        `UPDATE "Users"
         SET approval_status = 'rejected',
             approved_by = $1,
             approved_at = NOW(),
             rejection_reason = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING id, email, full_name, role, approval_status, rejection_reason`,
        [adminId, rejection_reason, userId]
      );

      // Log the action in audit log
      await client.query(
        `INSERT INTO "AuditLog" (user_id, action, entity_type, entity_id, details)
         VALUES ($1, 'REJECT_USER', 'User', $2, $3)`,
        [adminId, userId, JSON.stringify({ 
          user_email: user.email,
          user_role: user.role,
          rejection_reason 
        })]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'User rejected',
        user: result.rows[0]
      });

      // TODO: Send email notification to user
      console.log(`User ${user.email} rejected by admin ${adminId}`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Reject user error:', error);
      res.status(500).json({ error: 'Failed to reject user' });
    } finally {
      client.release();
    }
  }

  // Get all users with filters
  async getAllUsers(req, res) {
    try {
      const { role, status, approval_status, page = 1, limit = 20 } = req.query;

      let query = `
        SELECT u.id, u.email, u.full_name, u.phone, u.role, u.status,
               u.approval_status, u.created_at, u.last_login,
               d.name as department_name
        FROM "Users" u
        LEFT JOIN "Departments" d ON u.department_id = d.id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (role) {
        query += ` AND u.role = $${paramCount}`;
        params.push(role);
        paramCount++;
      }

      if (status) {
        query += ` AND u.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      if (approval_status) {
        query += ` AND u.approval_status = $${paramCount}`;
        params.push(approval_status);
        paramCount++;
      }

      query += ` ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, (page - 1) * limit);

      const result = await pool.query(query, params);

      res.json({
        success: true,
        users: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  // Get user statistics
  async getUserStats(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE approval_status = 'pending') as pending_users,
          COUNT(*) FILTER (WHERE approval_status = 'approved') as approved_users,
          COUNT(*) FILTER (WHERE approval_status = 'rejected') as rejected_users,
          COUNT(*) FILTER (WHERE role = 'citizen') as citizens,
          COUNT(*) FILTER (WHERE role = 'department_officer') as officers,
          COUNT(*) FILTER (WHERE role = 'department_head') as department_heads,
          COUNT(*) FILTER (WHERE role = 'admin') as admins
        FROM "Users"
      `);

      res.json({
        success: true,
        stats: result.rows[0]
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
  }

  // Update user status (activate/deactivate)
  async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      if (!['active', 'inactive', 'suspended'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const result = await pool.query(
        `UPDATE "Users"
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, email, full_name, status`,
        [status, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        message: 'User status updated',
        user: result.rows[0]
      });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  }
}

export default new AdminController();
