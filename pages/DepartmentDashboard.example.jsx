// Example: How to update DepartmentDashboard.jsx to use API instead of hardcoded data
// This is a reference file showing the key changes needed

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import departmentDashboardService from '../services/departmentDashboard.service';

const DepartmentDashboard = () => {
  const { departmentId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data from API
  useEffect(() => {
    fetchDashboardData();
  }, [departmentId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch complete dashboard data in one call
      const response = await departmentDashboardService.getCompleteDashboard(departmentId);
      
      if (response.success) {
        // Transform API data to match the component's expected structure
        const transformedData = {
          // Map API response to component data structure
          grievanceOverview: response.data.grievanceOverview,
          performanceMetrics: {
            kpiScore: response.data.grievanceOverview?.kpi_score,
            kpiTarget: response.data.grievanceOverview?.kpi_target,
            slaCompliance: response.data.grievanceOverview?.sla_compliance,
            avgResolutionTime: response.data.grievanceOverview?.avg_resolution_time,
            citizenSatisfaction: response.data.grievanceOverview?.citizen_satisfaction,
            performanceTrend: response.data.grievanceOverview?.performance_trend
          },
          resourceHealth: {
            staff: {
              available: response.data.resourceHealth?.staff_available,
              required: response.data.resourceHealth?.staff_required,
              utilizationRate: response.data.resourceHealth?.staff_utilization_rate,
              status: response.data.resourceHealth?.staff_status
            },
            equipment: {
              available: response.data.resourceHealth?.equipment_available,
              total: response.data.resourceHealth?.equipment_total,
              availabilityPercent: response.data.resourceHealth?.equipment_availability_percent,
              status: response.data.resourceHealth?.equipment_status
            },
            budget: {
              allocated: response.data.resourceHealth?.budget_allocated,
              used: response.data.resourceHealth?.budget_used,
              remaining: response.data.resourceHealth?.budget_remaining,
              utilizationPercent: response.data.resourceHealth?.budget_utilization_percent,
              status: response.data.resourceHealth?.budget_status
            },
            materials: {
              adequate: response.data.resourceHealth?.materials_adequate,
              lowStock: response.data.resourceHealth?.materials_low_stock,
              critical: response.data.resourceHealth?.materials_critical,
              status: response.data.resourceHealth?.materials_status
            }
          },
          tenderProjectStatus: response.data.tenderProjectStatus,
          zonePerformance: response.data.zonePerformance,
          grievanceTrends: response.data.grievanceTrends,
          aiInsights: response.data.aiInsights,
          alertsRiskMonitoring: response.data.alertsRiskMonitoring,
          recentActivityFeed: response.data.recentActivityFeed,
          departmentHealthScore: response.data.departmentHealthScore
        };
        
        setData(transformedData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
      
      // Optionally: Fall back to cached data or show error UI
      // toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Refresh dashboard data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4"> Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No dashboard data available</p>
        </div>
      </div>
    );
  }

  // Main dashboard render
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with refresh button */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Department Dashboard</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Total Grievances</h3>
            <p className="text-3xl font-bold">{data.grievanceOverview?.total_grievances || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Pending</h3>
            <p className="text-3xl font-bold text-yellow-600">{data.grievanceOverview?.pending_grievances || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Resolved</h3>
            <p className="text-3xl font-bold text-green-600">{data.grievanceOverview?.resolved_grievances || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Overdue</h3>
            <p className="text-3xl font-bold text-red-600">{data.grievanceOverview?.overdue_grievances || 0}</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-500 text-sm">KPI Score</p>
              <p className="text-2xl font-bold">{data.performanceMetrics?.kpiScore || 0}%</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">SLA Compliance</p>
              <p className="text-2xl font-bold">{data.performanceMetrics?.slaCompliance || 0}%</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Avg Resolution Time</p>
              <p className="text-2xl font-bold">{data.performanceMetrics?.avgResolutionTime || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Zone Performance */}
        {data.zonePerformance && data.zonePerformance.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">Zone Performance</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Zone</th>
                    <th className="text-left py-2">Active Grievances</th>
                    <th className="text-left py-2">Resolution Rate</th>
                    <th className="text-left py-2">Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {data.zonePerformance.map((zone, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">{zone.zone}</td>
                      <td className="py-2">{zone.active_grievances}</td>
                      <td className="py-2">{zone.resolution_rate}%</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-sm ${
                          zone.risk_level === 'High' ? 'bg-red-100 text-red-800' :
                          zone.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {zone.risk_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI Insights */}
        {data.aiInsights && data.aiInsights.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">AI Insights</h2>
            <div className="space-y-3">
              {data.aiInsights.slice(0, 5).map((insight, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <p className="font-semibold">{insight.message}</p>
                  <p className="text-sm text-gray-600">{insight.recommendation}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Confidence: {(insight.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts */}
        {data.alertsRiskMonitoring && data.alertsRiskMonitoring.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Active Alerts</h2>
            <div className="space-y-3">
              {data.alertsRiskMonitoring.map((alert, index) => (
                <div key={index} className={`p-4 rounded border-l-4 ${
                  alert.severity === 'Critical' ? 'bg-red-50 border-red-500' :
                  alert.severity === 'High' ? 'bg-orange-50 border-orange-500' :
                  alert.severity === 'Medium' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{alert.alert_type}</p>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      {alert.recommended_action && (
                        <p className="text-sm text-gray-500 mt-1">
                          Action: {alert.recommended_action}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      alert.severity === 'Critical' ? 'bg-red-600 text-white' :
                      alert.severity === 'High' ? 'bg-orange-600 text-white' :
                      alert.severity === 'Medium' ? 'bg-yellow-600 text-white' :
                      'bg-blue-600 text-white'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentDashboard;
