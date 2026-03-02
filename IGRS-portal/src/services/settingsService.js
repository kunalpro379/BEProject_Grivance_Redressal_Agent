import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const settingsService = {
  // Get all settings
  async getAllSettings() {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(`${API_URL}/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get API keys (masked)
  async getApiKeys() {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(`${API_URL}/settings/api-keys/list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Update API keys
  async updateApiKeys(keys) {
    const token = localStorage.getItem('accessToken');
    const response = await axios.put(
      `${API_URL}/settings/api-keys/update`,
      { keys },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Get research prompt
  async getResearchPrompt() {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(`${API_URL}/settings/research-prompt/get`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Update research prompt
  async updateResearchPrompt(prompt) {
    const token = localStorage.getItem('accessToken');
    const response = await axios.put(
      `${API_URL}/settings/research-prompt/update`,
      { prompt },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Get setting by key
  async getSettingByKey(key) {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(`${API_URL}/settings/${key}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Update setting by key
  async updateSetting(key, value) {
    const token = localStorage.getItem('accessToken');
    const response = await axios.put(
      `${API_URL}/settings/${key}`,
      { setting_value: value },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
};

export default settingsService;
