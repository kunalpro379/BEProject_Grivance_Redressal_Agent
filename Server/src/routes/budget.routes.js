import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// NOTE: depId parameter in routes is the department UUID (id), not dep_id field
// It comes from the URL: /api/budget/:depId/...
// No need to lookup - use it directly as department_id in queries

// =====================================================
// 1. BUDGET OVERVIEW - Top Summary Cards
// =====================================================
router.get('/:depId/overview', async (req, res) => {
  try {
    const { depId } = req.params;

    // depId is actually the department UUID from the URL
    const departmentId = depId;

    // Get current financial year
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const financialYear = currentDate.getMonth() >= 3 ? `${currentYear}-${(currentYear + 1) % 100}` : `${currentYear - 1}-${currentYear % 100}`;

    // Get budget analytics
    const analyticsResult = await pool.query(
      `SELECT * FROM budget_usage_analytics 
       WHERE department_id = $1 AND financial_year = $2
       ORDER BY created_at DESC LIMIT 1`,
      [departmentId, financialYear]
    );

    // Get total allocations
    const allocationsResult = await pool.query(
      `SELECT 
        SUM(allocation_amount) as total_allocated,
        COUNT(*) as allocation_count
       FROM budget_allocations 
       WHERE department_id = $1 AND financial_year = $2 AND status = 'Active'`,
      [departmentId, financialYear]
    );

    // Get total usage from cost tracking
    const usageResult = await pool.query(
      `SELECT 
        SUM(total_cost) as total_used,
        SUM(labor_cost) as labor_total,
        SUM(material_cost) as material_total,
        SUM(equipment_cost) as equipment_total,
        SUM(transport_cost) as transport_total,
        SUM(contractor_cost) as contractor_total,
        COUNT(*) as grievances_funded,
        AVG(total_cost) as avg_cost_per_grievance
       FROM grievancecosttracking gct
       JOIN usergrievance ug ON gct.grievance_id = ug.id
       WHERE ug.department_id = $1 
       AND EXTRACT(YEAR FROM gct.created_at) >= $2`,
      [departmentId, parseInt(financialYear.split('-')[0])]
    );

    // Get resolved grievances count (using workflow status since enum doesn't have resolved/closed)
    const resolvedResult = await pool.query(
      `SELECT COUNT(*) as resolved_count
       FROM usergrievance 
       WHERE department_id = $1 
       AND (workflow->>'status' = 'completed' OR workflow->>'current_stage' = 'resolved')
       AND EXTRACT(YEAR FROM created_at) >= $2`,
      [departmentId, parseInt(financialYear.split('-')[0])]
    );

    // Get emergency reserve (20% of total allocation)
    const totalAllocated = parseFloat(allocationsResult.rows[0]?.total_allocated || 0);
    const totalUsed = parseFloat(usageResult.rows[0]?.total_used || 0);
    const emergencyReserve = totalAllocated * 0.20;
    const remaining = totalAllocated - totalUsed;
    const utilization = totalAllocated > 0 ? ((totalUsed / totalAllocated) * 100).toFixed(2) : 0;

    const overview = {
      totalBudgetAllocated: totalAllocated,
      budgetUsed: totalUsed,
      budgetRemaining: remaining,
      budgetUtilization: parseFloat(utilization),
      grievancesFunded: parseInt(usageResult.rows[0]?.grievances_funded || 0),
      grievancesResolved: parseInt(resolvedResult.rows[0]?.resolved_count || 0),
      avgCostPerGrievance: parseFloat(usageResult.rows[0]?.avg_cost_per_grievance || 0),
      currentFinancialYear: financialYear,
      emergencyReserveBudget: emergencyReserve,
      costDistribution: {
        labor: parseFloat(usageResult.rows[0]?.labor_total || 0),
        material: parseFloat(usageResult.rows[0]?.material_total || 0),
        equipment: parseFloat(usageResult.rows[0]?.equipment_total || 0),
        transport: parseFloat(usageResult.rows[0]?.transport_total || 0),
        contractor: parseFloat(usageResult.rows[0]?.contractor_total || 0),
      },
      analytics: analyticsResult.rows[0] || null,
    };

    res.json({ success: true, data: overview });
  } catch (error) {
    console.error('Error fetching budget overview:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// =====================================================
// 2. BUDGET ALLOCATIONS - Government Controlled
// =====================================================
router.get('/:depId/allocations', async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is the department UUID

    const result = await pool.query(
      `SELECT 
        ba.*,
        (SELECT COUNT(*) FROM budget_documents WHERE allocation_id = ba.id) as document_count
       FROM budget_allocations ba
       WHERE ba.department_id = $1
       ORDER BY ba.allocation_date DESC`,
      [departmentId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching budget allocations:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// Create new budget allocation
router.post('/:depId/allocations', async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is the department UUID
    const {
      allocation_id,
      allocation_amount,
      allocation_date,
      financial_year,
      scheme_name,
      allocation_purpose,
      allocated_by,
      approval_authority,
      budget_type,
      budget_source,
      remarks
    } = req.body;

    const result = await pool.query(
      `INSERT INTO budget_allocations (
        allocation_id, department_id, allocation_amount, allocation_date,
        financial_year, scheme_name, allocation_purpose, allocated_by,
        approval_authority, budget_type, budget_source, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        allocation_id, departmentId, allocation_amount, allocation_date,
        financial_year, scheme_name, allocation_purpose, allocated_by,
        approval_authority, budget_type, budget_source, remarks
      ]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating budget allocation:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// =====================================================
// 3. BUDGET DOCUMENTS - Proof Upload
// =====================================================
router.get('/:depId/documents', async (req, res) => {
  try {
    const { depId } = req.params;
    const { allocation_id, grievance_id } = req.query;

    let query = `
      SELECT bd.*, u.full_name as uploaded_by_full_name
      FROM budget_documents bd
      LEFT JOIN users u ON bd.uploaded_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (allocation_id) {
      params.push(allocation_id);
      query += ` AND bd.allocation_id = $${params.length}`;
    }

    if (grievance_id) {
      params.push(grievance_id);
      query += ` AND bd.grievance_id = $${params.length}`;
    }

    query += ' ORDER BY bd.created_at DESC';

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching budget documents:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// Upload budget document
router.post('/:depId/documents', async (req, res) => {
  try {
    const { depId } = req.params;
    const {
      allocation_id,
      grievance_id,
      document_type,
      document_name,
      file_url,
      file_type,
      file_size,
      uploaded_by,
      uploaded_by_name
    } = req.body;

    const result = await pool.query(
      `INSERT INTO budget_documents (
        allocation_id, grievance_id, document_type, document_name,
        file_url, file_type, file_size, uploaded_by, uploaded_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        allocation_id, grievance_id, document_type, document_name,
        file_url, file_type, file_size, uploaded_by, uploaded_by_name
      ]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error uploading budget document:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// =====================================================
// 4. BUDGET USAGE BREAKDOWN - Grievance-wise
// =====================================================
router.get('/:depId/usage-breakdown', async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is the department UUID
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT 
        gct.*,
        ug.grievance_id as grievance_display_id,
        COALESCE(SUBSTRING(ug.grievance_text, 1, 100), 'No description') as grievance_title,
        ug.category,
        ug.status as grievance_status,
        (SELECT COUNT(*) FROM budget_documents WHERE grievance_id = ug.id) as document_count
       FROM grievancecosttracking gct
       JOIN usergrievance ug ON gct.grievance_id = ug.id
       WHERE ug.department_id = $1
       ORDER BY gct.created_at DESC
       LIMIT $2 OFFSET $3`,
      [departmentId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM grievancecosttracking gct
       JOIN usergrievance ug ON gct.grievance_id = ug.id
       WHERE ug.department_id = $1`,
      [departmentId]
    );

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching usage breakdown:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// =====================================================
// 5. BUDGET USAGE BY CATEGORY - Analytics
// =====================================================
router.get('/:depId/category-analytics', async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is the department UUID

    // Get category-wise breakdown
    const result = await pool.query(
      `SELECT 
        COALESCE(
          CASE 
            WHEN ug.category::text LIKE '{%' THEN (ug.category::jsonb->>'primary')
            ELSE ug.category::text
          END,
          'Uncategorized'
        ) as category,
        COUNT(*) as grievance_count,
        SUM(gct.total_cost) as total_cost,
        AVG(gct.total_cost) as avg_cost,
        SUM(gct.labor_cost) as labor_cost,
        SUM(gct.material_cost) as material_cost,
        SUM(gct.equipment_cost) as equipment_cost,
        SUM(gct.transport_cost) as transport_cost,
        SUM(gct.contractor_cost) as contractor_cost
       FROM grievancecosttracking gct
       JOIN usergrievance ug ON gct.grievance_id = ug.id
       WHERE ug.department_id = $1
       GROUP BY category
       ORDER BY total_cost DESC`,
      [departmentId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching category analytics:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// =====================================================
// 6. MONTHLY BUDGET USAGE TREND
// =====================================================
router.get('/:depId/monthly-trend', async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is the department UUID

    const result = await pool.query(
      `SELECT 
        TO_CHAR(gct.created_at, 'Mon YYYY') as month,
        EXTRACT(YEAR FROM gct.created_at) as year,
        EXTRACT(MONTH FROM gct.created_at) as month_num,
        SUM(gct.total_cost) as budget_used,
        COUNT(*) as grievance_count
       FROM grievancecosttracking gct
       JOIN usergrievance ug ON gct.grievance_id = ug.id
       WHERE ug.department_id = $1
       AND gct.created_at >= NOW() - INTERVAL '12 months'
       GROUP BY year, month_num, month
       ORDER BY year DESC, month_num DESC`,
      [departmentId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching monthly trend:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// =====================================================
// 7. BUDGET ALERTS
// =====================================================
router.get('/:depId/alerts', async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is the department UUID

    const result = await pool.query(
      `SELECT * FROM budget_alerts
       WHERE department_id = $1
       AND is_resolved = false
       ORDER BY 
         CASE severity
           WHEN 'Critical' THEN 1
           WHEN 'High' THEN 2
           WHEN 'Medium' THEN 3
           WHEN 'Low' THEN 4
         END,
         created_at DESC`,
      [departmentId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching budget alerts:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// =====================================================
// 8. RESOURCE USAGE TRACKING
// =====================================================
router.get('/:depId/resource-usage', async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is the department UUID

    const result = await pool.query(
      `SELECT 
        gct.resource_usage,
        ug.grievance_id,
        SUBSTRING(ug.grievance_text, 1, 100) as title,
        gct.total_cost
       FROM grievancecosttracking gct
       JOIN usergrievance ug ON gct.grievance_id = ug.id
       WHERE ug.department_id = $1
       AND gct.resource_usage IS NOT NULL
       ORDER BY gct.created_at DESC
       LIMIT 100`,
      [departmentId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching resource usage:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// =====================================================
// 9. EXPENSE APPROVAL WORKFLOW
// =====================================================
router.get('/:depId/expense-approvals', async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is the department UUID
    const { status } = req.query;

    let query = `
      SELECT 
        ea.*,
        ug.grievance_id,
        SUBSTRING(ug.grievance_text, 1, 100) as grievance_title,
        gct.total_cost
      FROM expense_approvals ea
      JOIN grievancecosttracking gct ON ea.cost_tracking_id = gct.id
      JOIN usergrievance ug ON ea.grievance_id = ug.id
      WHERE ug.department_id = $1
    `;

    const params = [departmentId];

    if (status) {
      params.push(status);
      query += ` AND ea.current_status = $${params.length}`;
    }

    query += ' ORDER BY ea.created_at DESC';

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching expense approvals:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// =====================================================
// 10. BUDGET EFFICIENCY METRICS
// =====================================================
router.get('/:depId/efficiency-metrics', async (req, res) => {
  try {
    const { depId } = req.params;
    const departmentId = depId; // depId is the department UUID

    // Cost per grievance type
    const costPerTypeResult = await pool.query(
      `SELECT 
        COALESCE(
          CASE 
            WHEN ug.category::text LIKE '{%' THEN (ug.category::jsonb->>'primary')
            ELSE ug.category::text
          END,
          'Uncategorized'
        ) as grievance_type,
        AVG(gct.total_cost) as avg_cost,
        MIN(gct.total_cost) as min_cost,
        MAX(gct.total_cost) as max_cost,
        COUNT(*) as count
       FROM grievancecosttracking gct
       JOIN usergrievance ug ON gct.grievance_id = ug.id
       WHERE ug.department_id = $1
       GROUP BY grievance_type
       ORDER BY avg_cost DESC`,
      [departmentId]
    );

    // Overall efficiency
    const efficiencyResult = await pool.query(
      `SELECT 
        COUNT(*) as total_grievances,
        COUNT(CASE WHEN (ug.workflow->>'status' = 'completed' OR ug.workflow->>'current_stage' = 'resolved') THEN 1 END) as resolved_grievances,
        AVG(gct.total_cost) as avg_cost_per_grievance,
        SUM(gct.total_cost) as total_spent
       FROM grievancecosttracking gct
       JOIN usergrievance ug ON gct.grievance_id = ug.id
       WHERE ug.department_id = $1`,
      [departmentId]
    );

    const efficiency = efficiencyResult.rows[0];
    const resolutionRate = efficiency.total_grievances > 0 
      ? ((efficiency.resolved_grievances / efficiency.total_grievances) * 100).toFixed(2)
      : 0;

    // Calculate efficiency scores (simplified)
    const budgetEfficiency = Math.min(100, Math.max(0, 100 - (parseFloat(efficiency.avg_cost_per_grievance) / 100)));
    const costEfficiency = Math.min(10, Math.max(0, 10 - (parseFloat(efficiency.avg_cost_per_grievance) / 1000)));

    res.json({
      success: true,
      data: {
        costPerType: costPerTypeResult.rows,
        overallMetrics: {
          totalGrievances: parseInt(efficiency.total_grievances),
          resolvedGrievances: parseInt(efficiency.resolved_grievances),
          resolutionRate: parseFloat(resolutionRate),
          avgCostPerGrievance: parseFloat(efficiency.avg_cost_per_grievance || 0),
          totalSpent: parseFloat(efficiency.total_spent || 0),
          budgetEfficiencyScore: parseFloat(budgetEfficiency.toFixed(2)),
          costEfficiencyScore: parseFloat(costEfficiency.toFixed(1)),
        }
      }
    });
  } catch (error) {
    console.error('Error fetching efficiency metrics:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

export default router;
