import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/profile', authenticate, authController.getProfile);

export default router;
