import express from 'express';
import { getRoleDashboard } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get role-specific dashboard
router.get('/role-dashboard', authenticate, getRoleDashboard);

export default router;
