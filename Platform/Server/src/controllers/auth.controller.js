import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

export const register = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, password, full_name, phone, address } = req.body;

    await client.query('BEGIN');

    const existingUser = await client.query(
      'SELECT id FROM "Users" WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await client.query(
      `INSERT INTO "Users" (email, password_hash, full_name, phone, address, role, status)
       VALUES ($1, $2, $3, $4, $5, 'citizen', 'active')
       RETURNING id, email, full_name, role, created_at`,
      [email, passwordHash, full_name, phone, address]
    );

    await client.query('COMMIT');

    const user = result.rows[0];
    const { accessToken, refreshToken } = generateTokens(user.id);

    await client.query(
      `INSERT INTO "RefreshTokens" (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken]
    );

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release();
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, role, status, department_id 
       FROM "Users" WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    await pool.query(
      `INSERT INTO "RefreshTokens" (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken]
    );

    await pool.query(
      'UPDATE "Users" SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        department_id: user.department_id
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
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
