import axios from 'axios';

// Hardcoded to ensure correct port
const API_URL = 'http://localhost:4000/api';

const knowledgeBaseService = {
  // Upload PDF file
  uploadPDF: async (file) => {
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await axios.post(`${API_URL}/knowledgebase/upload-pdf`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    return response.data;
  },

  // Add URL for crawling
  addURL: async (url, description) => {
    const response = await axios.post(
      `${API_URL}/knowledgebase/add-url`,
      { url, description },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      }
    );
    return response.data;
  },

  // Get all knowledge base entries
  getAll: async (params = {}) => {
    const response = await axios.get(`${API_URL}/knowledgebase`, {
      params,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    return response.data;
  },

  // Delete knowledge base entry
  delete: async (id) => {
    const response = await axios.delete(`${API_URL}/knowledgebase/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    return response.data;
  }
};

export default knowledgeBaseService;
