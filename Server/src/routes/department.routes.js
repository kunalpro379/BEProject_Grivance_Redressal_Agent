import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get department dashboard overview by dep_id (MUST BE BEFORE /:departmentId)
router.get('/:depId/dashboard/overview', authenticate, async (req, res) => {
  try {
    const { depId } = req.params;
    
    // Verify user has access to this department
    if (req.user.dep_id !== depId) {
      return res.status(403).json({ error: 'Access denied to this department' });
    }

    // Get overview metrics
    const overviewQuery = `
      SELECT * FROM department_overview_metrics 
      WHERE dep_id = $1 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    const overview = await pool.query(overviewQuery, [depId]);

    if (overview.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No data available yet'
      });
    }

    res.json({
      success: true,
      data: overview.rows[0]
    });
  } catch (error) {
    console.error('Error fetching department overview:', error);
    res.status(500).json({ error: 'Failed to fetch department overview' });
  }
});

// Get resource health
router.get('/:departmentId/dashboard/resources', authenticate, async (req, res) => {
  try {
    const { departmentId } = req.params;

    const resourceQuery = `
      SELECT * FROM department_resource_health 
      WHERE department_id = $1 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    const resources = await pool.query(resourceQuery, [departmentId]);

    if (resources.rows.length === 0) {
      return res.status(404).json({ error: 'Resource data not found' });
    }

    res.json({
      success: true,
      data: resources.rows[0]
    });
  } catch (error) {
    console.error('Error fetching resource health:', error);
    res.status(500).json({ error: 'Failed to fetch resource health' });
  }
});

// Get tender and project status
router.get('/:departmentId/dashboard/tenders-projects', authenticate, async (req, res) => {
  try {
    const { departmentId } = req.params;

    const tenderQuery = `
      SELECT * FROM department_tender_project_status 
      WHERE department_id = $1 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    const tenders = await pool.query(tenderQuery, [departmentId]);

    if (tenders.rows.length === 0) {
      return res.status(404).json({ error: 'Tender/project data not found' });
    }

    res.json({
      success: true,
      data: tenders.rows[0]
    });
  } catch (error) {
    console.error('Error fetching tender/project status:', error);
    res.status(500).json({ error: 'Failed to fetch tender/project status' });
  }
});

// Get zone performance
router.get('/:departmentId/dashboard/zone-performance', authenticate, async (req, res) => {
  try {
    const { departmentId } = req.params;

    const zoneQuery = `
      SELECT * FROM zone_performance_metrics 
      WHERE department_id = $1 
      ORDER BY zone
    `;
    const zones = await pool.query(zoneQuery, [departmentId]);

    res.json({
      success: true,
      data: zones.rows
    });
  } catch (error) {
    console.error('Error fetching zone performance:', error);
    res.status(500).json({ error: 'Failed to fetch zone performance' });
  }
});

// Get grievance trends
router.get('/:departmentId/dashboard/grievance-trends', authenticate, async (req, res) => {
  try {
    const { departmentId } = req.params;

    // Get daily trends (last 30 days)
    const dailyQuery = `
      SELECT * FROM grievance_daily_trends 
      WHERE department_id = $1 
      ORDER BY trend_date DESC 
      LIMIT 30
    `;
    const daily = await pool.query(dailyQuery, [departmentId]);

    // Get category stats
    const categoryQuery = `
      SELECT * FROM grievance_category_stats 
      WHERE department_id = $1 
      ORDER BY grievance_count DESC
    `;
    const categories = await pool.query(categoryQuery, [departmentId]);

    // Get zone stats
    const zoneQuery = `
      SELECT * FROM grievance_zone_stats 
      WHERE department_id = $1 
      ORDER BY grievance_count DESC
    `;
    const zones = await pool.query(zoneQuery, [departmentId]);

    res.json({
      success: true,
      data: {
        daily: daily.rows,
        byCategory: categories.rows,
        byZone: zones.rows
      }
    });
  } catch (error) {
    console.error('Error fetching grievance trends:', error);
    res.status(500).json({ error: 'Failed to fetch grievance trends' });
  }
});

// Get AI insights
router.get('/:departmentId/dashboard/ai-insights', authenticate, async (req, res) => {
  try {
    const { departmentId } = req.params;

    const insightsQuery = `
      SELECT * FROM department_ai_insights 
      WHERE department_id = $1 AND is_active = true
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    const insights = await pool.query(insightsQuery, [departmentId]);

    res.json({
      success: true,
      data: insights.rows
    });
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    res.status(500).json({ error: 'Failed to fetch AI insights' });
  }
});

// Get alerts
router.get('/:departmentId/dashboard/alerts', authenticate, async (req, res) => {
  try {
    const { departmentId } = req.params;

    const alertsQuery = `
      SELECT * FROM department_alerts 
      WHERE department_id = $1 AND is_active = true AND is_resolved = false
      ORDER BY 
        CASE severity 
          WHEN 'Critical' THEN 1 
          WHEN 'High' THEN 2 
          WHEN 'Medium' THEN 3 
          WHEN 'Low' THEN 4 
        END,
        created_at DESC
    `;
    const alerts = await pool.query(alertsQuery, [departmentId]);

    res.json({
      success: true,
      data: alerts.rows
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get activity feed
router.get('/:departmentId/dashboard/activity-feed', authenticate, async (req, res) => {
  try {
    const { departmentId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const activityQuery = `
      SELECT * FROM department_activity_feed 
      WHERE department_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const activities = await pool.query(activityQuery, [departmentId, limit]);

    res.json({
      success: true,
      data: activities.rows
    });
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// Get department health score
router.get('/:departmentId/dashboard/health-score', authenticate, async (req, res) => {
  try {
    const { departmentId } = req.params;

    const healthQuery = `
      SELECT * FROM department_health_score 
      WHERE department_id = $1 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    const health = await pool.query(healthQuery, [departmentId]);

    if (health.rows.length === 0) {
      return res.status(404).json({ error: 'Health score not found' });
    }

    res.json({
      success: true,
      data: health.rows[0]
    });
  } catch (error) {
    console.error('Error fetching health score:', error);
    res.status(500).json({ error: 'Failed to fetch health score' });
  }
});

// Get complete dashboard data (all in one)
router.get('/:departmentId/dashboard/complete', authenticate, async (req, res) => {
  try {
    const { departmentId } = req.params;

    // Fetch all dashboard data in parallel
    const overviewQuery = 'SELECT * FROM department_overview_metrics WHERE department_id = $1 ORDER BY updated_at DESC LIMIT 1';
    const resourceQuery = 'SELECT * FROM department_resource_health WHERE department_id = $1 ORDER BY updated_at DESC LIMIT 1';
    const tenderQuery = 'SELECT * FROM department_tender_project_status WHERE department_id = $1 ORDER BY updated_at DESC LIMIT 1';
    const zoneQuery = 'SELECT * FROM zone_performance_metrics WHERE department_id = $1 ORDER BY zone';
    const dailyQuery = 'SELECT * FROM grievance_daily_trends WHERE department_id = $1 ORDER BY trend_date DESC LIMIT 30';
    const categoryQuery = 'SELECT * FROM grievance_category_stats WHERE department_id = $1 ORDER BY grievance_count DESC';
    const zoneStatsQuery = 'SELECT * FROM grievance_zone_stats WHERE department_id = $1 ORDER BY grievance_count DESC';
    const insightsQuery = 'SELECT * FROM department_ai_insights WHERE department_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 10';
    const alertsQuery = 'SELECT * FROM department_alerts WHERE department_id = $1 AND is_active = true AND is_resolved = false ORDER BY CASE severity WHEN \'Critical\' THEN 1 WHEN \'High\' THEN 2 WHEN \'Medium\' THEN 3 WHEN \'Low\' THEN 4 END, created_at DESC';
    const activityQuery = 'SELECT * FROM department_activity_feed WHERE department_id = $1 ORDER BY created_at DESC LIMIT 20';
    const healthQuery = 'SELECT * FROM department_health_score WHERE department_id = $1 ORDER BY updated_at DESC LIMIT 1';

    const [
      overview,
      resources,
      tenders,
      zones,
      dailyTrends,
      categories,
      zoneStats,
      insights,
      alerts,
      activities,
      health
    ] = await Promise.all([
      pool.query(overviewQuery, [departmentId]),
      pool.query(resourceQuery, [departmentId]),
      pool.query(tenderQuery, [departmentId]),
      pool.query(zoneQuery, [departmentId]),
      pool.query(dailyQuery, [departmentId]),
      pool.query(categoryQuery, [departmentId]),
      pool.query(zoneStatsQuery, [departmentId]),
      pool.query(insightsQuery, [departmentId]),
      pool.query(alertsQuery, [departmentId]),
      pool.query(activityQuery, [departmentId]),
      pool.query(healthQuery, [departmentId])
    ]);

    res.json({
      success: true,
      data: {
        grievanceOverview: overview.rows[0] || null,
        resourceHealth: resources.rows[0] || null,
        tenderProjectStatus: tenders.rows[0] || null,
        zonePerformance: zones.rows,
        grievanceTrends: {
          daily: dailyTrends.rows,
          byCategory: categories.rows,
          byZone: zoneStats.rows
        },
        aiInsights: insights.rows,
        alertsRiskMonitoring: alerts.rows,
        recentActivityFeed: activities.rows,
        departmentHealthScore: health.rows[0] || null
      }
    });
  } catch (error) {
    console.error('Error fetching complete dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch complete dashboard data' });
  }
});

// Get department officer details by user ID
router.get('/officer/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const officerQuery = `
      SELECT 
        do_table.id,
        do_table.user_id,
        do_table.department_id,
        do_table.staff_id,
        do_table.role,
        do_table.zone,
        do_table.ward,
        do_table.specialization,
        do_table.status,
        do_table.workload,
        do_table.performance_score,
        d.name as department_name,
        d.address as department_address
      FROM departmentofficers do_table
      LEFT JOIN departments d ON do_table.department_id = d.id
      WHERE do_table.user_id = $1
    `;
    const result = await pool.query(officerQuery, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Officer not found' });
    }

    res.json({
      success: true,
      officer: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching officer details:', error);
    res.status(500).json({ error: 'Failed to fetch officer details' });
  }
});

// Get department details by ID (MUST BE AT THE END - catches all /:departmentId paths)
router.get('/:departmentId', authenticate, async (req, res) => {
  try {
    const { departmentId } = req.params;

    const departmentQuery = `
      SELECT id, name, description, contact_email, contact_phone, address, 
             is_active, budget_allocated, budget_used, total_grievances, 
             resolved_grievances, avg_resolution_time, performance_score
      FROM departments 
      WHERE id = $1
    `;
    const result = await pool.query(departmentQuery, [departmentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({
      success: true,
      department: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching department details:', error);
    res.status(500).json({ error: 'Failed to fetch department details' });
  }
});

export default router;

