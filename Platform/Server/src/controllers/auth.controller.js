import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh', timestamp: Date.now() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

export const register = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      email, password, full_name, phone, address, role, department_id,
      department_name, designation, city, official_type, ward, district,
      admin_id, admin_passkey
    } = req.body;

    await client.query('BEGIN');

    // Determine if this is a citizen or official registration
    const userRole = role || 'citizen';
    const isCitizen = userRole === 'citizen';

    if (isCitizen) {
      // CITIZEN REGISTRATION - Store in Citizens table
      
      // Check if email already exists in Citizens
      const existingCitizen = await client.query(
        'SELECT id FROM "Citizens" WHERE email = $1',
        [email]
      );

      if (existingCitizen.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const result = await client.query(
        `INSERT INTO "Citizens" (
          id, email, password_hash, full_name, phone, address,
          email_verified, is_registered, is_active, created_at, updated_at
        )
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, true, true, NOW(), NOW())
         RETURNING id, email, full_name, phone, created_at`,
        [email, passwordHash, full_name, phone, address]
      );

      const citizen = result.rows[0];

      // Generate tokens for citizen
      const { accessToken, refreshToken } = generateTokens(citizen.id);

      await client.query(
        `INSERT INTO "RefreshTokens" (user_id, token, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
        [citizen.id, refreshToken]
      );

      await client.query('COMMIT');

      return res.status(201).json({
        message: 'Registration successful',
        user: {
          id: citizen.id,
          email: citizen.email,
          full_name: citizen.full_name,
          role: 'citizen',
          approval_status: 'approved'
        },
        accessToken,
        refreshToken
      });

    } else {
      // OFFICIAL REGISTRATION - Store in Users table
      
      // Check if email already exists in Users
      const existingUser = await client.query(
        'SELECT id FROM "Users" WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Validate role
      const validRoles = ['department_officer', 'department_head', 'admin'];
      
      if (!validRoles.includes(userRole)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid role for official registration' });
      }

      // Validate department for officers
      if ((userRole === 'department_officer' || userRole === 'department_head') && !department_id && !department_name) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Department is required for officers' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      // Hash admin passkey if provided
      let adminPasskeyHash = null;
      if (admin_passkey) {
        adminPasskeyHash = await bcrypt.hash(admin_passkey, 10);
      }

      // Officers need approval
      const approvalStatus = 'pending';

      const result = await client.query(
        `INSERT INTO "Users" (
          email, password_hash, full_name, phone, address, role, status, 
          department_id, department_name, designation, city, official_type, ward, district,
          admin_id, admin_passkey_hash,
          approval_status, email_verified
        )
         VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true)
         RETURNING id, email, full_name, role, approval_status, created_at`,
        [
          email, passwordHash, full_name, phone, address, userRole, 
          department_id, department_name, designation, city, official_type, ward, district,
          admin_id, adminPasskeyHash,
          approvalStatus
        ]
      );

      await client.query('COMMIT');

      const user = result.rows[0];

      // Officers need approval - don't generate tokens yet
      return res.status(201).json({
        message: 'Registration successful. Your account is pending admin approval.',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          approval_status: user.approval_status
        },
        requiresApproval: true
      });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  } finally {
    client.release();
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // First, try to find user in Citizens table
    let result = await pool.query(
      `SELECT id, email, password_hash, full_name, phone, is_active
       FROM "Citizens" WHERE email = $1`,
      [email]
    );

    let user = null;
    let isCitizen = false;

    if (result.rows.length > 0) {
      // Found in Citizens table
      user = result.rows[0];
      isCitizen = true;

      // Check if citizen is active
      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is not active' });
      }
    } else {
      // Try to find in Users table (officials)
      result = await pool.query(
        `SELECT id, email, password_hash, full_name, role, status, department_id, approval_status, rejection_reason
         FROM "Users" WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      user = result.rows[0];
      isCitizen = false;

      // Check if account is active
      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Account is not active' });
      }

      // Check approval status for officials
      if (user.approval_status === 'pending') {
        return res.status(403).json({ 
          error: 'Account pending approval',
          message: 'Your account is awaiting admin approval. You will be notified once approved.',
          approval_status: 'pending'
        });
      }

      if (user.approval_status === 'rejected') {
        return res.status(403).json({ 
          error: 'Account rejected',
          message: user.rejection_reason || 'Your account registration was rejected by admin.',
          approval_status: 'rejected'
        });
      }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Revoke old refresh tokens and insert new one
    await pool.query(
      'UPDATE "RefreshTokens" SET revoked = true WHERE user_id = $1 AND revoked = false',
      [user.id]
    );

    await pool.query(
      `INSERT INTO "RefreshTokens" (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken]
    );

    // Update last login
    if (isCitizen) {
      await pool.query(
        'UPDATE "Citizens" SET last_login = NOW() WHERE id = $1',
        [user.id]
      );
    } else {
      await pool.query(
        'UPDATE "Users" SET last_login = NOW() WHERE id = $1',
        [user.id]
      );
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: isCitizen ? 'citizen' : user.role,
        department_id: isCitizen ? null : user.department_id,
        approval_status: isCitizen ? 'approved' : user.approval_status
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const result = await pool.query(
      `SELECT * FROM "RefreshTokens" 
       WHERE token = $1 AND user_id = $2 AND revoked = false AND expires_at > NOW()`,
      [refreshToken, decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const tokens = generateTokens(decoded.userId);

    await pool.query(
      'UPDATE "RefreshTokens" SET revoked = true WHERE token = $1',
      [refreshToken]
    );

    await pool.query(
      `INSERT INTO "RefreshTokens" (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [decoded.userId, tokens.refreshToken]
    );

    res.json(tokens);
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await pool.query(
        'UPDATE "RefreshTokens" SET revoked = true WHERE token = $1',
        [refreshToken]
      );
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.role, u.status, 
              u.department_id, u.profile_image, u.address, u.created_at, u.last_login,
              u.approval_status, u.approved_at,
              d.name as department_name
       FROM "Users" u
       LEFT JOIN "Departments" d ON u.department_id = d.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
