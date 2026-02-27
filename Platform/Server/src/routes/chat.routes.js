import express from 'express';
import * as chatController from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get accessible users based on hierarchy
router.get('/accessible-users', chatController.getAccessibleUsers);

// Create or get direct chat room
router.post('/rooms/direct', chatController.createOrGetDirectRoom);

// Create grievance chat room
router.post('/rooms/grievance', chatController.createGrievanceRoom);

// Get user's chat rooms
router.get('/rooms', chatController.getUserRooms);

// Get room details
router.get('/rooms/:roomId', chatController.getRoomDetails);

// Get messages for a room
router.get('/rooms/:roomId/messages', chatController.getRoomMessages);

// Send message
router.post('/messages', chatController.sendMessage);

// Mark messages as read
router.post('/mark-read', chatController.markMessagesAsRead);

// Add member to room (for escalation)
router.post('/rooms/add-member', chatController.addMemberToRoom);

// Get subordinate users (users below in hierarchy)
router.get('/subordinates', chatController.getSubordinateUsers);

// Check if user can view another user's data
router.get('/can-view/:targetUserId', chatController.canViewUserData);

export default router;
