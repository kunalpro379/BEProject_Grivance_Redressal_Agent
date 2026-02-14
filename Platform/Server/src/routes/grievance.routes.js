import express from 'express';
import * as grievanceController from '../controllers/grievance.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticate);

router.post('/', validate(schemas.createGrievance), grievanceController.createGrievance);
router.get('/', grievanceController.getGrievances);
router.get('/stats', grievanceController.getStats);
router.get('/:grievanceId', grievanceController.getGrievanceById);
router.put('/:grievanceId', 
  authorize('admin', 'department_officer', 'department_head'),
  validate(schemas.updateGrievance),
  grievanceController.updateGrievance
);
router.post('/:grievanceId/comments', grievanceController.addComment);

export default router;
