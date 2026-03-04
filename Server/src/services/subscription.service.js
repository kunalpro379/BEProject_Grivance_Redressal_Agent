/**
 * Subscription Service
 * Handles all subscription-related business logic
 */

import pool from '../config/db.js';

class SubscriptionService {
  /**
   * Get all pricing plans
   */
  async getPricingPlans() {
    const query = `
      SELECT * FROM pricing_plans 
      WHERE is_active = true 
      ORDER BY display_order, base_price
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get pricing plan by ID
   */
  async getPricingPlanById(planId) {
    const query = 'SELECT * FROM pricing_plans WHERE id = $1 AND is_active = true';
    const result = await pool.query(query, [planId]);
    return result.rows[0];
  }

  /**
   * Create a new subscription
   */
  async createSubscription(subscriptionData) {
    const {
      organizationName,
      cityName,
      stateName,
      pricingPlanId,
      billingCycle,
      extraUsers = 0,
      startDate,
      metadata = {}
    } = subscriptionData;

    // Get pricing plan details
    const plan = await this.getPricingPlanById(pricingPlanId);
    if (!plan) {
      throw new Error('Invalid pricing plan');
    }

    // Calculate dates
    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start);
    
    if (billingCycle === 'monthly') {
      end.setMonth(end.getMonth() + 1);
    } else if (billingCycle === 'yearly') {
      end.setFullYear(end.getFullYear() + 1);
    }

    // Calculate pricing
    const baseAmount = plan.base_price;
    const extraUserCharges = extraUsers * plan.extra_user_price;
    const nextBillingDate = new Date(end);

    // Generate subscription code
    const subscriptionCode = `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const query = `
      INSERT INTO subscriptions (
        subscription_code,
        organization_name,
        city_name,
        state_name,
        pricing_plan_id,
        included_users,
        extra_users,
        start_date,
        end_date,
        billing_cycle,
        status,
        base_amount,
        extra_user_charges,
        payment_status,
        next_billing_date,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      subscriptionCode,
      organizationName,
      cityName,
      stateName,
      pricingPlanId,
      plan.included_users,
      extraUsers,
      start,
      end,
      billingCycle,
      'pending', // Initial status
      baseAmount,
      extraUserCharges,
      'pending',
      nextBillingDate,
      JSON.stringify(metadata)
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(subscriptionId) {
    const query = `
      SELECT 
        s.*,
        pp.plan_name,
        pp.plan_type,
        pp.features,
        u.email as admin_email,
        u.full_name as admin_name
      FROM subscriptions s
      LEFT JOIN pricing_plans pp ON s.pricing_plan_id = pp.id
      LEFT JOIN users u ON s.admin_user_id = u.id
      WHERE s.id = $1
    `;
    const result = await pool.query(query, [subscriptionId]);
    return result.rows[0];
  }

  /**
   * Get subscription by code
   */
  async getSubscriptionByCode(subscriptionCode) {
    const query = `
      SELECT 
        s.*,
        pp.plan_name,
        pp.plan_type,
        pp.features
      FROM subscriptions s
      LEFT JOIN pricing_plans pp ON s.pricing_plan_id = pp.id
      WHERE s.subscription_code = $1
    `;
    const result = await pool.query(query, [subscriptionCode]);
    return result.rows[0];
  }

  /**
   * Activate subscription after payment
   */
  async activateSubscription(subscriptionId, adminUserId, paymentDetails = {}) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update subscription status
      const updateSubQuery = `
        UPDATE subscriptions 
        SET 
          status = 'active',
          payment_status = 'paid',
          admin_user_id = $2,
          last_payment_date = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const subResult = await client.query(updateSubQuery, [subscriptionId, adminUserId]);
      const subscription = subResult.rows[0];

      // Update admin user
      const updateUserQuery = `
        UPDATE users 
        SET 
          subscription_id = $1,
          is_subscription_admin = true
        WHERE id = $2
      `;
      await client.query(updateUserQuery, [subscriptionId, adminUserId]);

      // Add admin to subscription_users
      const addAdminQuery = `
        INSERT INTO subscription_users (subscription_id, user_id, user_type, is_active)
        VALUES ($1, $2, 'admin', true)
        ON CONFLICT (subscription_id, user_id) DO NOTHING
      `;
      await client.query(addAdminQuery, [subscriptionId, adminUserId]);

      // Update user count
      await client.query(
        'UPDATE subscriptions SET current_user_count = 1 WHERE id = $1',
        [subscriptionId]
      );

      // Create purchase record
      const purchaseQuery = `
        INSERT INTO subscription_purchases (
          subscription_id,
          purchase_type,
          amount,
          final_amount,
          payment_status,
          payment_date,
          purchased_by,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
        RETURNING *
      `;
      const purchaseValues = [
        subscriptionId,
        'new_subscription',
        subscription.total_amount,
        subscription.total_amount,
        'completed',
        adminUserId,
        JSON.stringify(paymentDetails)
      ];
      await client.query(purchaseQuery, purchaseValues);

      await client.query('COMMIT');
      return subscription;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add user to subscription
   */
  async addUserToSubscription(subscriptionId, userId, userType, isExtraUser = false) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check user limit
      const subQuery = 'SELECT current_user_count, total_users_allowed FROM subscriptions WHERE id = $1';
      const subResult = await client.query(subQuery, [subscriptionId]);
      const subscription = subResult.rows[0];

      if (subscription.current_user_count >= subscription.total_users_allowed) {
        throw new Error('User limit exceeded. Please purchase additional user slots.');
      }

      // Add user to subscription
      const addUserQuery = `
        INSERT INTO subscription_users (subscription_id, user_id, user_type, is_extra_user, is_active)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (subscription_id, user_id) DO UPDATE
        SET is_active = true, user_type = $3
        RETURNING *
      `;
      const userResult = await client.query(addUserQuery, [subscriptionId, userId, userType, isExtraUser]);

      // Update user's subscription_id
      await client.query(
        'UPDATE users SET subscription_id = $1 WHERE id = $2',
        [subscriptionId, userId]
      );

      // Increment user count
      await client.query(
        'UPDATE subscriptions SET current_user_count = current_user_count + 1 WHERE id = $1',
        [subscriptionId]
      );

      await client.query('COMMIT');
      return userResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove user from subscription
   */
  async removeUserFromSubscription(subscriptionId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Deactivate user
      const deactivateQuery = `
        UPDATE subscription_users 
        SET is_active = false, deactivated_at = NOW()
        WHERE subscription_id = $1 AND user_id = $2
        RETURNING *
      `;
      await client.query(deactivateQuery, [subscriptionId, userId]);

      // Remove subscription from user
      await client.query(
        'UPDATE users SET subscription_id = NULL WHERE id = $1',
        [userId]
      );

      // Decrement user count
      await client.query(
        'UPDATE subscriptions SET current_user_count = GREATEST(0, current_user_count - 1) WHERE id = $1',
        [subscriptionId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get users in a subscription
   */
  async getSubscriptionUsers(subscriptionId) {
    const query = `
      SELECT 
        su.*,
        u.email,
        u.full_name,
        u.role,
        u.department_id,
        d.name as department_name
      FROM subscription_users su
      JOIN users u ON su.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE su.subscription_id = $1 AND su.is_active = true
      ORDER BY su.created_at
    `;
    const result = await pool.query(query, [subscriptionId]);
    return result.rows;
  }

  /**
   * Purchase additional users
   */
  async purchaseExtraUsers(subscriptionId, numberOfUsers, purchasedBy) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get subscription and pricing details
      const subQuery = `
        SELECT s.*, pp.extra_user_price 
        FROM subscriptions s
        JOIN pricing_plans pp ON s.pricing_plan_id = pp.id
        WHERE s.id = $1
      `;
      const subResult = await client.query(subQuery, [subscriptionId]);
      const subscription = subResult.rows[0];

      const amount = numberOfUsers * subscription.extra_user_price;

      // Update subscription
      const updateQuery = `
        UPDATE subscriptions 
        SET 
          extra_users = extra_users + $2,
          extra_user_charges = extra_user_charges + $3
        WHERE id = $1
        RETURNING *
      `;
      const updateResult = await client.query(updateQuery, [subscriptionId, numberOfUsers, amount]);

      // Create purchase record
      const purchaseQuery = `
        INSERT INTO subscription_purchases (
          subscription_id,
          purchase_type,
          amount,
          final_amount,
          payment_status,
          payment_date,
          purchased_by
        ) VALUES ($1, 'extra_users', $2, $2, 'completed', NOW(), $3)
        RETURNING *
      `;
      await client.query(purchaseQuery, [subscriptionId, amount, purchasedBy]);

      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, cancelledBy, cancellationReason) {
    const query = `
      UPDATE subscriptions 
      SET 
        status = 'cancelled',
        auto_renew = false,
        cancelled_at = NOW(),
        cancelled_by = $2,
        cancellation_reason = $3
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [subscriptionId, cancelledBy, cancellationReason]);
    return result.rows[0];
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(subscriptionId) {
    const query = `
      SELECT 
        s.current_user_count,
        s.total_users_allowed,
        s.start_date,
        s.end_date,
        s.status,
        COUNT(DISTINCT su.user_id) as active_users,
        COUNT(DISTINCT CASE WHEN su.user_type = 'department_official' THEN su.user_id END) as department_officials,
        COUNT(DISTINCT CASE WHEN su.user_type = 'government_official' THEN su.user_id END) as government_officials,
        COUNT(DISTINCT sp.id) as total_purchases,
        COALESCE(SUM(sp.final_amount), 0) as total_spent
      FROM subscriptions s
      LEFT JOIN subscription_users su ON s.id = su.subscription_id AND su.is_active = true
      LEFT JOIN subscription_purchases sp ON s.id = sp.subscription_id
      WHERE s.id = $1
      GROUP BY s.id
    `;
    const result = await pool.query(query, [subscriptionId]);
    return result.rows[0];
  }

  /**
   * Check and update expired subscriptions
   */
  async checkExpiredSubscriptions() {
    const query = `
      UPDATE subscriptions 
      SET status = 'expired'
      WHERE end_date < NOW() 
        AND status = 'active'
      RETURNING *
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

const subscriptionService = new SubscriptionService();
export default subscriptionService;
