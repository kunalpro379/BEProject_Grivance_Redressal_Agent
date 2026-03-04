/**
 * Subscription API Service
 * Frontend service for subscription-related API calls
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const subscriptionApi = axios.create({
  baseURL: `${API_BASE_URL}/subscriptions`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
subscriptionApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Get all pricing plans
 */
export const getPricingPlans = async () => {
  const response = await subscriptionApi.get('/pricing-plans');
  return response.data;
};

/**
 * Get pricing plan by ID
 */
export const getPricingPlanById = async (planId) => {
  const response = await subscriptionApi.get(`/pricing-plans/${planId}`);
  return response.data;
};

/**
 * Create a new subscription
 */
export const createSubscription = async (subscriptionData) => {
  const response = await subscriptionApi.post('/', subscriptionData);
  return response.data;
};

/**
 * Get subscription by ID
 */
export const getSubscriptionById = async (subscriptionId) => {
  const response = await subscriptionApi.get(`/${subscriptionId}`);
  return response.data;
};

/**
 * Get subscription by code
 */
export const getSubscriptionByCode = async (code) => {
  const response = await subscriptionApi.get(`/code/${code}`);
  return response.data;
};

/**
 * Activate subscription
 */
export const activateSubscription = async (subscriptionId, adminUserId, paymentDetails) => {
  const response = await subscriptionApi.post(`/${subscriptionId}/activate`, {
    adminUserId,
    paymentDetails,
  });
  return response.data;
};

/**
 * Add user to subscription
 */
export const addUserToSubscription = async (subscriptionId, userId, userType, isExtraUser = false) => {
  const response = await subscriptionApi.post(`/${subscriptionId}/users`, {
    userId,
    userType,
    isExtraUser,
  });
  return response.data;
};

/**
 * Remove user from subscription
 */
export const removeUserFromSubscription = async (subscriptionId, userId) => {
  const response = await subscriptionApi.delete(`/${subscriptionId}/users/${userId}`);
  return response.data;
};

/**
 * Get subscription users
 */
export const getSubscriptionUsers = async (subscriptionId) => {
  const response = await subscriptionApi.get(`/${subscriptionId}/users`);
  return response.data;
};

/**
 * Purchase additional users
 */
export const purchaseExtraUsers = async (subscriptionId, numberOfUsers, purchasedBy) => {
  const response = await subscriptionApi.post(`/${subscriptionId}/purchase-users`, {
    numberOfUsers,
    purchasedBy,
  });
  return response.data;
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (subscriptionId, cancellationReason) => {
  const response = await subscriptionApi.post(`/${subscriptionId}/cancel`, {
    cancellationReason,
  });
  return response.data;
};

/**
 * Get subscription statistics
 */
export const getSubscriptionStats = async (subscriptionId) => {
  const response = await subscriptionApi.get(`/${subscriptionId}/stats`);
  return response.data;
};

/**
 * Check expired subscriptions (admin only)
 */
export const checkExpiredSubscriptions = async () => {
  const response = await subscriptionApi.post('/check-expired');
  return response.data;
};

export default {
  getPricingPlans,
  getPricingPlanById,
  createSubscription,
  getSubscriptionById,
  getSubscriptionByCode,
  activateSubscription,
  addUserToSubscription,
  removeUserFromSubscription,
  getSubscriptionUsers,
  purchaseExtraUsers,
  cancelSubscription,
  getSubscriptionStats,
  checkExpiredSubscriptions,
};
