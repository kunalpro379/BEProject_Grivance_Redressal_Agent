import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  addComment,
  getComments,
  updateComment,
  deleteComment,
  getCommentCount
} from '../controllers/comments.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Grievance-specific comment routes
router.post('/grievances/:grievanceId/comments', addComment);
router.get('/grievances/:grievanceId/comments', getComments);
router.get('/grievances/:grievanceId/comments/count', getCommentCount);

// Comment-specific routes
router.put('/comments/:commentId', updateComment);
router.delete('/comments/:commentId', deleteComment);

export default router;
