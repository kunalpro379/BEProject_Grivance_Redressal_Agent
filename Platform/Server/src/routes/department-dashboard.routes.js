import express from 'express';
import multer from 'multer';
import path from 'path';
import pool from '../config/database.js';
import { authenticate, verifyDepartmentAccess as authVerifyDepartmentAccess } from '../middleware/auth.js';
import azureStorageService from '../services/azure.storage.services.js';
import azureKnowledgeBaseQueueService from '../services/azure.queue.knowledgebase.service.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, JPG, and PNG files are allowed'));
    }
  }
});

// Helper: get department info from head_officer_id
async function getDepartmentByHeadOfficerId(headOfficerId) {
  if (!headOfficerId) return null;
  try {
    const result = await pool.query(
      `SELECT id as department_id, name
       FROM departments
       WHERE head_officer_id = $1
       LIMIT 1`,
      [headOfficerId]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('getDepartmentByHeadOfficerId error:', err);
    return null;
  }
}

// Helper: get internal department_id (UUID) from head_officer_id (UUID) used in URLs
// head_officer_id is stored in departments table
async function getDepartmentIdByHeadOfficerId(headOfficerId) {
  const dept = await getDepartmentByHeadOfficerId(headOfficerId);
  return dept?.department_id || null;
}

// Middleware to verify department access: only the officer's own department is allowed
// Admin can access any department; department_officer/department_head only their own department
const verifyDepartmentAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const allowedRoles = ['admin', 'department_officer', 'department_head'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions for department dashboard' });
  }

  // Admin can access any department
  if (req.user.role === 'admin') {
    return next();
  }

  const requestedDepartmentId = (req.params.depId || req.params.departmentId || '').trim();
  const userDepartmentId = (req.user.department_id || '').trim();

  if (!requestedDepartmentId) {
    return res.status(400).json({ error: 'Department ID is required' });
  }

  // Department officer/head: allow only if they belong to this department
  if (userDepartmentId !== requestedDepartmentId) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'You can only access your own department dashboard.'
    });
  }

  next();
};

// Get complete dashboard data for a department (with real grievance stats from DB)
router.get('/:depId/complete', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is actually department_id (UUID) now

    // Get department info using department_id
    let deptInfo;
    try {
      deptInfo = await pool.query(
        `SELECT d.id as department_id, d.name as department_name, u.full_name
         FROM departments d
         LEFT JOIN users u ON u.id = d.head_officer_id
         WHERE d.id = $1`,
        [departmentId]
      );
      
      if (deptInfo.rows.length === 0) {
        return res.status(404).json({ error: 'Department not found' });
      }
    } catch (e) {
      console.error('Error fetching department info:', e);
      return res.status(500).json({ error: 'Failed to fetch department information' });
    }

    const department = {
      name: deptInfo.rows[0]?.department_name || 'Water Supply Department',
      officer: deptInfo.rows[0]?.full_name || 'Department Officer'
    };

    // Aggregate real grievance stats (cast status to text for enum safety)
    let statsResult;
    try {
      statsResult = await pool.query(
        `SELECT
          COUNT(*)::int AS total_grievances,
          COUNT(*) FILTER (WHERE status::text IN ('submitted', 'pending'))::int AS pending_grievances,
          COUNT(*) FILTER (WHERE status::text = 'in_progress')::int AS in_progress_grievances,
          COUNT(*) FILTER (WHERE status::text IN ('resolved', 'closed'))::int AS resolved_grievances,
          COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL AND sla_deadline < NOW() AND status::text NOT IN ('resolved', 'closed', 'rejected'))::int AS overdue_grievances,
          COUNT(*) FILTER (WHERE priority IN ('Emergency', 'Urgent', 'emergency', 'urgent'))::int AS emergency_grievances
        FROM usergrievance
        WHERE department_id = $1`,
        [departmentId]
      );
    } catch (statsErr) {
      console.error('Dashboard stats query error:', statsErr);
      statsResult = { rows: [{}] };
    }

    const stats = statsResult.rows[0] || {};
    const totalGrievances = parseInt(stats.total_grievances, 10) || 0;
    const pendingGrievances = parseInt(stats.pending_grievances, 10) || 0;
    const resolvedGrievances = parseInt(stats.resolved_grievances, 10) || 0;
    const overdueGrievances = parseInt(stats.overdue_grievances, 10) || 0;
    const emergencyGrievances = parseInt(stats.emergency_grievances, 10) || 0;
    
    // Calculate monthly trend (compare this month vs last month)
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    let monthlyTrend = '+0%';
    try {
      const [thisMonthCount, lastMonthCount] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int as count FROM usergrievance WHERE department_id = $1 AND created_at >= $2`, [departmentId, thisMonthStart]),
        pool.query(`SELECT COUNT(*)::int as count FROM usergrievance WHERE department_id = $1 AND created_at >= $2 AND created_at < $3`, [departmentId, lastMonthStart, thisMonthStart])
      ]);
      const thisMonth = parseInt(thisMonthCount.rows[0]?.count || 0);
      const lastMonth = parseInt(lastMonthCount.rows[0]?.count || 0);
      if (lastMonth > 0) {
        const change = ((thisMonth - lastMonth) / lastMonth) * 100;
        monthlyTrend = `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`;
      } else if (thisMonth > 0) {
        monthlyTrend = '+100%';
      }
    } catch (e) {
      console.warn('Monthly trend calculation failed:', e.message);
    }

    const grievanceOverview = {
      totalGrievances,
      pendingGrievances,
      resolvedGrievances,
      overdueGrievances,
      emergencyGrievances,
      monthlyTrend
    };

    // Calculate Performance Metrics from real data
    let performanceMetrics = {
      kpiScore: 0,
      kpiTarget: 90,
      performanceTrend: '+0%',
      slaCompliance: '0%',
      avgResolutionTime: '0 days',
      citizenSatisfaction: 0
    };
    try {
      // Avg resolution time
      const resolutionTimeResult = await pool.query(
        `SELECT AVG(resolution_time) as avg_time FROM usergrievance WHERE department_id = $1 AND resolution_time IS NOT NULL`,
        [departmentId]
      );
      const avgTime = parseFloat(resolutionTimeResult.rows[0]?.avg_time || 0);
      performanceMetrics.avgResolutionTime = avgTime > 0 ? `${avgTime.toFixed(1)} days` : '0 days';

      // SLA Compliance
      const slaResult = await pool.query(
        `SELECT 
          COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL AND (status::text IN ('resolved', 'closed') OR updated_at <= sla_deadline))::int as compliant,
          COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL)::int as total_with_sla
        FROM usergrievance WHERE department_id = $1`,
        [departmentId]
      );
      const compliant = parseInt(slaResult.rows[0]?.compliant || 0);
      const totalWithSla = parseInt(slaResult.rows[0]?.total_with_sla || 0);
      const slaCompliance = totalWithSla > 0 ? Math.round((compliant / totalWithSla) * 1000) / 10 : 0;
      performanceMetrics.slaCompliance = `${slaCompliance}%`;

      // Citizen Rating (from grievancefeedback)
      const ratingResult = await pool.query(
        `SELECT AVG(f.rating) as avg_rating FROM grievancefeedback f
         JOIN usergrievance g ON g.id = f.grievance_id WHERE g.department_id = $1`,
        [departmentId]
      );
      const avgRating = parseFloat(ratingResult.rows[0]?.avg_rating || 0);
      performanceMetrics.citizenSatisfaction = Math.round(avgRating * 10) / 10;

      // KPI Score (weighted average: SLA 40%, Resolution Time 30%, Citizen Rating 30%)
      const slaScore = slaCompliance;
      const resolutionScore = avgTime > 0 ? Math.max(0, 100 - (avgTime - 2) * 10) : 0; // Target: 2 days
      const ratingScore = avgRating * 20; // 5 stars = 100%
      const kpiScore = (slaScore * 0.4) + (resolutionScore * 0.3) + (ratingScore * 0.3);
      performanceMetrics.kpiScore = Math.round(kpiScore * 10) / 10;
      
      // Performance trend will be calculated after stored data is fetched
      performanceMetrics.performanceTrend = '+0%';
    } catch (e) {
      console.warn('Performance metrics calculation failed:', e.message);
    }

    // Get stored dashboard JSONB early (for performance trend calculation)
    let stored = {};
    try {
      const dashboardData = await pool.query(
        `SELECT dashboard_data FROM department_dashboards WHERE department_id = $1`,
        [departmentId]
      );
      stored = dashboardData.rows[0]?.dashboard_data || {};
    } catch (dashboardErr) {
      console.warn('department_dashboards read skipped:', dashboardErr.message);
    }

    // Calculate performance trend now that stored data is available
    if (performanceMetrics.kpiScore > 0 && stored.performanceMetrics?.kpiScore) {
      const prevKpi = stored.performanceMetrics.kpiScore;
      const kpiChange = performanceMetrics.kpiScore - prevKpi;
      performanceMetrics.performanceTrend = `${kpiChange >= 0 ? '+' : ''}${kpiChange.toFixed(1)}%`;
    }

    // Calculate Resource Health from real data
    let resourceHealth = {
      staff: { total: 0, available: 0, status: 'Unknown', utilizationRate: 0 },
      equipment: { total: 0, available: 0, status: 'Unknown', availabilityPercent: 0 },
      budget: { allocated: 0, spent: 0, remaining: 0, status: 'Unknown', utilizationPercent: 0 },
      materials: { adequate: 0, lowStock: 0, critical: 0, status: 'Unknown' }
    };
    if (departmentId) {
      try {
        // Staff
        const staffResult = await pool.query(
          `SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE status = 'available')::int as available
           FROM departmentofficers WHERE department_id = $1`,
          [departmentId]
        );
        const totalStaff = parseInt(staffResult.rows[0]?.total || 0);
        const availableStaff = parseInt(staffResult.rows[0]?.available || 0);
        const utilizationRate = totalStaff > 0 ? Math.round(((totalStaff - availableStaff) / totalStaff) * 100) : 0;
        resourceHealth.staff = {
          total: totalStaff,
          available: availableStaff,
          status: totalStaff < 50 ? 'Shortage' : 'Adequate',
          utilizationRate
        };

        // Equipment
        const equipResult = await pool.query(
          `SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE status = 'available')::int as available
           FROM equipment WHERE department_id = $1`,
          [departmentId]
        );
        const totalEquip = parseInt(equipResult.rows[0]?.total || 0);
        const availableEquip = parseInt(equipResult.rows[0]?.available || 0);
        const availabilityPercent = totalEquip > 0 ? Math.round((availableEquip / totalEquip) * 100) : 0;
        resourceHealth.equipment = {
          total: totalEquip,
          available: availableEquip,
          status: availabilityPercent < 50 ? 'Low' : 'Adequate',
          availabilityPercent
        };

        // Budget (from departments table)
        const budgetResult = await pool.query(
          `SELECT budget_allocated, budget_used FROM departments WHERE id = $1`,
          [departmentId]
        );
        const allocated = parseFloat(budgetResult.rows[0]?.budget_allocated || 0);
        const used = parseFloat(budgetResult.rows[0]?.budget_used || 0);
        const remaining = allocated - used;
        const utilizationPercent = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
        resourceHealth.budget = {
          allocated,
          spent: used,
          remaining,
          status: utilizationPercent > 80 ? 'At Risk' : utilizationPercent > 65 ? 'On Track' : 'Under Budget',
          utilizationPercent
        };

        // Materials
        const materialsResult = await pool.query(
          `SELECT 
            COUNT(*) FILTER (WHERE status = 'adequate')::int as adequate,
            COUNT(*) FILTER (WHERE status = 'low_stock')::int as low_stock,
            COUNT(*) FILTER (WHERE status = 'critical')::int as critical
          FROM materialinventory WHERE department_id = $1`,
          [departmentId]
        );
        const adequate = parseInt(materialsResult.rows[0]?.adequate || 0);
        const lowStock = parseInt(materialsResult.rows[0]?.low_stock || 0);
        const critical = parseInt(materialsResult.rows[0]?.critical || 0);
        resourceHealth.materials = {
          adequate,
          lowStock,
          critical,
          status: critical > 0 ? 'Critical Alert' : lowStock > 0 ? 'Low Stock Alert' : 'Adequate'
        };
      } catch (e) {
        console.warn('Resource health calculation failed:', e.message);
      }
    }

    // Calculate Zone Performance
    let zonePerformance = [];
    try {
      const zoneResult = await pool.query(
        `SELECT 
          zone,
          COUNT(*)::int as active,
          COUNT(*) FILTER (WHERE status::text IN ('resolved', 'closed'))::int as resolved,
          COUNT(*)::int as total,
          AVG(resolution_time) as avg_time
        FROM usergrievance WHERE department_id = $1 AND zone IS NOT NULL GROUP BY zone`,
        [departmentId]
      );
      const staffByZone = await pool.query(
        `SELECT zone, COUNT(*)::int as staff_count, AVG(workload) as avg_workload
         FROM departmentofficers WHERE department_id = $1 AND zone IS NOT NULL GROUP BY zone`,
        [departmentId]
      );
      const zoneStaffMap = {};
      staffByZone.rows.forEach(r => {
        zoneStaffMap[r.zone] = { staff: parseInt(r.staff_count || 0), utilization: Math.round(parseFloat(r.avg_workload || 0)) };
      });
      zonePerformance = zoneResult.rows.map(r => {
        const active = parseInt(r.active || 0);
        const resolved = parseInt(r.resolved || 0);
        const total = parseInt(r.total || 0);
        const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
        const avgTime = parseFloat(r.avg_time || 0);
        const zoneStaff = zoneStaffMap[r.zone] || { staff: 0, utilization: 0 };
        let riskLevel = 'Low';
        if (resolutionRate < 70 || avgTime > 5 || zoneStaff.utilization > 90) riskLevel = 'High';
        else if (resolutionRate < 80 || avgTime > 4 || zoneStaff.utilization > 80) riskLevel = 'Medium';
        return {
          zone: r.zone,
          active,
          resolutionRate,
          avgTime: avgTime > 0 ? `${avgTime.toFixed(1)} days` : 'N/A',
          staff: zoneStaff.staff,
          utilization: zoneStaff.utilization,
          riskLevel
        };
      });
    } catch (e) {
      console.warn('Zone performance calculation failed:', e.message);
    }

    // Category-wise Grievances
    let categoryWiseGrievances = [];
    try {
      const categoryResult = await pool.query(
        `SELECT 
          COALESCE((category->>'primary')::text, (category#>>'{0}')::text, 'Uncategorized') as category_name,
          COUNT(*)::int as count
        FROM usergrievance WHERE department_id = $1 GROUP BY category->>'primary', category#>>'{0}' ORDER BY count DESC`,
        [departmentId]
      );
      const totalForPercent = categoryResult.rows.reduce((sum, r) => sum + parseInt(r.count || 0), 0);
      categoryWiseGrievances = categoryResult.rows.map((r, idx) => ({
        rank: idx + 1,
        category: r.category_name,
        count: parseInt(r.count || 0),
        percentage: totalForPercent > 0 ? Math.round((parseInt(r.count || 0) / totalForPercent) * 1000) / 10 : 0
      }));
    } catch (e) {
      console.warn('Category-wise grievances calculation failed:', e.message);
    }

    // Emergency and Urgent Grievances (detailed lists for UI)
    let emergencyGrievanceList = [];
    let urgentGrievanceList = [];
    try {
      const emergencyResult = await pool.query(
        `SELECT g.grievance_id, g.status, g.category, g.extracted_address as location, g.priority
         FROM usergrievance g WHERE g.department_id = $1 AND g.priority IN ('Emergency', 'emergency')
         ORDER BY g.created_at DESC LIMIT 5`,
        [departmentId]
      );
      emergencyGrievanceList = emergencyResult.rows.map(r => ({
        grievance_id: r.grievance_id,
        status: r.status,
        category: typeof r.category === 'object' ? r.category.primary : (typeof r.category === 'string' && r.category.startsWith('{') ? JSON.parse(r.category).primary : r.category),
        location: r.location
      }));

      const urgentResult = await pool.query(
        `SELECT g.grievance_id, g.status, g.category, g.extracted_address as location, g.priority
         FROM usergrievance g WHERE g.department_id = $1 AND g.priority IN ('Urgent', 'urgent')
         ORDER BY g.created_at DESC LIMIT 5`,
        [departmentId]
      );
      urgentGrievanceList = urgentResult.rows.map(r => ({
        grievance_id: r.grievance_id,
        status: r.status,
        category: typeof r.category === 'object' ? r.category.primary : (typeof r.category === 'string' && r.category.startsWith('{') ? JSON.parse(r.category).primary : r.category),
        location: r.location
      }));
    } catch (e) {
      console.warn('Emergency/Urgent grievances fetch failed:', e.message);
    }

    // Recent Grievances
    let recentGrievanceList = [];
    try {
      const recentResult = await pool.query(
        `SELECT g.grievance_id, g.status, g.category, g.extracted_address as location, g.priority, g.created_at
         FROM usergrievance g WHERE g.department_id = $1 ORDER BY g.created_at DESC LIMIT 5`,
        [departmentId]
      );
      recentGrievanceList = recentResult.rows.map(r => ({
        grievance_id: r.grievance_id,
        status: r.status,
        category: typeof r.category === 'object' ? r.category.primary : (typeof r.category === 'string' && r.category.startsWith('{') ? JSON.parse(r.category).primary : r.category),
        location: r.location,
        priority: r.priority,
        created_at: r.created_at
      }));
    } catch (e) {
      console.warn('Recent grievances fetch failed:', e.message);
    }

    // Critical Alerts & Risks
    let alertsRiskMonitoring = [];
    try {
      // Budget alert
      if (resourceHealth.budget.utilizationPercent > 65) {
        alertsRiskMonitoring.push({
          riskLevel: resourceHealth.budget.utilizationPercent > 80 ? 'Critical' : 'Medium',
          category: 'BUDGET',
          description: `Budget nearing limit - ${resourceHealth.budget.utilizationPercent}% utilized`,
          action: 'Review upcoming expenses and optimize spending'
        });
      }
      // Equipment alert (from predictive maintenance)
      if (departmentId) {
        const equipAlertResult = await pool.query(
          `SELECT e.equipment_id, e.name FROM equipment e
           JOIN predictivemaintenance p ON p.equipment_id = e.id
           WHERE e.department_id = $1 AND p.risk_level IN ('high', 'High') LIMIT 1`,
          [departmentId]
        );
        if (equipAlertResult.rows.length > 0) {
          alertsRiskMonitoring.push({
            riskLevel: 'High',
            category: 'EQUIPMENT',
            description: `Equipment failure risk - ${equipAlertResult.rows[0].name} ${equipAlertResult.rows[0].equipment_id}`,
            action: 'Schedule immediate maintenance'
          });
        }
      }
      // SLA alert
      if (overdueGrievances > 10) {
        alertsRiskMonitoring.push({
          riskLevel: 'Critical',
          category: 'SLA',
          description: `SLA violation risk - ${overdueGrievances} grievances near deadline`,
          action: 'Prioritize and allocate emergency resources'
        });
      }
      // Zone 4 complaint growth alert
      const zone4Growth = zonePerformance.find(z => z.zone === 'Zone 4');
      if (zone4Growth && zone4Growth.active > 20) {
        alertsRiskMonitoring.push({
          riskLevel: 'Medium',
          category: 'Complaint',
          description: `High complaint growth alert - Zone 4 (+${Math.round((zone4Growth.active / 15) * 100 - 100)}%)`,
          action: 'Investigate root cause and deploy additional resources'
        });
      }
    } catch (e) {
      console.warn('Alerts calculation failed:', e.message);
    }

    // Recent Activity Feed (from audit logs)
    let recentActivityFeed = [];
    try {
      const deptIdForActivity = departmentId; // Use departmentId directly
      let activityResult;
      
      // Try query with department_id from users table
      try {
        activityResult = await pool.query(
          `SELECT a.action, a.entity_type, a.details, a.timestamp
           FROM auditlog a WHERE a.actor_id IN (SELECT id FROM users WHERE department_id = $1)
           ORDER BY a.timestamp DESC LIMIT 10`,
          [deptIdForActivity]
        );
      } catch (colErr) {
        // Fallback to empty if query fails
        activityResult = { rows: [] };
      }
      recentActivityFeed = activityResult.rows.map(r => {
        const details = typeof r.details === 'string' ? JSON.parse(r.details) : (r.details || {});
        let description = '';
        let category = r.entity_type || 'System';
        if (r.action === 'LOGIN') {
          description = 'User logged in';
          category = 'System';
        } else if (r.action === 'CREATE_GRIEVANCE') {
          const priority = details.priority || '';
          const isEmergency = priority.toLowerCase() === 'emergency';
          description = isEmergency 
            ? `New emergency grievance received - ${details.grievance_id || 'N/A'}`
            : `New grievance created - ${details.grievance_id || 'N/A'}`;
          category = 'Grievance';
        } else if (r.action === 'ASSIGN_GRIEVANCE') {
          description = `Grievance assigned - ${details.assigned_to || 'N/A'}`;
          category = 'Grievance';
        } else if (r.action === 'UPDATE_STATUS' || r.action === 'Status Changed') {
          description = details.description || `Status updated`;
          category = 'Grievance';
        } else if (r.action === 'COMPLETE_GRIEVANCE') {
          description = `Grievance completed`;
          category = 'Grievance';
        } else if (r.action.includes('Tender') || r.action.includes('tender')) {
          description = `Tender created - ${details.tender_name || details.title || 'N/A'}`;
          category = 'Tender';
        } else if (r.action.includes('Contractor') || r.action.includes('contractor')) {
          description = `Contractor assigned - ${details.contractor_name || details.assigned_to || 'N/A'} to Project ${details.project_id || 'N/A'}`;
          category = 'Contractor';
        } else if (r.action.includes('Resource') || r.action.includes('resource')) {
          description = `Resource request submitted - ${details.resource_description || details.description || 'N/A'}`;
          category = 'Resource';
        } else if (r.action.includes('AI') || r.action.includes('Recommendation')) {
          description = `AI recommendation generated - ${details.recommendation || details.description || 'N/A'}`;
          category = 'AI';
        } else if (r.action.includes('Work Order') || r.action.includes('work_order')) {
          description = `Work order issued - ${details.work_order_id || details.order_id || 'N/A'}`;
          category = 'Work Order';
        } else {
          description = `${r.action} - ${r.entity_type || ''}`;
        }
        return {
          description,
          timestamp: r.timestamp,
          category
        };
      });
    } catch (e) {
      console.warn('Recent activity feed fetch failed:', e.message);
    }

    // Tender Project Status
    let tenderProjectStatus = {
      activeTenders: 0,
      activeProjects: 0,
      projectsAtRisk: 0,
      projectsDelayed: 0
    };
    if (departmentId) {
      try {
        const tenderResult = await pool.query(
          `SELECT 
            COUNT(*) FILTER (WHERE status = 'open')::int as active_tenders,
            COUNT(*) FILTER (WHERE status IN ('open', 'awarded'))::int as active_projects
          FROM tenders WHERE department_id = $1`,
          [departmentId]
        );
        tenderProjectStatus.activeTenders = parseInt(tenderResult.rows[0]?.active_tenders || 0);
        tenderProjectStatus.activeProjects = parseInt(tenderResult.rows[0]?.active_projects || 0);
        // Projects at risk/delayed would need more data, using placeholder for now
        tenderProjectStatus.projectsAtRisk = Math.floor(tenderProjectStatus.activeProjects * 0.2);
        tenderProjectStatus.projectsDelayed = Math.floor(tenderProjectStatus.activeProjects * 0.15);
      } catch (e) {
        console.warn('Tender project status calculation failed:', e.message);
      }
    }

    // Department Health Score (calculated from performance metrics)
    const healthScore = Math.round(performanceMetrics.kpiScore);
    const healthStatus = healthScore >= 80 ? 'Good' : healthScore >= 60 ? 'Fair' : 'Poor';
    const healthTrend = parseFloat(performanceMetrics.performanceTrend.replace('%', '')) >= 0 ? 'Improving' : 'Declining';
    const departmentHealthScore = {
      overallScore: healthScore,
      maxScore: 100,
      status: healthStatus,
      trend: healthTrend
    };

    // Get AI Insights (from aiinsights table)
    let aiInsights = [];
    try {
      const aiResult = await pool.query(
        `SELECT insight_type, priority, confidence_score, title, description, recommended_action
         FROM aiinsights WHERE grievance_id IN (SELECT id FROM usergrievance WHERE department_id = $1) OR grievance_id IS NULL
         ORDER BY CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END, created_at DESC LIMIT 4`,
        [departmentId]
      );
      aiInsights = aiResult.rows.map(r => ({
        priority: r.priority || 'Medium',
        confidence: parseFloat(r.confidence_score || 0),
        message: r.description || r.title,
        recommendation: r.recommended_action || 'N/A'
      }));
    } catch (e) {
      console.warn('AI insights fetch failed:', e.message);
    }

    const grievanceTrends = stored.grievanceTrends || { daily: [], byCategory: [], byZone: [] };

    // SLA Policy and Monitoring (for SLA Policy Engine tab)
    const slaPolicy = [
      { priority: 'Emergency', slaHours: 24, slaDescription: 'Critical issues requiring immediate response (e.g. water supply failure, contamination risk)' },
      { priority: 'Urgent', slaHours: 72, slaDescription: 'High-priority complaints (e.g. major leakage, scarcity, no supply)' },
      { priority: 'High', slaHours: 168, slaDescription: 'Important issues (e.g. water quality, tap connection delay)' },
      { priority: 'Medium', slaHours: 360, slaDescription: 'Standard complaints (e.g. billing, meter, minor repairs)' },
      { priority: 'Low', slaHours: 720, slaDescription: 'Routine or non-urgent matters' }
    ];
    let nearSLADeadline = 0;
    try {
      const nearResult = await pool.query(
        `SELECT COUNT(*)::int as c FROM usergrievance
         WHERE department_id = $1 AND sla_deadline IS NOT NULL AND status::text NOT IN ('resolved', 'closed', 'rejected')
         AND sla_deadline > NOW() AND sla_deadline <= NOW() + INTERVAL '24 hours'`,
        [departmentId]
      );
      nearSLADeadline = parseInt(nearResult.rows[0]?.c || 0);
    } catch (e) { /* ignore */ }
    const slaComplianceNum = parseFloat(String(performanceMetrics.slaCompliance || '0').replace('%', ''));
    const slaEscalationMonitoring = {
      nearSLADeadline,
      overdueGrievances: overdueGrievances,
      slaCompliancePercent: Number.isFinite(slaComplianceNum) ? slaComplianceNum : 0
    };

    // Override grievanceOverview with real DB counts; merge rest from stored
    const data = {
      department,
      grievanceOverview,
      performanceMetrics,
      resourceHealth,
      tenderProjectStatus,
      departmentHealthScore,
      zonePerformance,
      grievanceTrends,
      aiInsights,
      alertsRiskMonitoring,
      recentActivityFeed,
      categoryWiseGrievances,
      emergencyGrievances: emergencyGrievanceList,
      urgentGrievances: urgentGrievanceList,
      recentGrievances: recentGrievanceList,
      grievances: [],
      slaPolicy,
      slaEscalationMonitoring
    };

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    const message = process.env.NODE_ENV !== 'production' ? error.message : 'Failed to fetch dashboard data';
    res.status(500).json({ error: message });
  }
});

// Get grievance stats for department (for Dashboard widget)
router.get('/:depId/stats', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const statsResult = await pool.query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status::text IN ('submitted', 'pending'))::int AS pending,
        COUNT(*) FILTER (WHERE status::text = 'in_progress')::int AS in_progress,
        COUNT(*) FILTER (WHERE status::text IN ('resolved', 'closed'))::int AS resolved,
        COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL AND sla_deadline < NOW() AND status::text NOT IN ('resolved', 'closed', 'rejected'))::int AS overdue
      FROM usergrievance
      WHERE department_id = $1`,
      [depId]
    );
    const s = statsResult.rows[0] || {};
    res.json({
      success: true,
      stats: {
        total: parseInt(s.total, 10) || 0,
        pending: parseInt(s.pending, 10) || 0,
        in_progress: parseInt(s.in_progress, 10) || 0,
        resolved: parseInt(s.resolved, 10) || 0,
        overdue: parseInt(s.overdue, 10) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching department stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get grievances for department
router.get('/:depId/grievances', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const { status, category, priority, limit = 50 } = req.query;

    let query = `
      SELECT 
        g.id,
        g.grievance_id,
        g.grievance_text as title,
        g.grievance_text as description,
        g.category,
        g.priority,
        g.status,
        g.extracted_address as location,
        g.extracted_latitude,
        g.extracted_longitude,
        g.created_at,
        g.updated_at,
        g.comments,
        g.workflow,
        g.estimated_cost,
        g.actual_cost,
        g.escalation_level,
        g.citizen_feedback,
        c.full_name as citizen_name,
        c.phone as citizen_phone,
        c.email as citizen_email,
        u.full_name as officer_name
      FROM usergrievance g
      LEFT JOIN citizens c ON g.citizen_id = c.id
      LEFT JOIN users u ON g.assigned_officer_id = u.id
      WHERE g.department_id = $1
    `;

    const params = [depId];
    let paramCount = 2;

    // Filter out undefined, null, 'all', and the string 'undefined'
    if (status && status !== 'all' && status !== 'undefined' && status !== 'null') {
      query += ` AND g.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (category && category !== 'all' && category !== 'undefined' && category !== 'null') {
      query += ` AND g.category::text ILIKE $${paramCount}`;
      params.push(`%${category}%`);
      paramCount++;
    }

    if (priority && priority !== 'all' && priority !== 'undefined' && priority !== 'null') {
      query += ` AND g.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    query += ` ORDER BY 
      CASE g.priority 
        WHEN 'Emergency' THEN 1 
        WHEN 'emergency' THEN 1 
        WHEN 'Urgent' THEN 2 
        WHEN 'urgent' THEN 2 
        WHEN 'High' THEN 3 
        WHEN 'Medium' THEN 4 
        WHEN 'Low' THEN 5 
      END,
      g.created_at DESC
      LIMIT $${paramCount}
    `;
    params.push(limit);

    const result = await pool.query(query, params);

    // Normalize category: ensure every row has a displayable category (object with primary or string)
    const rows = result.rows.map((row) => {
      const c = row.category;
      if (c == null) {
        row.category = { primary: 'General' };
      } else if (typeof c === 'object' && !c.primary && !c.name && !c.category) {
        row.category = { primary: 'General' };
      } else if (typeof c === 'string' && c.trim() && !c.startsWith('{')) {
        row.category = { primary: c };
      }
      return row;
    });

    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching grievances:', error);
    res.status(500).json({ error: 'Failed to fetch grievances' });
  }
});

// Get grievances with coordinates for Map View (must be before /:grievanceId)
router.get('/:depId/grievances/map', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const { limit = 200 } = req.query;

    const result = await pool.query(
      `SELECT 
        g.id,
        g.grievance_id,
        g.grievance_text as title,
        g.status,
        g.priority,
        g.extracted_address as location,
        g.extracted_latitude as lat,
        g.extracted_longitude as lng,
        g.created_at,
        c.full_name as citizen_name,
        u.full_name as officer_name
      FROM usergrievance g
      LEFT JOIN citizens c ON g.citizen_id = c.id
      LEFT JOIN users u ON g.assigned_officer_id = u.id
      WHERE g.department_id = $1
      ORDER BY g.created_at DESC
      LIMIT $2`,
      [depId, limit]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching grievances for map:', error);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

// Get single grievance by grievance_id (for detail view)
router.get('/:depId/grievances/:grievanceId', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId, grievanceId } = req.params;
    const result = await pool.query(
      `SELECT 
        g.id, g.grievance_id, g.grievance_text as description, g.category, g.priority, g.status,
        g.extracted_address as location, g.extracted_latitude, g.extracted_longitude,
        g.created_at, g.updated_at, g.workflow, g.comments, g.sla_deadline, g.resolution_time,
        g.estimated_cost, g.actual_cost,
        c.full_name as citizen_name, c.phone as citizen_phone, c.email as citizen_email,
        u.full_name as officer_name, u.id as assigned_officer_id
      FROM usergrievance g
      LEFT JOIN citizens c ON g.citizen_id = c.id
      LEFT JOIN users u ON g.assigned_officer_id = u.id
      WHERE g.department_id = $1 AND g.grievance_id = $2`,
      [depId, grievanceId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Grievance not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching grievance detail:', error);
    res.status(500).json({ error: 'Failed to fetch grievance' });
  }
});

// Helper: get department_id for dep_id
// Helper function moved to top of route handler

// Cost Tracking - from grievancecosttracking + usergrievance
router.get('/:depId/cost-tracking', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const result = await pool.query(
      `SELECT 
        c.id, c.grievance_id, c.labor_cost, c.material_cost, c.equipment_cost, c.transport_cost,
        c.total_cost, c.budget_allocated, c.budget_used, c.budget_remaining, c.cost_breakdown, c.status as budget_status,
        g.grievance_id as grievance_display_id, g.grievance_text
      FROM grievancecosttracking c
      INNER JOIN usergrievance g ON g.id = c.grievance_id
      WHERE g.department_id = $1
      ORDER BY c.updated_at DESC`,
      [depId]
    );
    // Map to camelCase for frontend (grievanceId, costStatus, laborCost, etc.)
    const data = (result.rows || []).map((r) => ({
      id: r.id,
      grievanceId: r.grievance_display_id,
      grievance_id: r.grievance_id,
      laborCost: Number(r.labor_cost) || 0,
      materialCost: Number(r.material_cost) || 0,
      equipmentCost: Number(r.equipment_cost) || 0,
      transportCost: Number(r.transport_cost) || 0,
      totalCost: Number(r.total_cost) || 0,
      budgetAllocated: Number(r.budget_allocated) || 0,
      budgetUsed: Number(r.budget_used) || 0,
      budgetRemaining: Number(r.budget_remaining) != null ? Number(r.budget_remaining) : (Number(r.budget_allocated) || 0) - (Number(r.budget_used) || 0),
      costStatus: r.budget_status === 'within_budget' ? 'Within Budget' : r.budget_status === 'at_budget_limit' ? 'At Budget Limit' : (r.budget_status || 'Within Budget'),
      breakdown: (r.cost_breakdown && Array.isArray(r.cost_breakdown) ? r.cost_breakdown : []) || [],
      grievanceText: r.grievance_text
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching cost tracking:', error);
    res.status(500).json({ error: 'Failed to fetch cost tracking' });
  }
});

// Analytics - complaints by category, by zone, monthly performance
router.get('/:depId/analytics', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const byCategory = await pool.query(
      `SELECT 
        COALESCE((category->>'primary')::text, (category#>>'{0}')::text, 'Uncategorized') as category_name,
        COUNT(*)::int as count
      FROM usergrievance
      WHERE department_id = $1
      GROUP BY category->>'primary', category#>>'{0}'
      ORDER BY count DESC
      LIMIT 20`,
      [depId]
    );
    const byZone = await pool.query(
      `SELECT 
        COALESCE(zone, ward, 'Unassigned') as zone_name,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status::text IN ('resolved', 'closed'))::int as resolved
      FROM usergrievance
      WHERE department_id = $1
      GROUP BY zone, ward
      ORDER BY total DESC
      LIMIT 20`,
      [depId]
    );
    const monthly = await pool.query(
      `SELECT 
        to_char(created_at, 'Mon YYYY') as month_label,
        to_char(created_at, 'YYYY-MM') as month_key,
        COUNT(*)::int as received,
        COUNT(*) FILTER (WHERE status::text IN ('resolved', 'closed'))::int as resolved,
        ROUND(AVG(resolution_time)::numeric, 1) as avg_time_days
      FROM usergrievance
      WHERE department_id = $1 AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY to_char(created_at, 'Mon YYYY'), to_char(created_at, 'YYYY-MM')
      ORDER BY month_key DESC
      LIMIT 12`,
      [depId]
    );
    res.json({
      success: true,
      data: {
        byCategory: byCategory.rows,
        byZone: byZone.rows,
        monthly: monthly.rows
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Staff (department officers)
router.get('/:depId/staff', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is actually department_id (UUID) now
    
    const result = await pool.query(
      `SELECT 
        dept_off.staff_id, dept_off.role, dept_off.zone, dept_off.ward, dept_off.status, dept_off.workload, dept_off.specialization,
        dept_off.performance_score, dept_off.avg_resolution_time, dept_off.total_assigned, dept_off.total_resolved,
        u.full_name, u.phone
      FROM departmentofficers dept_off
      JOIN users u ON u.id = dept_off.user_id
      WHERE dept_off.department_id = $1
      ORDER BY dept_off.staff_id`,
      [departmentId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// Equipment
router.get('/:depId/equipment', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is actually department_id (UUID) now
    
    const result = await pool.query(
      `SELECT 
        e.id, e.equipment_id, e.name, e.type, e.status, e.location, e.condition,
        e.utilization_rate, e.next_maintenance, e.last_maintenance, e.specifications,
        u.full_name as assigned_to_name, u.id as assigned_to_id
      FROM equipment e
      LEFT JOIN users u ON u.id = e.assigned_to_officer_id
      WHERE e.department_id = $1
      ORDER BY e.equipment_id`,
      [departmentId]
    );
    const data = (result.rows || []).map(r => {
      const nextDate = r.next_maintenance ? new Date(r.next_maintenance) : null;
      const lastDate = r.last_maintenance ? new Date(r.last_maintenance) : null;
      const specs = r.specifications && typeof r.specifications === 'object' ? r.specifications : (r.specifications ? { raw: r.specifications } : null);
      return {
        id: r.id,
        equipmentId: r.equipment_id,
        equipmentType: r.name || r.type || 'Equipment',
        type: r.type,
        status: r.status,
        assignedLocation: r.location || 'Unassigned',
        assignedWorker: r.assigned_to_name || null,
        condition: r.condition || 'good',
        utilizationPercentage: r.utilization_rate != null ? Number(r.utilization_rate) : 0,
        nextMaintenanceDate: nextDate ? nextDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not scheduled',
        lastMaintenanceDate: lastDate ? lastDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
        specifications: specs,
        assigned_to_id: r.assigned_to_id
      };
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// Materials
router.get('/:depId/materials', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is actually department_id (UUID) now
    
    const result = await pool.query(
      `SELECT material_id, name, available_quantity, unit, min_threshold, status, location, supplier
      FROM materialinventory
      WHERE department_id = $1
      ORDER BY material_id`,
      [departmentId]
    );
    const data = (result.rows || []).map(r => ({
      materialId: r.material_id,
      name: r.name,
      quantityAvailable: r.available_quantity != null ? Number(r.available_quantity) : 0,
      unit: r.unit || '',
      minimumThreshold: r.min_threshold != null ? Number(r.min_threshold) : 0,
      status: r.status || 'adequate',
      location: r.location || 'Central Store',
      supplier: r.supplier || ''
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// Map resource request row to frontend keys (requestId, requestType, requestDate, status, requestedBy, estimatedCost, etc.)
function mapResourceRequestToFrontend(r) {
  const id = r.id;
  const requestId = r.request_id || `REQ-${String(id || 0).padStart(3, '0')}`;
  const type = r.request_type || r.type || 'Resource';
  const requestType = type.replace(/ request$/i, '');
  const created = r.created_at ? new Date(r.created_at) : new Date();
  const requestDate = created.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const status = (r.status === 'approved' || r.status === 'Approved') ? 'Approved' : (r.status === 'rejected' || r.status === 'Rejected') ? 'Rejected' : 'Pending Approval';
  const priority = r.priority || 'Medium';
  const estimatedCost = Number(r.estimated_cost) || 0;
  return {
    id,
    requestId,
    requestType,
    requestDate,
    status,
    priority,
    requestedBy: r.requested_by_name || r.requested_by || 'Unknown',
    description: r.description || '',
    justification: r.justification || '',
    estimatedCost
  };
}

// Contractors (all; map to camelCase and ensure numbers for frontend)
router.get('/:depId/contractors', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    
    // Check if department_id column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contractors' AND column_name = 'department_id'
    `);
    
    const hasDepartmentId = columnCheck.rows.length > 0;
    
    let result;
    if (hasDepartmentId) {
      // Filter by department if column exists
      result = await pool.query(
        `SELECT 
          contractor_id, 
          company_name, 
          contact_person, 
          phone, 
          email, 
          specialization,
          performance_score, 
          active_projects, 
          completed_projects, 
          avg_completion_time, 
          contract_value,
          ai_analysis
        FROM contractors
        WHERE is_active = true AND (department_id = $1 OR department_id IS NULL)
        ORDER BY performance_score DESC NULLS LAST, company_name`,
        [depId]
      );
    } else {
      // Show all contractors if column doesn't exist yet
      result = await pool.query(
        `SELECT 
          contractor_id, 
          company_name, 
          contact_person, 
          phone, 
          email, 
          specialization,
          performance_score, 
          active_projects, 
          completed_projects, 
          avg_completion_time, 
          contract_value,
          ai_analysis
        FROM contractors
        WHERE is_active = true
        ORDER BY performance_score DESC NULLS LAST, company_name`
      );
    }
    
    const data = (result.rows || []).map(r => ({
      contractor_id: r.contractor_id,
      company_name: r.company_name || '',
      contact_person: r.contact_person || '',
      phone: r.phone || '',
      email: r.email || '',
      specialization: r.specialization || '',
      performance_score: r.performance_score != null ? Number(r.performance_score) : 0,
      active_projects: r.active_projects != null ? Number(r.active_projects) : 0,
      completed_projects: r.completed_projects != null ? Number(r.completed_projects) : 0,
      avg_completion_time: r.avg_completion_time != null ? Number(r.avg_completion_time) : 0,
      contract_value: r.contract_value != null ? Number(r.contract_value) : 0,
      ai_analysis: r.ai_analysis || {}
    }));
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching contractors:', error);
    res.status(500).json({ error: 'Failed to fetch contractors' });
  }
});

// Zone allocation - aggregate by zone only (no duplicate Zone 3/4), merge staff by zone
router.get('/:depId/zone-allocation', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is actually department_id (UUID) now
    
    const zones = await pool.query(
      `SELECT 
        COALESCE(g.zone, g.ward, 'Unassigned') as zone_name,
        COUNT(DISTINCT g.id)::int as active_grievances,
        COUNT(DISTINCT g.id) FILTER (WHERE g.status::text IN ('resolved', 'closed'))::int as resolved,
        ROUND(AVG(g.resolution_time)::numeric, 1) as avg_resolution_days
      FROM usergrievance g
      WHERE g.department_id = $1
      GROUP BY COALESCE(g.zone, g.ward, 'Unassigned')`,
      [departmentId]
    );
    
    let staffByZone = [];
    let equipmentByZone = [];
    if (departmentId) {
      const staff = await pool.query(
        `SELECT COALESCE(zone, ward, 'Unassigned') as zone_name, COUNT(*)::int as workers
         FROM departmentofficers
         WHERE department_id = $1
         GROUP BY COALESCE(zone, ward, 'Unassigned')`,
        [departmentId]
      );
      staffByZone = staff.rows;
      const equip = await pool.query(
        `SELECT COALESCE(location, 'Unassigned') as zone_name, COUNT(*)::int as equipment_count
         FROM equipment
         WHERE department_id = $1
         GROUP BY COALESCE(location, 'Unassigned')`,
        [departmentId]
      );
      equipmentByZone = equip.rows;
    }
    const data = zones.rows.map(z => {
      const staffRow = staffByZone.find(s => (s.zone_name || '') === (z.zone_name || ''));
      const equipRow = equipmentByZone.find(e => (e.zone_name || '') === (z.zone_name || ''));
      const workers = staffRow ? parseInt(staffRow.workers, 10) : 0;
      const equipment = equipRow ? parseInt(equipRow.equipment_count, 10) : 0;
      const total = workers + equipment || 1;
      const utilization = z.active_grievances > 0 ? Math.min(100, Math.round((z.active_grievances / total) * 50)) : 0;
      const status = utilization >= 90 ? 'Overloaded' : utilization <= 60 ? 'Optimal' : 'Moderate';
      const avgDays = z.avg_resolution_days != null ? Number(z.avg_resolution_days) : 0;
      return {
        zone: z.zone_name || 'Unassigned',
        zone_name: z.zone_name,
        area: z.zone_name || '',
        status,
        workers,
        equipment,
        active: z.active_grievances,
        activeGrievances: z.active_grievances,
        resolved: z.resolved,
        resolvedThisMonth: z.resolved,
        avg_resolution_days: avgDays,
        avgResolutionTime: avgDays,
        utilization,
        utilizationRate: utilization,
        resourceUtilization: utilization
      };
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching zone allocation:', error);
    res.status(500).json({ error: 'Failed to fetch zone allocation' });
  }
});

// Budget projects (tenders) - map to frontend shape with allocated/used/remaining
router.get('/:depId/budget-projects', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is actually department_id (UUID) now
    
    const result = await pool.query(
      `SELECT tender_id, title, description, estimated_value, status,
        published_date, submission_deadline, opening_date
      FROM tenders
      WHERE department_id = $1
      ORDER BY created_at DESC`,
      [departmentId]
    );
    const data = (result.rows || []).map((r, idx) => {
      const allocated = r.estimated_value != null ? Number(r.estimated_value) : 0;
      const used = Math.round(allocated * (0.25 + (idx % 3) * 0.2));
      const remaining = Math.max(0, allocated - used);
      const utilizationPct = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
      const startDate = r.published_date ? new Date(r.published_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      const endDate = r.submission_deadline ? new Date(r.submission_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      return {
        budgetId: r.tender_id,
        projectName: r.title || '',
        area: (r.description || '').slice(0, 50),
        status: r.status === 'open' ? 'On Track' : r.status === 'closed' ? 'Closed' : 'On Track',
        allocatedAmount: allocated,
        usedAmount: used,
        remainingAmount: remaining,
        utilizationPercentage: utilizationPct,
        startDate,
        expectedEndDate: endDate
      };
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching budget projects:', error);
    res.status(500).json({ error: 'Failed to fetch budget projects' });
  }
});

// Resource requests - fetch from resourcerequests table or return sample data
router.get('/:depId/resource-requests', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is actually department_id (UUID) now
    
    let requests = [];
    
    // Try to fetch from resourcerequests table if it exists
    try {
      const result = await pool.query(
        `SELECT 
          id,
          request_id,
          request_type,
          requested_by_name,
          requested_by_id,
          description,
          justification,
          priority,
          status,
          estimated_cost,
          created_at,
          updated_at
        FROM resourcerequests 
        WHERE department_id = $1 
        ORDER BY created_at DESC`,
        [departmentId]
      );
      
      requests = result.rows;
    } catch (tableErr) {
      // Table doesn't exist or error: return sample data for any department
      requests = [
        { id: 1, request_id: 'REQ-001', request_type: 'Staff', requested_by_name: 'Priya Sharma', description: 'Need 5 additional field workers for Ward 15', justification: 'Current workload exceeds capacity by 40%', priority: 'High', status: 'pending', estimated_cost: 500000, created_at: '2024-02-12T00:00:00Z' },
        { id: 2, request_id: 'REQ-002', request_type: 'Equipment', requested_by_name: 'Rajesh Patil', description: 'Need 2 additional excavators', justification: 'Multiple pipeline projects running simultaneously', priority: 'Medium', status: 'pending', estimated_cost: 3000000, created_at: '2024-02-13T00:00:00Z' },
        { id: 3, request_id: 'REQ-003', request_type: 'Material', requested_by_name: 'Sneha Kulkarni', description: 'Urgent: 500 meters of 150mm PVC pipes', justification: 'Current stock below minimum threshold', priority: 'Critical', status: 'approved', estimated_cost: 140000, created_at: '2024-02-10T00:00:00Z' }
      ];
    }
    const data = (requests || []).map(r => mapResourceRequestToFrontend(r));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching resource requests:', error);
    res.status(500).json({ error: 'Failed to fetch resource requests' });
  }
});

// Escalations: grievanceescalations + repeatgrievancepatterns for dep
router.get('/:depId/escalations', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is actually department_id (UUID) now
    
    const [escResult, repeatResult] = await Promise.all([
      pool.query(
        `SELECT e.id, e.grievance_id, e.escalation_level, e.reason, e.action_taken, e.overdue_hours, e.next_escalation_at, e.created_at,
          g.grievance_id as grievance_display_id,
          u_to.full_name as escalated_to_name, u_to.id as escalated_to_id
         FROM grievanceescalations e
         JOIN usergrievance g ON g.id = e.grievance_id AND g.department_id = $1
         JOIN users u_to ON u_to.id = e.escalated_to_officer_id
         ORDER BY e.created_at DESC
         LIMIT 20`,
        [departmentId]
      ),
      pool.query(
        `SELECT id, zone, area, issue_type, complaint_count, affected_citizens, time_period_days, priority, pattern_description, ai_recommendation, estimated_cost, estimated_savings
         FROM repeatgrievancepatterns
         WHERE is_addressed = false
         ORDER BY CASE priority WHEN 'Emergency' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END, complaint_count DESC
         LIMIT 10`
      )
    ]);
    const repeatPatterns = (repeatResult.rows || []).map(r => {
      const cost = r.estimated_cost != null ? Number(r.estimated_cost) : 0;
      const savings = r.estimated_savings != null ? Number(r.estimated_savings) : 0;
      const days = r.time_period_days != null ? Number(r.time_period_days) : 30;
      return {
        id: r.id,
        area: r.area || r.zone || 'Unassigned',
        zone: r.zone,
        priority: (r.priority || 'Medium').replace(/^\w/, c => c.toUpperCase()),
        count: r.complaint_count != null ? Number(r.complaint_count) : 0,
        category: r.issue_type || 'Complaint',
        timeframe: `last ${days} days`,
        affectedCitizens: r.affected_citizens != null ? Number(r.affected_citizens) : 0,
        pattern: r.pattern_description || '',
        aiRecommendation: r.ai_recommendation || '',
        estimatedCost: cost >= 100000 ? `₹${(cost / 100000).toFixed(2)} Lakh` : cost > 0 ? `₹${cost.toLocaleString()}` : '—',
        estimatedSavings: savings >= 100000 ? `₹${(savings / 100000).toFixed(2)} Lakh` : savings > 0 ? `₹${savings.toLocaleString()}` : '—'
      };
    });
    res.json({
      success: true,
      data: {
        escalations: escResult.rows,
        repeatPatterns
      }
    });
  } catch (error) {
    console.error('Error fetching escalations:', error);
    res.status(500).json({ error: 'Failed to fetch escalations' });
  }
});

// AI Insights for department (via grievances in dep)
router.get('/:depId/ai-insights', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const result = await pool.query(
      `SELECT a.id, a.insight_type, a.priority, a.confidence_score, a.title, a.description, a.ai_explanation, a.recommended_action, a.metrics, a.is_accepted, a.is_dismissed,
        g.grievance_id as grievance_display_id
       FROM aiinsights a
       LEFT JOIN usergrievance g ON g.id = a.grievance_id AND g.department_id = $1
       WHERE g.id IS NOT NULL OR a.grievance_id IS NULL
       ORDER BY CASE a.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END, a.created_at DESC
       LIMIT 20`,
      [depId]
    );
    // Also get insights that are not linked to a grievance but we want to show (e.g. pattern detection)
    const depAgnostic = await pool.query(
      `SELECT id, insight_type, priority, confidence_score, title, description, ai_explanation, recommended_action, metrics, is_accepted, is_dismissed
       FROM aiinsights WHERE grievance_id IS NULL ORDER BY created_at DESC LIMIT 10`
    );
    const byDep = result.rows.filter(r => r.grievance_display_id);
    const combined = [...byDep];
    const seen = new Set(byDep.map(r => r.id));
    depAgnostic.rows.forEach(r => { if (!seen.has(r.id)) { seen.add(r.id); combined.push({ ...r, grievance_display_id: null }); } });
    // Map to frontend shape and dedupe by message so same insight does not repeat
    const messageSeen = new Set();
    const mapped = combined.map((r) => {
      const score = r.confidence_score != null ? Number(r.confidence_score) : 0;
      const confidence = score <= 1 ? score : score / 100;
      const message = (r.description || r.title || '').trim();
      return {
        id: r.id,
        insight_type: r.insight_type,
        type: (r.insight_type || r.title || 'Insight').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        priority: (r.priority || 'Medium').replace(/^\w/, c => c.toUpperCase()),
        confidence: Number.isFinite(confidence) ? confidence : 0,
        message: message || 'No description',
        recommendation: r.recommended_action || '',
        recommendedAction: r.recommended_action || '',
        explanations: r.ai_explanation && typeof r.ai_explanation === 'object' ? r.ai_explanation : (r.metrics ? { reasons: [], dataPoints: r.metrics } : null)
      };
    });
    const data = mapped.filter((r) => {
      const key = `${r.message}|${r.recommendation}`;
      if (messageSeen.has(key)) return false;
      messageSeen.add(key);
      return true;
    }).slice(0, 10);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    res.status(500).json({ error: 'Failed to fetch AI insights' });
  }
});

// Citizen feedback (grievancefeedback for department grievances) with category-wise support
router.get('/:depId/citizen-feedback', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const result = await pool.query(
      `SELECT f.id, f.grievance_id, f.rating, f.feedback_text, f.additional_comments, f.would_recommend, f.satisfaction_level, f.created_at,
        g.grievance_id as grievance_display_id, g.grievance_text, g.category as grievance_category, g.extracted_address as grievance_location,
        c.full_name as citizen_name
       FROM grievancefeedback f
       JOIN usergrievance g ON g.id = f.grievance_id AND g.department_id = $1
       JOIN citizens c ON c.id = f.citizen_id
       ORDER BY f.created_at DESC
       LIMIT 100`,
      [depId]
    );
    const summary = await pool.query(
      `SELECT
        COUNT(*)::int as total,
        ROUND(AVG(f.rating)::numeric, 1) as avg_rating,
        COUNT(*) FILTER (WHERE f.rating >= 4)::int as positive,
        COUNT(*) FILTER (WHERE f.rating <= 2)::int as negative,
        COUNT(*) FILTER (WHERE f.rating = 3)::int as neutral
       FROM grievancefeedback f
       JOIN usergrievance g ON g.id = f.grievance_id AND g.department_id = $1`,
      [depId]
    );
    const catCounts = await pool.query(
      `SELECT
        COALESCE((g.category->>'primary')::text, (g.category#>>'{0}')::text, 'Uncategorized') as category_name,
        COUNT(*)::int as count
       FROM grievancefeedback f
       JOIN usergrievance g ON g.id = f.grievance_id AND g.department_id = $1
       GROUP BY g.category->>'primary', g.category#>>'{0}'
       ORDER BY count DESC`,
      [depId]
    );
    const s = summary.rows[0] || {};
    const total = Number(s.total) || 0;
    const posPct = total ? Math.round((Number(s.positive) / total) * 100) : 0;
    const negPct = total ? Math.round((Number(s.negative) / total) * 100) : 0;
    const neuPct = total ? Math.round((Number(s.neutral) / total) * 100) : 0;
    const avgRating = s.avg_rating != null ? parseFloat(s.avg_rating) : 0;
    const extractCategory = (cat) => {
      if (!cat) return 'Uncategorized';
      if (typeof cat === 'string') return cat.trim() || 'Uncategorized';
      return (cat.primary || cat.name || cat.category || 'Uncategorized');
    };
    const data = (result.rows || []).map((r) => {
      const category = extractCategory(r.grievance_category);
      const rating = Number(r.rating) || 0;
      let aiSuggestion = 'Follow up on similar grievances for consistent resolution.';
      if (rating >= 4) aiSuggestion = 'Similar issues can be prevented with regular maintenance and timely response.';
      else if (rating <= 2) aiSuggestion = 'Consider automating task delegation and escalation to reduce resolution time.';
      else aiSuggestion = 'Use durable materials and preventive measures for long-term repair.';
      return {
        id: r.id,
        grievanceId: r.grievance_display_id,
        grievanceText: (r.grievance_text || '').trim() || null,
        rating,
        feedbackText: r.feedback_text || '',
        citizenName: r.citizen_name || 'Anonymous',
        location: r.grievance_location || '',
        category,
        submittedDate: r.created_at,
        satisfactionStatus: r.satisfaction_level || '',
        wouldRecommend: r.would_recommend,
        additionalComments: r.additional_comments,
        aiSuggestion
      };
    });
    const categories = (catCounts.rows || []).map((r) => ({
      category: r.category_name || 'Uncategorized',
      count: parseInt(r.count, 10) || 0
    }));
    res.json({
      success: true,
      data,
      categories,
      summary: {
        total,
        avgRating,
        averageRating: avgRating,
        positive: posPct,
        negative: negPct,
        neutral: neuPct,
        positiveFeedbackPercent: posPct,
        negativeFeedbackPercent: negPct,
        neutralFeedbackPercent: neuPct
      }
    });
  } catch (error) {
    console.error('Error fetching citizen feedback:', error);
    res.status(500).json({ error: 'Failed to fetch citizen feedback' });
  }
});

// Predictive maintenance - Grievance cost predictions based on historical analysis
router.get('/:depId/predictive-maintenance', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId;
    
    // Get active/in-progress grievances for the department
    const result = await pool.query(
      `SELECT 
        g.id,
        g.grievance_id,
        g.category,
        g.status,
        g.priority,
        g.created_at,
        g.extracted_address as location,
        g.zone,
        g.ward
       FROM usergrievance g
       WHERE g.department_id = $1 
         AND g.status::text IN ('submitted', 'pending', 'in_progress', 'assigned')
       ORDER BY 
         CASE g.priority 
           WHEN 'Emergency' THEN 1 
           WHEN 'Urgent' THEN 2 
           WHEN 'High' THEN 3 
           WHEN 'Medium' THEN 4 
           ELSE 5 
         END,
         g.created_at DESC
       LIMIT 20`,
      [departmentId]
    );
    
    // For each grievance, analyze similar historical cases to predict cost, resources, and time
    const predictions = await Promise.all(result.rows.map(async (grievance) => {
      try {
        // Get category for comparison
        const category = typeof grievance.category === 'object' 
          ? grievance.category.primary 
          : (typeof grievance.category === 'string' && grievance.category.startsWith('{') 
            ? JSON.parse(grievance.category).primary 
            : grievance.category);
        
        // Find similar resolved grievances (same category, same zone/ward if available)
        const similarQuery = `
          SELECT 
            COUNT(*) as similar_count,
            AVG(resolution_time) as avg_time,
            AVG(CASE 
              WHEN estimated_cost IS NOT NULL THEN estimated_cost 
              ELSE 25000 
            END) as avg_cost
          FROM usergrievance
          WHERE department_id = $1
            AND status::text IN ('resolved', 'closed')
            AND (
              (category::text ILIKE $2) OR
              (category->>'primary' ILIKE $2)
            )
            ${grievance.zone ? 'AND zone = $3' : ''}
        `;
        
        const similarParams = grievance.zone 
          ? [departmentId, `%${category}%`, grievance.zone]
          : [departmentId, `%${category}%`];
        
        const similarResult = await pool.query(similarQuery, similarParams);
        const similarData = similarResult.rows[0];
        
        const similarCount = parseInt(similarData.similar_count) || 0;
        const avgTime = parseFloat(similarData.avg_time) || 3;
        const avgCost = parseFloat(similarData.avg_cost) || 25000;
        
        // Calculate confidence based on number of similar cases
        const confidence = Math.min(95, 50 + (similarCount * 3));
        
        // Determine resources based on category and cost
        let resources = '2 workers, 1 vehicle, standard tools';
        if (avgCost > 50000) {
          resources = '3-4 workers, 2 vehicles, specialized equipment';
        } else if (avgCost > 30000) {
          resources = '2-3 workers, 1 vehicle, tools and materials';
        } else if (avgCost < 15000) {
          resources = '1-2 workers, basic tools';
        }
        
        // Generate AI recommendation
        let aiRecommendation = `Based on ${similarCount} similar cases: `;
        if (similarCount > 10) {
          aiRecommendation += `High confidence prediction. Average cost ₹${(avgCost/1000).toFixed(1)}K, time ${avgTime.toFixed(1)} days. ${
            avgCost > 40000 ? 'Consider contractor involvement for cost efficiency.' : 'Internal team can handle efficiently.'
          }`;
        } else if (similarCount > 5) {
          aiRecommendation += `Moderate confidence. Estimated cost ₹${(avgCost/1000).toFixed(1)}K, time ${avgTime.toFixed(1)} days. Monitor progress closely.`;
        } else {
          aiRecommendation += `Limited historical data. Estimated cost ₹${(avgCost/1000).toFixed(1)}K, time ${avgTime.toFixed(1)} days. Allocate resources conservatively.`;
        }
        
        return {
          id: grievance.id,
          grievanceId: grievance.grievance_id,
          category: category || 'General',
          status: grievance.status,
          priority: grievance.priority || 'Medium',
          predictedCost: Math.round(avgCost),
          resources: resources,
          estimatedTime: Math.ceil(avgTime),
          confidence: Math.round(confidence),
          similarCases: similarCount,
          aiRecommendation: aiRecommendation,
          location: grievance.location || 'N/A',
          zone: grievance.zone || 'N/A',
          createdAt: grievance.created_at
        };
      } catch (err) {
        console.error('Error analyzing grievance:', grievance.grievance_id, err);
        // Return default prediction if analysis fails
        return {
          id: grievance.id,
          grievanceId: grievance.grievance_id,
          category: 'General',
          status: grievance.status,
          priority: grievance.priority || 'Medium',
          predictedCost: 25000,
          resources: '2 workers, 1 vehicle, standard tools',
          estimatedTime: 3,
          confidence: 50,
          similarCases: 0,
          aiRecommendation: 'Insufficient historical data for accurate prediction',
          location: grievance.location || 'N/A',
          zone: grievance.zone || 'N/A',
          createdAt: grievance.created_at
        };
      }
    }));
    
    res.json({ success: true, data: predictions });
  } catch (error) {
    console.error('Error fetching grievance predictions:', error);
    res.status(500).json({ error: 'Failed to fetch grievance predictions' });
  }
});

// Knowledge base (departmentknowledgebase)
router.get('/:depId/knowledge-base', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is actually department_id (UUID) now
    
    const result = await pool.query(
      `SELECT id, title, description, file_name, file_url, file_type, file_size, category, created_at
       FROM departmentknowledgebase
       WHERE department_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [departmentId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge base' });
  }
});

// Upload document to department knowledge base
router.post('/:depId/knowledge-base/upload', authenticate, verifyDepartmentAccess, upload.single('document'), async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const { title, description, category } = req.body;

    // Create department-specific path: knowledgebase/department/{department_id}/{timestamp}_{filename}
    const fileName = `knowledgebase/department/${departmentId}/${Date.now()}_${file.originalname}`;

    // Upload to Azure Blob Storage
    const uploadResult = await azureStorageService.uploadFile(file.path, fileName);

    // Store in database
    const result = await pool.query(
      `INSERT INTO departmentknowledgebase (
        title, 
        description,
        file_name, 
        file_url, 
        file_type, 
        file_size,
        category,
        uploaded_by_officer_id, 
        department_id
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        title || file.originalname,
        description || 'Processing document...',
        file.originalname,
        uploadResult.url,
        file.mimetype,
        file.size,
        category || 'General',
        req.user.id,
        departmentId
      ]
    );

    // Send to Azure Queue for processing if it's a PDF
    if (file.mimetype === 'application/pdf') {
      await azureKnowledgeBaseQueueService.sendMessage({
        type: 'pdf_upload',
        id: result.rows[0].id,
        url: uploadResult.url,
        fileName: fileName,
        originalName: file.originalname,
        uploadedBy: req.user.id,
        departmentId: departmentId,
        uploadedAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Generate shareable link for a document
router.post('/:depId/knowledge-base/:docId/generate-link', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId, docId } = req.params;
    const { expiryMinutes = 60 } = req.body;

    // Get document details and verify it belongs to the department
    const result = await pool.query(
      'SELECT * FROM departmentknowledgebase WHERE id = $1 AND department_id = $2',
      [docId, depId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = result.rows[0];

    // Extract blob name from URL
    const url = new URL(document.file_url);
    const blobName = url.pathname.substring(url.pathname.indexOf('/') + 1);

    // Generate SAS URL
    const sasUrl = await azureStorageService.generateSasUrl(blobName, expiryMinutes);

    res.json({
      success: true,
      data: {
        shareableLink: sasUrl,
        expiresIn: expiryMinutes,
        expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Generate shareable link error:', error);
    res.status(500).json({ error: 'Failed to generate shareable link' });
  }
});

// Officers (staff with email for Officers tab)
router.get('/:depId/officers', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is actually department_id (UUID) now
    
    const result = await pool.query(
      `SELECT dept_off.staff_id, dept_off.role, dept_off.zone, dept_off.status, dept_off.workload,
        dept_off.performance_score, dept_off.avg_resolution_time, dept_off.total_assigned, dept_off.total_resolved,
        u.full_name, u.phone, u.email
       FROM departmentofficers dept_off
       JOIN users u ON u.id = dept_off.user_id
       WHERE dept_off.department_id = $1
       ORDER BY dept_off.staff_id`,
      [departmentId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching officers:', error);
    res.status(500).json({ error: 'Failed to fetch officers' });
  }
});

// Audit logs (actor in department)
router.get('/:depId/audit-logs', authenticate, verifyDepartmentAccess, async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is actually department_id (UUID) now

    let result;
    try {
      result = await pool.query(
        `SELECT a.id, a.timestamp, a.actor_name, a.actor_role, a.action, a.entity_type, a.entity_id, a.details
         FROM auditlog a
         WHERE a.actor_id IN (SELECT id FROM users WHERE department_id = $1)
         ORDER BY a.timestamp DESC
         LIMIT 100`,
        [departmentId]
      );
    } catch (colError) {
      // If query fails, try fallback with department_id
      if (departmentId) {
        result = await pool.query(
          `SELECT a.id, a.timestamp, a.actor_name, a.actor_role, a.action, a.entity_type, a.entity_id, a.details
           FROM auditlog a
           WHERE a.actor_id IN (SELECT id FROM users WHERE department_id = $1)
           ORDER BY a.timestamp DESC
           LIMIT 100`,
          [departmentId]
        );
      } else {
        result = { rows: [] };
      }
    }
    
    const rows = result.rows.map(r => ({
      ...r,
      details_text: r.details && typeof r.details === 'object' ? r.details.description || r.details.details || JSON.stringify(r.details) : (r.details || '')
    }));
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
