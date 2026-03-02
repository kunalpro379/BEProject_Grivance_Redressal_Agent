import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import * as grievanceController from '../controllers/grievance.controller.js';
import { getGrievanceDetails } from '../controllers/grievance.details.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// Multer for platform grievance form (optional proof file: images, PDF, DOC)
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir + '/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'grievance_' + uniqueSuffix + path.extname(file.originalname));
  }
});

const grievanceUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images, PDF, and DOC/DOCX are allowed.'));
    }
  }
});

router.use(authenticate);

// Platform form submission (multipart: category, age, city, title, description, optional proof)
router.post('/submit', grievanceUpload.single('proof'), grievanceController.submitGrievanceFromForm);
router.post('/', validate(schemas.createGrievance), grievanceController.createGrievance);
router.get('/', grievanceController.getGrievances);
router.get('/stats', grievanceController.getStats);
router.get('/:grievanceId', grievanceController.getGrievanceById);
router.get('/:grievanceId/details', getGrievanceDetails); // Enhanced detailed view with full AI analysis
router.put('/:grievanceId', 
  authorize('admin', 'department_officer', 'department_head'),
  validate(schemas.updateGrievance),
  grievanceController.updateGrievance
);
router.post('/:grievanceId/comments', grievanceController.addComment);

export default router;
