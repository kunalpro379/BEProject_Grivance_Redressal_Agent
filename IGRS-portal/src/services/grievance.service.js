import api from './api';

export const grievanceService = {
  /**
   * Submit grievance from platform form (category, age, city, title, description, optional proof file).
   * Proof file is uploaded to Azure Blob (same as Telegram); blob URL is sent to QueryAnalyst queue.
   */
  async submitGrievanceForm(formData) {
    const response = await api.post('/grievances/submit', formData);
    return response.data;
  },

  async createGrievance(grievanceData) {
    const response = await api.post('/grievances', grievanceData);
    return response.data;
  },

  async getGrievances(params = {}) {
    const response = await api.get('/grievances', { params });
    return response.data;
  },

  async getGrievanceById(grievanceId, params = {}) {
    const response = await api.get(`/grievances/${grievanceId}`, { params });
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
