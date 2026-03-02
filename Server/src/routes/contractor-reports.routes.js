import express from 'express';
import contractorReportService from '../services/contractor-report.service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Get all reports for a contractor
 */
router.get('/contractor/:contractorId', authenticateToken, async (req, res) => {
  try {
    const { contractorId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const reports = await contractorReportService.getContractorReports(contractorId, limit);
    
    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching contractor reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports'
    });
  }
});

/**
 * Get contractor statistics
 */
router.get('/contractor/:contractorId/stats', authenticateToken, async (req, res) => {
  try {
    const { contractorId } = req.params;

    const stats = await contractorReportService.getContractorStats(contractorId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching contractor stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

/**
 * Search reports using vector similarity
 */
router.post('/search', authenticateToken, async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    const results = await contractorReportService.searchReports(query, limit);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error searching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search reports'
    });
  }
});

/**
 * Get all contractors with their latest reports
 */
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const result = await contractorReportService.getAllContractorsWithReports(limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching all contractor reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports'
    });
  }
});

export default router;
