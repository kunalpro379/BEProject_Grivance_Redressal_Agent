import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.post('/users', validate(schemas.createUser), adminController.createUser);
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId', validate(schemas.updateUser), adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);

router.get('/departments', adminController.getDepartments);
router.post('/departments', adminController.createDepartment);

export default router;
