import express from 'express';
import * as citizenController from '../controllers/citizen.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Register citizen (public route)
router.post('/register', citizenController.register);

// Protected routes - require authentication
router.use(authenticate);

// Get citizen by telegram_id (citizens can only access their own data, admins can access all)
router.get('/:telegram_id', authorize('citizen', 'admin'), citizenController.getCitizen);

// Update citizen location (citizens only)
router.put('/:telegram_id/location', authorize('citizen', 'admin'), citizenController.updateLocation);

// Get citizen grievances (citizens can only see their own, admins can see all)
router.get('/:telegram_id/grievances', authorize('citizen', 'admin'), citizenController.getGrievances);

export default router;
