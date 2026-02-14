import api from './api';

export const adminService = {
  async createUser(userData) {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },

  async getAllUsers(params = {}) {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  async updateUser(userId, userData) {
    const response = await api.put(`/admin/users/${userId}`, userData);
    return response.data;
  },

  async deleteUser(userId) {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  async getDepartments() {
    const response = await api.get('/admin/departments');
    return response.data.departments;
  },

  async createDepartment(departmentData) {
    const response = await api.post('/admin/departments', departmentData);
    return response.data;
  },
};
