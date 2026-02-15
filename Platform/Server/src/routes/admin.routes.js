import express from 'express';
import adminController from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// User approval routes
router.get('/pending-users', adminController.getPendingUsers);
router.post('/approve-user/:userId', adminController.approveUser);
router.post('/reject-user/:userId', adminController.rejectUser);

// User management routes
router.get('/users', adminController.getAllUsers);
router.get('/user-stats', adminController.getUserStats);
router.patch('/users/:userId/status', adminController.updateUserStatus);

export default router;
