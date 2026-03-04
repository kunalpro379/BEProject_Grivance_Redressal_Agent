/**
 * Subscription Routes
 * Routes for managing subscriptions and pricing
 */

import express from 'express';
import subscriptionController from '../controllers/subscription.controller.js';
import { authenticateToken } from '../middleware/auth.mid.js';

const router = express.Router();

// Public routes
router.get('/pricing-plans', subscriptionController.getPricingPlans);
router.get('/pricing-plans/:id', subscriptionController.getPricingPlanById);

// Create subscription (public - for new sign-ups)
router.post('/', subscriptionController.createSubscription);

// Get subscription by code (public - for verification)
router.get('/code/:code', subscriptionController.getSubscriptionByCode);

// Protected routes (require authentication)
router.get('/:id', authenticateToken, subscriptionController.getSubscriptionById);
router.post('/:id/activate', authenticateToken, subscriptionController.activateSubscription);

// User management
router.get('/:id/users', authenticateToken, subscriptionController.getSubscriptionUsers);
router.post('/:id/users', authenticateToken, subscriptionController.addUser);
router.delete('/:id/users/:userId', authenticateToken, subscriptionController.removeUser);

// Purchase extra users
router.post('/:id/purchase-users', authenticateToken, subscriptionController.purchaseExtraUsers);

// Subscription management
router.post('/:id/cancel', authenticateToken, subscriptionController.cancelSubscription);
router.get('/:id/stats', authenticateToken, subscriptionController.getSubscriptionStats);

// Admin/Cron route for checking expired subscriptions
router.post('/check-expired', authenticateToken, subscriptionController.checkExpiredSubscriptions);

export default router;
