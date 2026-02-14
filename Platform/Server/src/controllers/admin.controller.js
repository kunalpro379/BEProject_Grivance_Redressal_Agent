import bcrypt from 'bcrypt';
import pool from '../config/database.js';

export const createUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, password, full_name, phone, role, department_id, address } = req.body;

    await client.query('BEGIN');

    const existingUser = await client.query(
      'SELECT id FROM "Users" WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Email already exists' });
    }

    if ((role === 'department_officer' || role === 'department_head') && !department_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Department required for officers' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await client.query(
      `INSERT INTO "Users" (email, password_hash, full_name, phone, role, department_id, address, status, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', true)
       RETURNING id, email, full_name, role, department_id, created_at`,
      [email, passwordHash, full_name, phone, role, department_id, address]
    );

    await client.query(
      `INSERT INTO "AuditLog" (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'CREATE_USER', 'Users', $2, $3)`,
      [req.user.id, result.rows[0].id, JSON.stringify({ role, email })]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  } finally {
    client.release();
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { role, status, department_id, page = 1, limit = 20 } = req.query;
    
    let query = `
      SELECT u.id, u.email, u.full_name, u.phone, u.role, u.status, 
             u.department_id, u.created_at, u.last_login,
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

    if (department_id) {
      query += ` AND u.department_id = $${paramCount}`;
      params.push(department_id);
      paramCount++;
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await pool.query(query, params);

    const countQuery = `SELECT COUNT(*) FROM "Users" WHERE 1=1 ${role ? 'AND role = $1' : ''}`;
    const countResult = await pool.query(countQuery, role ? [role] : []);

    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const updateUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId } = req.params;
    const { full_name, phone, status, department_id, address } = req.body;

    await client.query('BEGIN');

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (full_name) {
      updates.push(`full_name = $${paramCount}`);
      params.push(full_name);
      paramCount++;
    }

    if (phone) {
      updates.push(`phone = $${paramCount}`);
      params.push(phone);
      paramCount++;
    }

    if (status) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (department_id !== undefined) {
      updates.push(`department_id = $${paramCount}`);
      params.push(department_id);
      paramCount++;
    }

    if (address) {
      updates.push(`address = $${paramCount}`);
      params.push(address);
      paramCount++;
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(userId);

    const query = `
      UPDATE "Users"
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, full_name, role, status, department_id
    `;

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    await client.query(
      `INSERT INTO "AuditLog" (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'UPDATE_USER', 'Users', $2, $3)`,
      [req.user.id, userId, JSON.stringify(req.body)]
    );

    await client.query('COMMIT');

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  } finally {
    client.release();
  }
};

export const deleteUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId } = req.params;

    await client.query('BEGIN');

    const result = await client.query(
      'DELETE FROM "Users" WHERE id = $1 RETURNING email',
      [userId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    await client.query(
      `INSERT INTO "AuditLog" (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'DELETE_USER', 'Users', $2, $3)`,
      [req.user.id, userId, JSON.stringify({ email: result.rows[0].email })]
    );

    await client.query('COMMIT');

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  } finally {
    client.release();
  }
};

export const getDepartments = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM "Departments" WHERE is_active = true ORDER BY name'
    );

    res.json({ departments: result.rows });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const { name, description, contact_email, contact_phone } = req.body;

    const result = await pool.query(
      `INSERT INTO "Departments" (name, description, contact_email, contact_phone)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, contact_email, contact_phone]
    );

    res.status(201).json({
      message: 'Department created successfully',
      department: result.rows[0]
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
};
