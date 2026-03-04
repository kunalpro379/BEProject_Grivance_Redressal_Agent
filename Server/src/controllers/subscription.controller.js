/**
 * Subscription Controller
 * Handles HTTP requests for subscription management
 */

import subscriptionService from '../services/subscription.service.js';

class SubscriptionController {
  /**
   * Get all pricing plans
   * GET /api/subscriptions/pricing-plans
   */
  async getPricingPlans(req, res) {
    try {
      const plans = await subscriptionService.getPricingPlans();
      res.json({
        success: true,
        data: plans
      });
    } catch (error) {
      console.error('Error fetching pricing plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pricing plans',
        error: error.message
      });
    }
  }

  /**
   * Get pricing plan by ID
   * GET /api/subscriptions/pricing-plans/:id
   */
  async getPricingPlanById(req, res) {
    try {
      const { id } = req.params;
      const plan = await subscriptionService.getPricingPlanById(id);
      
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Pricing plan not found'
        });
      }

      res.json({
        success: true,
        data: plan
      });
    } catch (error) {
      console.error('Error fetching pricing plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pricing plan',
        error: error.message
      });
    }
  }

  /**
   * Create a new subscription
   * POST /api/subscriptions
   */
  async createSubscription(req, res) {
    try {
      const subscriptionData = req.body;
      
      // Validate required fields
      const requiredFields = ['organizationName', 'cityName', 'pricingPlanId', 'billingCycle'];
      const missingFields = requiredFields.filter(field => !subscriptionData[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          missingFields
        });
      }

      const subscription = await subscriptionService.createSubscription(subscriptionData);
      
      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: subscription
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create subscription',
        error: error.message
      });
    }
  }

  /**
   * Get subscription by ID
   * GET /api/subscriptions/:id
   */
  async getSubscriptionById(req, res) {
    try {
      const { id } = req.params;
      const subscription = await subscriptionService.getSubscriptionById(id);
      
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription',
        error: error.message
      });
    }
  }

  /**
   * Get subscription by code
   * GET /api/subscriptions/code/:code
   */
  async getSubscriptionByCode(req, res) {
    try {
      const { code } = req.params;
      const subscription = await subscriptionService.getSubscriptionByCode(code);
      
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription',
        error: error.message
      });
    }
  }

  /**
   * Activate subscription
   * POST /api/subscriptions/:id/activate
   */
  async activateSubscription(req, res) {
    try {
      const { id } = req.params;
      const { adminUserId, paymentDetails } = req.body;

      if (!adminUserId) {
        return res.status(400).json({
          success: false,
          message: 'Admin user ID is required'
        });
      }

      const subscription = await subscriptionService.activateSubscription(
        id,
        adminUserId,
        paymentDetails
      );

      res.json({
        success: true,
        message: 'Subscription activated successfully',
        data: subscription
      });
    } catch (error) {
      console.error('Error activating subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate subscription',
        error: error.message
      });
    }
  }

  /**
   * Add user to subscription
   * POST /api/subscriptions/:id/users
   */
  async addUser(req, res) {
    try {
      const { id } = req.params;
      const { userId, userType, isExtraUser = false } = req.body;

      if (!userId || !userType) {
        return res.status(400).json({
          success: false,
          message: 'User ID and user type are required'
        });
      }

      const user = await subscriptionService.addUserToSubscription(
        id,
        userId,
        userType,
        isExtraUser
      );

      res.json({
        success: true,
        message: 'User added to subscription successfully',
        data: user
      });
    } catch (error) {
      console.error('Error adding user to subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add user to subscription',
        error: error.message
      });
    }
  }

  /**
   * Remove user from subscription
   * DELETE /api/subscriptions/:id/users/:userId
   */
  async removeUser(req, res) {
    try {
      const { id, userId } = req.params;

      await subscriptionService.removeUserFromSubscription(id, userId);

      res.json({
        success: true,
        message: 'User removed from subscription successfully'
      });
    } catch (error) {
      console.error('Error removing user from subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove user from subscription',
        error: error.message
      });
    }
  }

  /**
   * Get subscription users
   * GET /api/subscriptions/:id/users
   */
  async getSubscriptionUsers(req, res) {
    try {
      const { id } = req.params;
      const users = await subscriptionService.getSubscriptionUsers(id);

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Error fetching subscription users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription users',
        error: error.message
      });
    }
  }

  /**
   * Purchase additional users
   * POST /api/subscriptions/:id/purchase-users
   */
  async purchaseExtraUsers(req, res) {
    try {
      const { id } = req.params;
      const { numberOfUsers, purchasedBy } = req.body;

      if (!numberOfUsers || numberOfUsers < 1) {
        return res.status(400).json({
          success: false,
          message: 'Number of users must be at least 1'
        });
      }

      const subscription = await subscriptionService.purchaseExtraUsers(
        id,
        numberOfUsers,
        purchasedBy || req.user?.id
      );

      res.json({
        success: true,
        message: `Successfully purchased ${numberOfUsers} additional user slots`,
        data: subscription
      });
    } catch (error) {
      console.error('Error purchasing extra users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to purchase additional users',
        error: error.message
      });
    }
  }

  /**
   * Cancel subscription
   * POST /api/subscriptions/:id/cancel
   */
  async cancelSubscription(req, res) {
    try {
      const { id } = req.params;
      const { cancellationReason } = req.body;
      const cancelledBy = req.user?.id;

      const subscription = await subscriptionService.cancelSubscription(
        id,
        cancelledBy,
        cancellationReason
      );

      res.json({
        success: true,
        message: 'Subscription cancelled successfully',
        data: subscription
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel subscription',
        error: error.message
      });
    }
  }

  /**
   * Get subscription statistics
   * GET /api/subscriptions/:id/stats
   */
  async getSubscriptionStats(req, res) {
    try {
      const { id } = req.params;
      const stats = await subscriptionService.getSubscriptionStats(id);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription statistics',
        error: error.message
      });
    }
  }

  /**
   * Check and update expired subscriptions (Admin/Cron)
   * POST /api/subscriptions/check-expired
   */
  async checkExpiredSubscriptions(req, res) {
    try {
      const expiredSubscriptions = await subscriptionService.checkExpiredSubscriptions();

      res.json({
        success: true,
        message: `Updated ${expiredSubscriptions.length} expired subscriptions`,
        data: expiredSubscriptions
      });
    } catch (error) {
      console.error('Error checking expired subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check expired subscriptions',
        error: error.message
      });
    }
  }
}

const subscriptionController = new SubscriptionController();
export default subscriptionController;
