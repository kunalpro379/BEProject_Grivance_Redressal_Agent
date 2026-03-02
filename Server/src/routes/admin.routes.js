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

// Departments list (for allocating officers on approve)
router.get('/departments', adminController.getDepartments);

// User management routes
router.get('/users', adminController.getAllUsers);
router.get('/user-stats', adminController.getUserStats);
router.patch('/users/:userId/status', adminController.updateUserStatus);

// Utility: Update existing department officers with dep_id (DEPRECATED - dep_id removed)
// router.post('/update-dep-ids', adminController.updateDepartmentOfficersDepId);

export default router;
