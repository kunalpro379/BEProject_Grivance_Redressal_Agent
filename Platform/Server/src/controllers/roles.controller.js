import pool from '../config/database.js';

// Get all government roles
export const getGovernmentRoles = async (req, res) => {
  try {
    const { level } = req.query;
    
    let query = `
      SELECT 
        id,
        role_code,
        role_name,
        role_level,
        role_type,
        description,
        hierarchy_rank
      FROM government_roles
      WHERE is_active = true
    `;
    
    const params = [];
    
    // Filter by level if provided
    if (level) {
      query += ` AND role_level = $1`;
      params.push(level);
    }
    
    query += ` ORDER BY hierarchy_rank, role_name`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      roles: result.rows
    });
  } catch (error) {
    console.error('Get government roles error:', error);
    res.status(500).json({ error: 'Failed to fetch government roles' });
  }
};

// Get roles grouped by level
export const getGovernmentRolesByLevel = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        role_level,
        json_agg(
          json_build_object(
            'id', id,
            'role_code', role_code,
            'role_name', role_name,
            'role_type', role_type,
            'description', description,
            'hierarchy_rank', hierarchy_rank
          ) ORDER BY hierarchy_rank, role_name
        ) as roles
      FROM government_roles
      WHERE is_active = true
      GROUP BY role_level
      ORDER BY MIN(hierarchy_rank)
    `);
    
    res.json({
      success: true,
      rolesByLevel: result.rows
    });
  } catch (error) {
    console.error('Get government roles by level error:', error);
    res.status(500).json({ error: 'Failed to fetch government roles' });
  }
};

// Map role_code to system role
export const mapRoleCodeToSystemRole = (roleCode, roleLevel) => {
  const code = String(roleCode || '').toUpperCase();
  const level = String(roleLevel || '').toLowerCase();
  
  // District Collector
  if (code.includes('DIST_COLL') || code.includes('COLLECTOR')) {
    return 'district_collector';
  }
  
  // City/Municipal Commissioner
  if (code.includes('COMM') && (level === 'city' || code.includes('MUN') || code.includes('CITY') || code.includes('CORP'))) {
    return 'city_commissioner';
  }
  
  // Ward Officers
  if (level === 'ward' || code.includes('WARD') || code.includes('NAGAR') || code.includes('ZONAL')) {
    return 'ward_officer';
  }
  
  // Department Heads
  if (code.includes('DEPT_HEAD') || (code.includes('HEAD') && level === 'state')) {
    return 'department_head';
  }
  
  // Default to department_officer for all other roles
  return 'department_officer';
};
