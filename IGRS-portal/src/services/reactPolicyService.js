import api from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const reactPolicyService = {
  /**
   * Fetch department policies using REACT agent (guaranteed results)
   * Returns raw text data without any modifications
   */
  async fetchPoliciesWithReactAgent(departmentId, options = {}) {
    try {
      const {
        maxAttempts = 10,
        retryDelay = 2.0,
      } = options;

      const response = await api.get(
        `/api/vector/policies/department/${departmentId}/react`,
        {
          params: {
            max_attempts: maxAttempts,
            retry_delay: retryDelay,
          },
          timeout: maxAttempts * retryDelay * 1000 + 30000,
        }
      );

      return response.data;
    } catch (error) {
      console.error('REACT agent error:', error);
      throw error;
    }
  },

  /**
   * Extract all policy text data in raw format
   */
  extractRawPolicyText(policies) {
    if (!policies || policies.length === 0) {
      return 'NO POLICIES FOUND';
    }

    let rawText = '';
    
    policies.forEach((policy, index) => {
      rawText += `POLICY ${index + 1}\n`;
      rawText += `ID: ${policy.id}\n`;
      rawText += `TITLE: ${policy.title}\n`;
      rawText += `DEPARTMENT_ID: ${policy.department_id}\n`;
      rawText += `CREATED_AT: ${policy.created_at}\n`;
      rawText += `FILE_URL: ${policy.file_url || 'N/A'}\n`;
      rawText += `SIMILARITY_SCORE: ${policy.similarity_score || 'N/A'}\n`;
      rawText += `METADATA: ${JSON.stringify(policy.metadata || {})}\n`;
      rawText += `CONTENT:\n${policy.content}\n`;
      rawText += `\n${'='.repeat(80)}\n\n`;
    });

    return rawText;
  },

  /**
   * Check if REACT agent is available
   */
  async checkAgentHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        timeout: 5000,
      });
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      return false;
    }
  },
};

export default reactPolicyService;
