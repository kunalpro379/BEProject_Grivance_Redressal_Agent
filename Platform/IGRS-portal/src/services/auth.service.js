import api from './api';

export const authService = {
  async register(data) {
    const response = await api.post('/auth/register', data);
    if (response.data.accessToken) {
      this.setTokens(response.data);
    }
    return response.data;
  },

  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.accessToken) {
      this.setTokens(response.data);
    }
    return response.data;
  },

  async logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken });
    } finally {
      this.clearTokens();
    }
  },

  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data.user;
  },

  setTokens(data) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
  },

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  getStoredUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  },
};
