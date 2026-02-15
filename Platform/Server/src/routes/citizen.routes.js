import express from 'express';
import * as citizenController from '../controllers/citizen.controller.js';

const router = express.Router();

// Register citizen
router.post('/register', citizenController.register);

// Get citizen by telegram_id
router.get('/:telegram_id', citizenController.getCitizen);

// Update citizen location
router.put('/:telegram_id/location', citizenController.updateLocation);

// Get citizen grievances
router.get('/:telegram_id/grievances', citizenController.getGrievances);

export default router;
