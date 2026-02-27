import pool from '../config/database.js';

// Get role-specific dashboard data
export const getRoleDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get user details with role-specific information
    const userQuery = await pool.query(
      `SELECT u.*, 
        go.designation, go.employee_code, go.state_id, go.district_id, 
        go.city_id, go.ward_id, go.department_id,
        gr.role_name, gr.role_level,
        d.name as department_name
      FROM users u
      LEFT JOIN government_officials go ON u.id = go.user_id
      LEFT JOIN government_roles gr ON go.role_id = gr.id
      LEFT JOIN departments d ON go.department_id = d.id
      WHERE u.id = $1`,
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userQuery.rows[0];
    let dashboardData = {};

    // Role-based dashboard data
    switch (userRole) {
      case 'ward_officer':
      case 'department_officer': // Also handle department_officer as ward officer
        // Check if user has ward assignment
        if (user.ward_id) {
          dashboardData = await getWardOfficerDashboard(user);
        } else {
          // Fallback to department officer dashboard if no ward assigned
          dashboardData = await getDepartmentOfficerDashboard(user);
        }
        break;
      case 'city_commissioner':
        dashboardData = await getCityCommissionerDashboard(user);
        break;
      case 'district_collector':
        dashboardData = await getDistrictCollectorDashboard(user);
        break;
      case 'department_head':
        dashboardData = await getDepartmentOfficerDashboard(user);
        break;
      case 'state_official':
        dashboardData = await getStateOfficialDashboard(user);
        break;
      default:
        return res.status(400).json({ error: 'Invalid role for dashboard access' });
    }

    res.json({
      success: true,
      role: userRole,
      roleLevel: user.role_level,
      roleName: user.role_name, // Add role_name here
      user: {
        name: user.full_name,
        designation: user.designation,
        roleName: user.role_name, // Also add here for easier access
        department: user.department_name,
        employeeCode: user.employee_code
      },
      dashboard: dashboardData
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    console.error('Error stack:', error.stack);
    console.error('User ID:', req.user?.id);
    console.error('User role:', req.user?.role);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Ward Officer Dashboard
const getWardOfficerDashboard = async (user) => {
  try {
    const wardId = user.ward_id;
    
    if (!wardId) {
      console.error('Ward ID is missing for user:', user.id);
      throw new Error('Ward ID not found for user');
    }
    
    console.log('Fetching ward officer dashboard for ward:', wardId);
  
  // KPIs
  const kpisQuery = await pool.query(
    `SELECT 
      COUNT(CASE WHEN ug.status IN ('submitted', 'in_progress', 'assigned') THEN 1 END) as active_complaints,
      COUNT(CASE WHEN ug.sla_deadline < NOW() AND ug.status != 'closed' THEN 1 END) as overdue,
      COUNT(CASE WHEN DATE(ug.sla_deadline) = CURRENT_DATE AND ug.status != 'closed' THEN 1 END) as due_today,
      COUNT(CASE WHEN ug.priority = 'high' OR ug.priority = 'critical' THEN 1 END) as high_priority
    FROM usergrievance ug
    JOIN grievance_location_mapping glm ON ug.id = glm.grievance_id
    WHERE glm.ward_id = $1 AND ug.status != 'closed'`,
    [wardId]
  );

  // Staff/Workers - get ward number first
  const wardInfo = await pool.query(
    `SELECT ward_number FROM wards WHERE id = $1`,
    [wardId]
  );
  const wardNumber = wardInfo.rows[0]?.ward_number || 'W-001';
  
  const workersQuery = await pool.query(
    `SELECT 
      do2.id, u.full_name as name, do2.role, do2.status, do2.workload,
      do2.zone, do2.ward, do2.specialization
    FROM departmentofficers do2
    JOIN users u ON do2.user_id = u.id
    WHERE do2.ward = $1 AND u.status = 'active'
    ORDER BY do2.workload DESC`,
    [wardNumber]
  );

  // Equipment
  const equipmentQuery = await pool.query(
    `SELECT 
      equipment_id, name, type, status, location, condition, utilization_rate
    FROM equipment
    WHERE department_id = $1
    ORDER BY status, name`,
    [user.department_id]
  );

  // Complaints Queue
  const complaintsQuery = await pool.query(
    `SELECT 
      ug.id, ug.grievance_id, ug.grievance_text as title, 
      ug.extracted_address as location, ug.priority, ug.status,
      ug.category->>'main_category' as category,
      EXTRACT(EPOCH FROM (ug.sla_deadline - NOW()))/3600 as sla_hours_remaining,
      u.full_name as assigned_to
    FROM usergrievance ug
    JOIN grievance_location_mapping glm ON ug.id = glm.grievance_id
    LEFT JOIN users u ON ug.assigned_officer_id = u.id
    WHERE glm.ward_id = $1 AND ug.status != 'closed'
    ORDER BY 
      CASE ug.priority 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
      END,
      ug.sla_deadline ASC
    LIMIT 10`,
    [wardId]
  );

  // Alerts
  const alertsQuery = await pool.query(
    `SELECT 
      'sla' as type, 
      'SLA breach in ' || ROUND(EXTRACT(EPOCH FROM (ug.sla_deadline - NOW()))/60) || ' minutes for ' || ug.grievance_id as message,
      'high' as severity
    FROM usergrievance ug
    JOIN grievance_location_mapping glm ON ug.id = glm.grievance_id
    WHERE glm.ward_id = $1 
      AND ug.status != 'closed'
      AND ug.sla_deadline BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
    LIMIT 5`,
    [wardId]
  );

  // Category Analytics
  const categoryQuery = await pool.query(
    `SELECT 
      ug.category->>'main_category' as category,
      COUNT(*) as count
    FROM usergrievance ug
    JOIN grievance_location_mapping glm ON ug.id = glm.grievance_id
    WHERE glm.ward_id = $1 
      AND ug.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY ug.category->>'main_category'
    ORDER BY count DESC
    LIMIT 5`,
    [wardId]
  );

  return {
    kpis: kpisQuery.rows[0],
    workers: workersQuery.rows,
    equipment: equipmentQuery.rows,
    complaints: complaintsQuery.rows,
    alerts: alertsQuery.rows,
    categoryAnalytics: categoryQuery.rows
  };
  } catch (error) {
    console.error('Error in getWardOfficerDashboard:', error);
    throw error;
  }
};

// City Commissioner Dashboard
const getCityCommissionerDashboard = async (user) => {
  const cityId = user.city_id;

  // City-wide KPIs
  const kpisQuery = await pool.query(
    `SELECT 
      COUNT(CASE WHEN ug.status IN ('submitted', 'in_progress', 'assigned') THEN 1 END) as active_complaints,
      COUNT(CASE WHEN ug.status = 'closed' AND ug.resolved_at >= NOW() - INTERVAL '30 days' THEN 1 END) as resolved_this_month,
      COUNT(CASE WHEN ug.sla_deadline < NOW() AND ug.status != 'closed' THEN 1 END) as overdue,
      ROUND(AVG(CASE WHEN ug.status = 'closed' THEN ug.resolution_time END), 2) as avg_resolution_time,
      COUNT(CASE WHEN ug.priority = 'critical' THEN 1 END) as critical_issues
    FROM usergrievance ug
    JOIN grievance_location_mapping glm ON ug.id = glm.grievance_id
    WHERE glm.city_id = $1`,
    [cityId]
  );

  // Ward Performance
  const wardPerformanceQuery = await pool.query(
    `SELECT 
      w.ward_name, w.ward_number,
      COUNT(ug.id) as total_grievances,
      COUNT(CASE WHEN ug.status = 'closed' THEN 1 END) as resolved,
      COUNT(CASE WHEN ug.sla_deadline < NOW() AND ug.status != 'closed' THEN 1 END) as overdue,
      ROUND(AVG(CASE WHEN ug.status = 'closed' THEN ug.resolution_time END), 2) as avg_resolution_time
    FROM wards w
    LEFT JOIN grievance_location_mapping glm ON w.id = glm.ward_id
    LEFT JOIN usergrievance ug ON glm.grievance_id = ug.id
    WHERE w.city_id = $1
    GROUP BY w.id, w.ward_name, w.ward_number
    ORDER BY total_grievances DESC`,
    [cityId]
  );

  // Department Performance
  const departmentQuery = await pool.query(
    `SELECT 
      d.name as department,
      COUNT(ug.id) as total_grievances,
      COUNT(CASE WHEN ug.status = 'closed' THEN 1 END) as resolved,
      ROUND(AVG(CASE WHEN ug.status = 'closed' THEN ug.resolution_time END), 2) as avg_resolution_time,
      d.performance_score
    FROM departments d
    LEFT JOIN usergrievance ug ON d.id = ug.department_id
    WHERE ug.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY d.id, d.name, d.performance_score
    ORDER BY total_grievances DESC`,
    []
  );

  // Budget Overview
  const budgetQuery = await pool.query(
    `SELECT 
      SUM(ba.allocation_amount) as total_allocated,
      SUM(ba.allocation_amount - COALESCE(
        (SELECT SUM(total_cost) FROM grievancecosttracking gct 
         WHERE gct.allocation_id = ba.id), 0
      )) as remaining,
      COUNT(ba.id) as active_allocations
    FROM budget_allocations ba
    JOIN department_hierarchy dh ON ba.department_id = dh.department_id
    WHERE dh.city_id = $1 AND ba.status = 'Active'`,
    [cityId]
  );

  // Recent High Priority Issues
  const highPriorityQuery = await pool.query(
    `SELECT 
      ug.grievance_id, ug.grievance_text as title, ug.priority,
      ug.extracted_address as location, ug.status,
      w.ward_name, d.name as department,
      ug.created_at
    FROM usergrievance ug
    JOIN grievance_location_mapping glm ON ug.id = glm.grievance_id
    LEFT JOIN wards w ON glm.ward_id = w.id
    LEFT JOIN departments d ON ug.department_id = d.id
    WHERE glm.city_id = $1 
      AND ug.priority IN ('high', 'critical')
      AND ug.status != 'closed'
    ORDER BY 
      CASE ug.priority WHEN 'critical' THEN 1 ELSE 2 END,
      ug.created_at DESC
    LIMIT 10`,
    [cityId]
  );

  return {
    kpis: kpisQuery.rows[0],
    wardPerformance: wardPerformanceQuery.rows,
    departmentPerformance: departmentQuery.rows,
    budget: budgetQuery.rows[0],
    highPriorityIssues: highPriorityQuery.rows
  };
};

// District Collector Dashboard
const getDistrictCollectorDashboard = async (user) => {
  const districtId = user.district_id;

  // District-wide KPIs
  const kpisQuery = await pool.query(
    `SELECT 
      COUNT(CASE WHEN ug.status IN ('submitted', 'in_progress', 'assigned') THEN 1 END) as active_complaints,
      COUNT(CASE WHEN ug.status = 'closed' THEN 1 END) as total_resolved,
      COUNT(CASE WHEN ug.is_escalated = true THEN 1 END) as escalated,
      ROUND(AVG(CASE WHEN ug.status = 'closed' THEN ug.resolution_time END), 2) as avg_resolution_days,
      COUNT(DISTINCT glm.city_id) as cities_with_issues
    FROM usergrievance ug
    JOIN grievance_location_mapping glm ON ug.id = glm.grievance_id
    WHERE glm.district_id = $1`,
    [districtId]
  );

  // City-wise Performance
  const cityPerformanceQuery = await pool.query(
    `SELECT 
      c.city_name,
      COUNT(ug.id) as total_grievances,
      COUNT(CASE WHEN ug.status = 'closed' THEN 1 END) as resolved,
      COUNT(CASE WHEN ug.status != 'closed' THEN 1 END) as pending,
      ROUND(100.0 * COUNT(CASE WHEN ug.status = 'closed' THEN 1 END) / NULLIF(COUNT(ug.id), 0), 2) as resolution_rate
    FROM cities c
    LEFT JOIN grievance_location_mapping glm ON c.id = glm.city_id
    LEFT JOIN usergrievance ug ON glm.grievance_id = ug.id
    WHERE c.district_id = $1
    GROUP BY c.id, c.city_name
    ORDER BY total_grievances DESC`,
    [districtId]
  );

  // Budget Utilization
  const budgetQuery = await pool.query(
    `SELECT 
      d.name as department,
      SUM(ba.allocation_amount) as allocated,
      SUM(COALESCE(
        (SELECT SUM(total_cost) FROM grievancecosttracking gct 
         WHERE gct.allocation_id = ba.id), 0
      )) as utilized,
      ROUND(100.0 * SUM(COALESCE(
        (SELECT SUM(total_cost) FROM grievancecosttracking gct 
         WHERE gct.allocation_id = ba.id), 0
      )) / NULLIF(SUM(ba.allocation_amount), 0), 2) as utilization_percent
    FROM budget_allocations ba
    JOIN departments d ON ba.department_id = d.id
    JOIN department_hierarchy dh ON d.id = dh.department_id
    WHERE dh.district_id = $1 AND ba.status = 'Active'
    GROUP BY d.id, d.name
    ORDER BY allocated DESC`,
    [districtId]
  );

  // Escalated Issues
  const escalatedQuery = await pool.query(
    `SELECT 
      ug.grievance_id, ug.grievance_text as title,
      c.city_name, w.ward_name, d.name as department,
      ge.escalation_level, ge.reason, ge.created_at
    FROM grievanceescalations ge
    JOIN usergrievance ug ON ge.grievance_id = ug.id
    JOIN grievance_location_mapping glm ON ug.id = glm.grievance_id
    LEFT JOIN cities c ON glm.city_id = c.id
    LEFT JOIN wards w ON glm.ward_id = w.id
    LEFT JOIN departments d ON ug.department_id = d.id
    WHERE glm.district_id = $1 AND ge.is_resolved = false
    ORDER BY ge.created_at DESC
    LIMIT 10`,
    [districtId]
  );

  // Trend Analysis
  const trendQuery = await pool.query(
    `SELECT 
      DATE(ug.created_at) as date,
      COUNT(*) as total,
      COUNT(CASE WHEN ug.status = 'closed' THEN 1 END) as resolved
    FROM usergrievance ug
    JOIN grievance_location_mapping glm ON ug.id = glm.grievance_id
    WHERE glm.district_id = $1 
      AND ug.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(ug.created_at)
    ORDER BY date DESC`,
    [districtId]
  );

  return {
    kpis: kpisQuery.rows[0],
    cityPerformance: cityPerformanceQuery.rows,
    budgetUtilization: budgetQuery.rows,
    escalatedIssues: escalatedQuery.rows,
    trendAnalysis: trendQuery.rows
  };
};

// Department Officer Dashboard
const getDepartmentOfficerDashboard = async (user) => {
  try {
    const departmentId = user.department_id;
    
    if (!departmentId) {
      console.error('Department ID is missing for user:', user.id);
      // Return empty dashboard instead of throwing error
      return {
        kpis: {
          active_tasks: 0,
          my_assignments: 0,
          resolved_by_me: 0,
          my_avg_resolution_time: 0
        },
        myTasks: []
      };
    }
    
    console.log('Fetching department officer dashboard for department:', departmentId);

  const kpisQuery = await pool.query(
    `SELECT 
      COUNT(CASE WHEN ug.status IN ('submitted', 'assigned', 'in_progress') THEN 1 END) as active_tasks,
      COUNT(CASE WHEN ug.assigned_officer_id = $1 THEN 1 END) as my_assignments,
      COUNT(CASE WHEN ug.status = 'closed' AND ug.resolved_by = $1 THEN 1 END) as resolved_by_me,
      ROUND(AVG(CASE WHEN ug.status = 'closed' AND ug.resolved_by = $1 THEN ug.resolution_time END), 2) as my_avg_resolution_time
    FROM usergrievance ug
    WHERE ug.department_id = $2`,
    [user.id, departmentId]
  );

  const myTasksQuery = await pool.query(
    `SELECT 
      ug.grievance_id, ug.grievance_text as title, ug.priority, ug.status,
      ug.extracted_address as location, ug.sla_deadline,
      EXTRACT(EPOCH FROM (ug.sla_deadline - NOW()))/3600 as hours_remaining
    FROM usergrievance ug
    WHERE ug.assigned_officer_id = $1 AND ug.status != 'closed'
    ORDER BY ug.sla_deadline ASC
    LIMIT 10`,
    [user.id]
  );

  return {
    kpis: kpisQuery.rows[0],
    myTasks: myTasksQuery.rows
  };
  } catch (error) {
    console.error('Error in getDepartmentOfficerDashboard:', error);
    throw error;
  }
};

// State Official Dashboard
const getStateOfficialDashboard = async (user) => {
  const stateId = user.state_id;

  const kpisQuery = await pool.query(
    `SELECT 
      COUNT(ug.id) as total_grievances,
      COUNT(CASE WHEN ug.status = 'closed' THEN 1 END) as resolved,
      COUNT(CASE WHEN ug.is_escalated = true THEN 1 END) as escalated_to_state,
      COUNT(DISTINCT glm.district_id) as districts_active
    FROM usergrievance ug
    JOIN grievance_location_mapping glm ON ug.id = glm.grievance_id
    WHERE glm.state_id = $1`,
    [stateId]
  );

  const districtPerformanceQuery = await pool.query(
    `SELECT 
      d.district_name,
      COUNT(ug.id) as total,
      COUNT(CASE WHEN ug.status = 'closed' THEN 1 END) as resolved,
      ROUND(100.0 * COUNT(CASE WHEN ug.status = 'closed' THEN 1 END) / NULLIF(COUNT(ug.id), 0), 2) as resolution_rate
    FROM districts d
    LEFT JOIN grievance_location_mapping glm ON d.id = glm.district_id
    LEFT JOIN usergrievance ug ON glm.grievance_id = ug.id
    WHERE d.state_id = $1
    GROUP BY d.id, d.district_name
    ORDER BY total DESC`,
    [stateId]
  );

  return {
    kpis: kpisQuery.rows[0],
    districtPerformance: districtPerformanceQuery.rows
  };
};
