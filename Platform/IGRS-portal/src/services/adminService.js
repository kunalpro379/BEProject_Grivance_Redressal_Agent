import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const adminService = {
  // Get all pending users
  getPendingUsers: async () => {
    const response = await api.get('/pending-users');
    return response.data;
  },

  // Get all departments (for allocating officers on approve)
  getDepartments: async () => {
    const response = await api.get('/departments');
    return response.data;
  },

  // Approve a user. For department_officer/department_head pass { department_id } to allocate department.
  approveUser: async (userId, body = {}) => {
    const response = await api.post(`/approve-user/${userId}`, body);
    return response.data;
  },

  // Reject a user
  rejectUser: async (userId, rejectionReason) => {
    const response = await api.post(`/reject-user/${userId}`, {
      rejection_reason: rejectionReason,
    });
    return response.data;
  },

  // Get all users with filters
  getAllUsers: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/users?${params}`);
    return response.data;
  },

  // Get user statistics
  getUserStats: async () => {
    const response = await api.get('/user-stats');
    return response.data;
  },

  // Update user status
  updateUserStatus: async (userId, status) => {
    const response = await api.patch(`/users/${userId}/status`, { status });
    return response.data;
  },
};

export default adminService;
