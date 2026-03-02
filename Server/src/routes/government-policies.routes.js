import express from 'express';
import policyExtractorService from '../services/policy-extractor.service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/government-policies/extract
 * @desc    Extract all government policies using DeepSeek AI
 * @access  Private (Department/Admin)
 */
router.get('/extract', authenticateToken, async (req, res) => {
  try {
    const { category = 'all', department_id } = req.query;

    console.log(`📋 Extracting policies - Category: ${category}, Department: ${department_id || 'all'}`);

    const result = await policyExtractorService.extractPolicies(
      category,
      department_id ? parseInt(department_id) : null
    );

    res.json(result);

  } catch (error) {
    console.error('Policy extraction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract policies',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/government-policies/category/:category
 * @desc    Get policies by category (rules/policies/plans/budgets)
 * @access  Private
 */
router.get('/category/:category', authenticateToken, async (req, res) => {
  try {
    const { category } = req.params;
    const { department_id } = req.query;

    const result = await policyExtractorService.extractPolicies(
      category,
      department_id ? parseInt(department_id) : null
    );

    res.json(result);

  } catch (error) {
    console.error('Get policies by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get policies',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/government-policies/department/:departmentId
 * @desc    Get all policies for a specific department
 * @access  Private
 */
router.get('/department/:departmentId', authenticateToken, async (req, res) => {
  try {
    const { departmentId } = req.params;

    const result = await policyExtractorService.getPoliciesByDepartment(
      parseInt(departmentId)
    );

    res.json(result);

  } catch (error) {
    console.error('Get department policies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get department policies',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/government-policies/search
 * @desc    Search policies using AI
 * @access  Private
 */
router.post('/search', authenticateToken, async (req, res) => {
  try {
    const { query, department_id } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const result = await policyExtractorService.searchPolicies(
      query,
      department_id ? parseInt(department_id) : null
    );

    res.json(result);

  } catch (error) {
    console.error('Policy search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search policies',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/government-policies/stats
 * @desc    Get policy statistics
 * @access  Private
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const result = await policyExtractorService.extractPolicies('all');

    const stats = {
      total_documents: result.metadata?.total_documents || 0,
      rules_count: result.data?.rules?.length || 0,
      policies_count: result.data?.policies?.length || 0,
      plans_count: result.data?.plans?.length || 0,
      budgets_count: result.data?.budgets?.length || 0,
      total_items: (result.data?.rules?.length || 0) +
                   (result.data?.policies?.length || 0) +
                   (result.data?.plans?.length || 0) +
                   (result.data?.budgets?.length || 0),
      last_updated: new Date().toISOString()
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get policy stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get policy statistics',
      error: error.message
    });
  }
});

export default router;
