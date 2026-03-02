import express from 'express';
import commentsAnalysisService from '../services/comments-analysis.service.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Analyze comments for a specific grievance
 * POST /api/comments-analysis/grievance/:grievanceId/analyze
 */
router.post('/grievance/:grievanceId/analyze', authenticate, async (req, res) => {
  try {
    const { grievanceId } = req.params;

    console.log(`🔍 Analyzing comments for grievance: ${grievanceId}`);

    const result = await commentsAnalysisService.analyzeGrievanceComments(grievanceId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'Comments analyzed successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Analyze comments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze comments',
      details: error.message
    });
  }
});

/**
 * Get analysis for a specific grievance
 * GET /api/comments-analysis/grievance/:grievanceId
 */
router.get('/grievance/:grievanceId', authenticate, async (req, res) => {
  try {
    const { grievanceId } = req.params;

    const analysis = await commentsAnalysisService.getGrievanceAnalysis(grievanceId);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'No analysis found for this grievance'
      });
    }

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analysis'
    });
  }
});

/**
 * Batch analyze multiple grievances
 * POST /api/comments-analysis/batch-analyze
 */
router.post('/batch-analyze', authenticate, authorize(['admin', 'department_head']), async (req, res) => {
  try {
    const { grievanceIds } = req.body;

    if (!Array.isArray(grievanceIds) || grievanceIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'grievanceIds array is required'
      });
    }

    console.log(`📊 Batch analyzing ${grievanceIds.length} grievances`);

    const results = await commentsAnalysisService.batchAnalyzeGrievances(grievanceIds);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      message: `Analyzed ${successCount} grievances successfully, ${failureCount} failed`,
      results
    });

  } catch (error) {
    console.error('Batch analyze error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch analyze comments'
    });
  }
});

/**
 * Get grievances that need analysis
 * GET /api/comments-analysis/pending
 */
router.get('/pending', authenticate, async (req, res) => {
  try {
    const { departmentId, limit = 50 } = req.query;

    const grievances = await commentsAnalysisService.getGrievancesNeedingAnalysis(
      departmentId,
      parseInt(limit)
    );

    res.json({
      success: true,
      count: grievances.length,
      data: grievances
    });

  } catch (error) {
    console.error('Get pending analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending grievances'
    });
  }
});

/**
 * Auto-analyze all pending grievances for a department
 * POST /api/comments-analysis/department/:departmentId/auto-analyze
 */
router.post('/department/:departmentId/auto-analyze', authenticate, authorize(['admin', 'department_head', 'department_officer']), async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { limit = 20 } = req.body;

    console.log(` Auto-analyzing grievances for department: ${departmentId}`);

    // Get grievances needing analysis
    const grievances = await commentsAnalysisService.getGrievancesNeedingAnalysis(
      departmentId,
      limit
    );

    if (grievances.length === 0) {
      return res.json({
        success: true,
        message: 'No grievances need analysis',
        analyzed: 0
      });
    }

    // Analyze them
    const grievanceIds = grievances.map(g => g.id);
    const results = await commentsAnalysisService.batchAnalyzeGrievances(grievanceIds);

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `Auto-analyzed ${successCount} of ${grievances.length} grievances`,
      analyzed: successCount,
      total: grievances.length,
      results
    });

  } catch (error) {
    console.error('Auto-analyze error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-analyze grievances'
    });
  }
});

export default router;
