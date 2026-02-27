import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    let result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.status, u.department_id, u.department_name,
              dept_off.department_id as officer_department_id
       FROM users u
       LEFT JOIN departmentofficers dept_off ON dept_off.user_id = u.id
       WHERE u.id = $1
       LIMIT 1`,
      [userId]
    );

    let user;
    if (result.rows.length > 0) {
      user = result.rows[0];
      // Use department_id from departmentofficers if available, otherwise from users
      user.department_id = user.officer_department_id || user.department_id;
      delete user.officer_department_id;
    } else {
      // Citizen login: token carries citizen id from citizens table
      const citizenResult = await pool.query(
        `SELECT id, email, full_name, phone, address, profile_image, created_at, last_login, is_active
         FROM citizens WHERE id = $1`,
        [userId]
      );
      if (citizenResult.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }
      const c = citizenResult.rows[0];
      user = {
        id: c.id,
        email: c.email,
        full_name: c.full_name,
        phone: c.phone,
        address: c.address,
        profile_image: c.profile_image,
        created_at: c.created_at,
        last_login: c.last_login,
        role: 'citizen',
        status: c.is_active ? 'active' : 'inactive',
        department_id: null,
        department_name: null
      };
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

// Middleware to verify department access for department officers/heads
export const verifyDepartmentAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { departmentId } = req.params;
    const userRole = req.user.role;

    // Admin can access all departments
    if (userRole === 'admin') {
      return next();
    }

    // For department officers and heads, verify they belong to the requested department
    if (userRole === 'department_officer' || userRole === 'department_head') {
      // Check if user's department matches the requested department
      if (req.user.department_id && departmentId && String(req.user.department_id) !== String(departmentId)) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You do not have permission to access this department'
        });
      }

      return next();
    }

    // Citizens cannot access department dashboards
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'You do not have permission to access department resources'
    });
  } catch (error) {
    console.error('Department access verification error:', error);
    res.status(500).json({ error: 'Access verification failed' });
  }
};

// Middleware to verify user can only access their own resources
export const verifyResourceOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Admin can access all resources
    if (req.user.role === 'admin') {
      return next();
    }

    // Get the resource user ID from params, body, or query
    const resourceUserId = req.params[resourceUserIdField] || 
                          req.body[resourceUserIdField] || 
                          req.query[resourceUserIdField];

    if (!resourceUserId) {
      return res.status(400).json({ error: 'Resource user ID not provided' });
    }

    // Verify the user owns the resource
    if (String(req.user.id) !== String(resourceUserId)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only access your own resources'
      });
    }

    next();
  };
};
