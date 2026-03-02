import express from 'express';
import contractorAnalysisService from '../services/contractor-analysis.service.js';
import contractorComparisonService from '../services/contractor-comparison.service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Generate comprehensive comparison report
 * GET /api/contractor-analysis/comparison-report
 */
router.get('/comparison-report', authenticateToken, async (req, res) => {
  try {
    const { department_id, category } = req.query;

    // Check if user has access
    if (req.user.role === 'department_officer' && department_id && req.user.department_id !== department_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const report = await contractorComparisonService.generateComparisonReport(
      department_id,
      category
    );

    res.json(report);

  } catch (error) {
    console.error('Error generating comparison report:', error);
    res.status(500).json({ 
      error: 'Failed to generate comparison report',
      message: error.message 
    });
  }
});

/**
 * Analyze a specific contractor
 * POST /api/contractor-analysis/:contractorId/analyze
 */
router.post('/:contractorId/analyze', authenticateToken, async (req, res) => {
  try {
    const { contractorId } = req.params;

    // Check if user is department officer or admin
    if (!['department_officer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const analysis = await contractorAnalysisService.analyzeContractor(contractorId);

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Error analyzing contractor:', error);
    res.status(500).json({ 
      error: 'Failed to analyze contractor',
      message: error.message 
    });
  }
});

/**
 * Get contractors for department with analysis
 * GET /api/contractor-analysis/department/:departmentId
 */
router.get('/department/:departmentId', authenticateToken, async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { category } = req.query;

    // Check if user has access to this department
    if (req.user.role === 'department_officer' && req.user.department_id !== departmentId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const contractors = await contractorAnalysisService.getContractorsForDepartment(
      departmentId,
      category
    );

    res.json({
      success: true,
      data: contractors,
      count: contractors.length
    });

  } catch (error) {
    console.error('Error fetching contractors:', error);
    res.status(500).json({ 
      error: 'Failed to fetch contractors',
      message: error.message 
    });
  }
});

/**
 * Get detailed analysis for a contractor
 * GET /api/contractor-analysis/:contractorId
 */
router.get('/:contractorId', authenticateToken, async (req, res) => {
  try {
    const { contractorId } = req.params;

    const contractor = await contractorAnalysisService.getContractorData(contractorId);

    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    res.json({
      success: true,
      data: contractor
    });

  } catch (error) {
    console.error('Error fetching contractor:', error);
    res.status(500).json({ 
      error: 'Failed to fetch contractor',
      message: error.message 
    });
  }
});

/**
 * Analyze all pending contractors
 * POST /api/contractor-analysis/analyze-all
 */
router.post('/analyze-all', authenticateToken, async (req, res) => {
  try {
    // Only admins can trigger bulk analysis
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const analyses = await contractorAnalysisService.analyzeAllPending();

    res.json({
      success: true,
      data: analyses,
      count: analyses.length
    });

  } catch (error) {
    console.error('Error analyzing contractors:', error);
    res.status(500).json({ 
      error: 'Failed to analyze contractors',
      message: error.message 
    });
  }
});

/**
 * Compare multiple contractors
 * POST /api/contractor-analysis/compare
 */
router.post('/compare', authenticateToken, async (req, res) => {
  try {
    const { contractor_ids } = req.body;

    if (!contractor_ids || !Array.isArray(contractor_ids)) {
      return res.status(400).json({ error: 'contractor_ids array required' });
    }

    const comparison = await contractorComparisonService.compareSpecificContractors(contractor_ids);

    res.json({
      success: true,
      data: comparison
    });

  } catch (error) {
    console.error('Error comparing contractors:', error);
    res.status(500).json({ 
      error: 'Failed to compare contractors',
      message: error.message 
    });
  }
});

export default router;
