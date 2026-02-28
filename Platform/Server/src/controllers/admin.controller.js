import pool from '../config/database.js';

// Generate unique department officer ID: DEP-XXXX-YYYY (pure random)
const generateDepId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  // Generate first 4 random characters
  let part1 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Generate second 4 random characters
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `DEP-${part1}-${part2}`;
};

class AdminController {
  // Get all pending users awaiting approval
  async getPendingUsers(req, res) {
    try {
      const result = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.phone, u.role, u.created_at,
                u.approval_status, u.department_name, u.department_id,
                EXISTS (
                  SELECT 1 FROM state_central_officials WHERE user_id = u.id
                  UNION ALL
                  SELECT 1 FROM district_officials WHERE user_id = u.id
                  UNION ALL
                  SELECT 1 FROM taluka_officials WHERE user_id = u.id
                  UNION ALL
                  SELECT 1 FROM city_officials WHERE user_id = u.id
                  UNION ALL
                  SELECT 1 FROM ward_officers WHERE user_id = u.id
                ) as is_government_official,
                -- Get government official hierarchy details
                COALESCE(
                  (SELECT json_build_object(
                    'hierarchy_level', 'state_central',
                    'level_type', level_type,
                    'ministry_name', ministry_name,
                    'jurisdiction', jurisdiction
                  ) FROM state_central_officials WHERE user_id = u.id),
                  (SELECT json_build_object(
                    'hierarchy_level', 'district',
                    'district', district,
                    'designation', designation
                  ) FROM district_officials WHERE user_id = u.id),
                  (SELECT json_build_object(
                    'hierarchy_level', 'taluka',
                    'district', district,
                    'taluka', taluka,
                    'designation', designation,
                    'block_name', block_name
                  ) FROM taluka_officials WHERE user_id = u.id),
                  (SELECT json_build_object(
                    'hierarchy_level', 'city',
                    'city', city,
                    'district', district,
                    'designation', designation,
                    'corporation_name', corporation_name
                  ) FROM city_officials WHERE user_id = u.id),
                  (SELECT json_build_object(
                    'hierarchy_level', 'ward',
                    'ward_number', ward_number,
                    'city', city,
                    'district', district,
                    'zone', zone
                  ) FROM ward_officers WHERE user_id = u.id)
                ) as hierarchy_info
         FROM users u
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

  // Get all departments (for admin dropdown when approving officers)
  async getDepartments(req, res) {
    try {
      const result = await pool.query(
        `SELECT id, name, description, contact_email, is_active
         FROM departments
         WHERE is_active = true
         ORDER BY name ASC`,
        []
      );

      res.json({
        success: true,
        departments: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('Get departments error:', error);
      res.status(500).json({ error: 'Failed to fetch departments' });
    }
  }

  // Approve a user. For department_officer/department_head, body must include department_id to allocate department.
  async approveUser(req, res) {
    const client = await pool.connect();
    
    try {
      const { userId } = req.params;
      const { department_id: bodyDepartmentId } = req.body || {};
      const adminId = req.user.id;

      await client.query('BEGIN');

      const userCheck = await client.query(
        'SELECT id, email, full_name, role, approval_status FROM users WHERE id = $1',
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

      let departmentId = bodyDepartmentId;
      const isOfficerOrHead = ['department_officer', 'department_head', 'ward_officer', 'city_commissioner', 'district_collector'].includes(user.role);
      let dept = null;
      
      // Check if this is a government official (has entries in hierarchy tables)
      let isGovernmentOfficial = false;
      if (isOfficerOrHead) {
        const govOfficialCheck = await client.query(
          `SELECT EXISTS (
            SELECT 1 FROM state_central_officials WHERE user_id = $1
            UNION ALL
            SELECT 1 FROM district_officials WHERE user_id = $1
            UNION ALL
            SELECT 1 FROM taluka_officials WHERE user_id = $1
            UNION ALL
            SELECT 1 FROM city_officials WHERE user_id = $1
            UNION ALL
            SELECT 1 FROM ward_officers WHERE user_id = $1
          ) as is_gov_official`,
          [userId]
        );
        isGovernmentOfficial = govOfficialCheck.rows.length > 0 && govOfficialCheck.rows[0].is_gov_official;
      }

      // Only require department_id for department officers/heads who are NOT government officials
      if (isOfficerOrHead && !isGovernmentOfficial) {
        if (!departmentId) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            error: 'department_id is required to approve a department officer or department head. Select the department to allocate.' 
          });
        }
        const deptRow = await client.query(
          'SELECT id, name FROM departments WHERE id = $1 AND is_active = true',
          [departmentId]
        );
        if (deptRow.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Invalid or inactive department' });
        }
        dept = deptRow.rows[0];
      }

      // Update user: approve and, for officers/heads, set department_id and department_name
      let result;
      if (isOfficerOrHead && !isGovernmentOfficial && dept) {
        // Department officers/heads - assign to department
        result = await client.query(
          `UPDATE users
           SET approval_status = 'approved',
               approved_by = $1,
               approved_at = NOW(),
               updated_at = NOW(),
               department_id = $2,
               department_name = $3
           WHERE id = $4
           RETURNING id, email, full_name, role, approval_status, approved_at, department_id, department_name`,
          [adminId, dept.id, dept.name, userId]
        );
        
        // Insert or update departmentofficers record (UPSERT)
        const staffId = `STAFF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        
        await client.query(
          `INSERT INTO departmentofficers (
            user_id, department_id, staff_id, role
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id) DO UPDATE
          SET department_id = EXCLUDED.department_id,
              staff_id = EXCLUDED.staff_id,
              role = EXCLUDED.role,
              updated_at = NOW()`,
          [userId, dept.id, staffId, user.role]
        );
        console.log('Created/Updated departmentofficers for user:', userId);
      } else {
        // Government officials or citizens - just approve without department
        result = await client.query(
          `UPDATE users
           SET approval_status = 'approved',
               approved_by = $1,
               approved_at = NOW(),
               updated_at = NOW()
           WHERE id = $2
           RETURNING id, email, full_name, role, approval_status, approved_at`,
          [adminId, userId]
        );
        if (isGovernmentOfficial) {
          console.log('Approved government official (no department assignment):', userId);
        }
      }

      await client.query(
        `INSERT INTO auditlog (actor_id, action, entity_type, entity_id, details)
         VALUES ($1, 'APPROVE_USER', 'User', $2, $3)`,
        [adminId, userId, JSON.stringify({ 
          user_email: user.email,
          user_role: user.role,
          ...(isOfficerOrHead && departmentId && { department_id: departmentId })
        })]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'User approved successfully',
        user: result.rows[0]
      });

      console.log(`User ${user.email} approved by admin ${adminId}` + (isOfficerOrHead && departmentId ? `; allocated to department ${departmentId}` : ''));

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
        'SELECT id, email, full_name, role, approval_status FROM users WHERE id = $1',
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
        `UPDATE users
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
        `INSERT INTO auditlog (actor_id, action, entity_type, entity_id, details)
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
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
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
      // Aggregate official/admin users from users table
      const userAggPromise = pool.query(`
        SELECT 
          COUNT(*) as total_users_raw,
          COUNT(*) FILTER (WHERE approval_status = 'pending') as pending_users,
          COUNT(*) FILTER (WHERE approval_status = 'approved') as approved_users,
          COUNT(*) FILTER (WHERE approval_status = 'rejected') as rejected_users,
          COUNT(*) FILTER (WHERE role = 'department_officer') as officers,
          COUNT(*) FILTER (WHERE role = 'department_head') as department_heads,
          COUNT(*) FILTER (WHERE role = 'admin') as admins
        FROM users
      `);

      // Citizens now live in citizens table, not users
      const citizenAggPromise = pool.query(`
        SELECT COUNT(*) as citizens
        FROM citizens
      `);

      const [userAgg, citizenAgg] = await Promise.all([
        userAggPromise,
        citizenAggPromise
      ]);

      const userRow = userAgg.rows[0] || {};
      const citizenRow = citizenAgg.rows[0] || {};

      const citizensCount = Number(citizenRow.citizens || 0);
      const totalUsersRaw = Number(userRow.total_users_raw || 0);

      const stats = {
        total_users: totalUsersRaw + citizensCount,
        pending_users: Number(userRow.pending_users || 0),
        approved_users: Number(userRow.approved_users || 0),
        rejected_users: Number(userRow.rejected_users || 0),
        citizens: citizensCount,
        officers: Number(userRow.officers || 0),
        department_heads: Number(userRow.department_heads || 0),
        admins: Number(userRow.admins || 0)
      };

      res.json({
        success: true,
        stats
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
        `UPDATE users
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

  // Update existing department officers with generated dep_id
  async updateDepartmentOfficersDepId(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get all department officers without dep_id
      const officersQuery = await client.query(
        `SELECT do.user_id, do.department_id, d.name as department_name
         FROM departmentofficers do
         JOIN departments d ON do.department_id = d.id
         WHERE do.dep_id IS NULL OR do.dep_id = ''`
      );

      const officers = officersQuery.rows;
      const updated = [];

      for (const officer of officers) {
        const generatedDepId = generateDepId();
        
        await client.query(
          `UPDATE departmentofficers
           SET dep_id = $1, updated_at = NOW()
           WHERE user_id = $2`,
          [generatedDepId, officer.user_id]
        );

        updated.push({
          user_id: officer.user_id,
          department_name: officer.department_name,
          dep_id: generatedDepId
        });
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Updated ${updated.length} department officers with dep_id`,
        updated
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update dep_id error:', error);
      res.status(500).json({ error: 'Failed to update department officers' });
    } finally {
      client.release();
    }
  }
}

export default new AdminController();
