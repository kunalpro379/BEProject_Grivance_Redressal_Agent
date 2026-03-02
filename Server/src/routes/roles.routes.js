import express from 'express';
import { getGovernmentRoles, getGovernmentRolesByLevel } from '../controllers/roles.controller.js';

const router = express.Router();

// Public routes (no auth required for registration)
router.get('/government-roles', getGovernmentRoles);
router.get('/government-roles/by-level', getGovernmentRolesByLevel);

export default router;
