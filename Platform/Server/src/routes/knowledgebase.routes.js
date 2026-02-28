import express from 'express';
import multer from 'multer';
import path from 'path';
import knowledgeBaseController from '../controllers/knowledgebase.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Worker callback endpoint (no auth required - called by worker)
router.post('/update-status', knowledgeBaseController.updateStatus);

// All other routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Knowledge base routes
router.post('/upload-pdf', upload.single('pdf'), knowledgeBaseController.uploadPDF);
router.post('/add-url', knowledgeBaseController.addURL);
router.get('/', knowledgeBaseController.getAll);
router.post('/:id/generate-link', knowledgeBaseController.generateShareableLink);
router.delete('/:id', knowledgeBaseController.delete);

export default router;
