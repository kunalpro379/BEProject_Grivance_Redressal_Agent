import api from './api';

export const grievanceService = {
  async createGrievance(grievanceData) {
    const response = await api.post('/grievances', grievanceData);
    return response.data;
  },

  async getGrievances(params = {}) {
    const response = await api.get('/grievances', { params });
    return response.data;
  },

  async getGrievanceById(grievanceId) {
    const response = await api.get(`/grievances/${grievanceId}`);
    return response.data;
  },

  async updateGrievance(grievanceId, updateData) {
    const response = await api.put(`/grievances/${grievanceId}`, updateData);
    return response.data;
  },

  async addComment(grievanceId, comment, isInternal = false) {
    const response = await api.post(`/grievances/${grievanceId}/comments`, {
      comment,
      is_internal: isInternal,
    });
    return response.data;
  },

  async getStats() {
    const response = await api.get('/grievances/stats');
    return response.data.stats;
  },
};
