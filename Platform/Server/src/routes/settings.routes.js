import express from 'express';
import { settingsController } from '../controllers/settings.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All settings routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Get all settings
router.get('/', settingsController.getAllSettings);

// Get setting by key
router.get('/:key', settingsController.getSettingByKey);

// Update setting by key
router.put('/:key', settingsController.updateSetting);

// API Keys specific routes
router.get('/api-keys/list', settingsController.getApiKeys);
router.put('/api-keys/update', settingsController.updateApiKeys);

// Research prompt specific routes
router.get('/research-prompt/get', settingsController.getResearchPrompt);
router.put('/research-prompt/update', settingsController.updateResearchPrompt);

export default router;
