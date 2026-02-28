const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/** Try to refresh access token. Returns new accessToken or null. Updates localStorage on success. */
async function tryRefreshAccessToken() {
  const refreshToken = typeof localStorage !== 'undefined' ? localStorage.getItem('refreshToken') : null;
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      return data.accessToken;
    }
    return null;
  } catch (err) {
    // Network errors or server unreachable - token refresh failed
    return null;
  }
}

class DepartmentDashboardService {
  async getStats(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    const json = await response.json();
    return json.stats;
  }

  async getCompleteDashboard(depId, token) {
    let response;
    try {
      response = await fetch(`${API_URL}/api/department-dashboard/${depId}/complete`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (fetchError) {
      // Network error (connection refused, etc.)
      const errorMsg = fetchError.message || fetchError.toString();
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('ERR_CONNECTION_REFUSED')) {
        throw new Error('Connection refused. Please check if the server is running.');
      }
      throw fetchError;
    }

    if (response.status === 401) {
      const newToken = await tryRefreshAccessToken();
      if (newToken) {
        try {
          response = await fetch(`${API_URL}/api/department-dashboard/${depId}/complete`, {
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (refreshError) {
          // Refresh also failed - session expired
          throw new Error('Session expired. Please log in again.');
        }
      } else {
        // Token refresh failed - session expired
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error || 'Failed to fetch dashboard data';
      const isAuthError = response.status === 401 || /token expired|unauthorized/i.test(msg);
      // Don't log expected auth errors - they trigger redirect
      if (!isAuthError) {
        console.error('Dashboard fetch error:', response.status, errorData);
      }
      throw new Error(isAuthError ? 'Session expired. Please log in again.' : msg);
    }

    return await response.json();
  }

  async getGrievances(depId, token, filters = {}) {
    // Filter out undefined/null values and 'all' values before creating URLSearchParams
    const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== 'all' && value !== 'undefined') {
        acc[key] = value;
      }
      return acc;
    }, {});
    const params = new URLSearchParams(cleanFilters);
    const response = await fetch(
      `${API_URL}/api/department-dashboard/${depId}/grievances?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch grievances');
    }

    return await response.json();
  }

  async getGrievanceById(depId, grievanceId, token) {
    let response = await fetch(
      `${API_URL}/api/department-dashboard/${depId}/grievances/${encodeURIComponent(grievanceId)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    if (response.status === 401) {
      const newToken = await tryRefreshAccessToken();
      if (newToken) {
        response = await fetch(
          `${API_URL}/api/department-dashboard/${depId}/grievances/${encodeURIComponent(grievanceId)}`,
          {
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch grievance details');
    }
    return await response.json();
  }

  async getGrievancesForMap(depId, token, limit = 200) {
    const response = await fetch(
      `${API_URL}/api/department-dashboard/${depId}/grievances/map?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch grievances for map');
    }

    return await response.json();
  }

  async getCostTracking(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/cost-tracking`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch cost tracking');
    return await response.json();
  }

  async getAnalytics(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/analytics`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch analytics');
    return await response.json();
  }

  async getStaff(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/staff`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch staff');
    return await response.json();
  }

  async getEquipment(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/equipment`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch equipment');
    return await response.json();
  }

  async getMaterials(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/materials`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch materials');
    return await response.json();
  }

  async getContractors(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/contractors`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch contractors');
    return await response.json();
  }

  async getZoneAllocation(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/zone-allocation`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch zone allocation');
    return await response.json();
  }

  async getBudgetProjects(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/budget-projects`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch budget projects');
    return await response.json();
  }

  async getResourceRequests(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/resource-requests`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch resource requests');
    return await response.json();
  }

  async getEscalations(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/escalations`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch escalations');
    return await response.json();
  }

  async getAiInsights(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/ai-insights`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch AI insights');
    return await response.json();
  }

  async getCitizenFeedback(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/citizen-feedback`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch citizen feedback');
    return await response.json();
  }

  async getPredictiveMaintenance(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/predictive-maintenance`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch predictive maintenance');
    return await response.json();
  }

  async getKnowledgeBase(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/knowledge-base`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch knowledge base');
    return await response.json();
  }

  async uploadKnowledgeBaseDocument(depId, formData, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/knowledge-base/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (!response.ok) throw new Error('Failed to upload document');
    return await response.json();
  }

  async generateShareableLink(depId, docId, token, expiryMinutes = 60) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/knowledge-base/${docId}/generate-link`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expiryMinutes })
    });
    if (!response.ok) throw new Error('Failed to generate shareable link');
    return await response.json();
  }

  async getOfficers(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/officers`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch officers');
    return await response.json();
  }

  async getAuditLogs(depId, token) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/audit-logs`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch audit logs');
    return await response.json();
  }

  async updateDashboard(depId, token, dashboardData) {
    const response = await fetch(`${API_URL}/api/department-dashboard/${depId}/update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ dashboardData })
    });

    if (!response.ok) {
      throw new Error('Failed to update dashboard');
    }

    return await response.json();
  }
}

export default new DepartmentDashboardService();
