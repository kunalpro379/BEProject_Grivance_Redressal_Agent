import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import WardOfficerDashboard from './WardOfficerDashboard';
import CityCommissionerDashboard from './CityCommissionerDashboard';
import DistrictCollectorDashboard from './DistrictCollectorDashboard';

const RoleBasedDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      console.log('Fetching dashboard with token:', token ? 'Token exists' : 'No token');
      
      const response = await api.get('/dashboard/role-dashboard');

      console.log('Dashboard response:', response.data);
      
      // Store roleName in the data for child components
      const dashboardDataWithRole = {
        ...response.data,
        user: {
          ...response.data.user,
          roleName: response.data.roleName || response.data.user?.roleName
        }
      };
      
      setDashboardData(dashboardDataWithRole);
      setLoading(false);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to load dashboard');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF5E8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#D4AF37] mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF5E8] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-red-500 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-6 px-6 py-2 bg-[#D4AF37] text-white rounded-lg font-bold hover:bg-[#C5A028] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  const renderDashboard = () => {
    switch (dashboardData?.role) {
      case 'ward_officer':
      case 'department_officer': // Also handle department_officer
        return <WardOfficerDashboard data={dashboardData} />;
      case 'city_commissioner':
        return <CityCommissionerDashboard data={dashboardData} />;
      case 'district_collector':
        return <DistrictCollectorDashboard data={dashboardData} />;
      case 'department_head':
        // Department heads should use the department officer dashboard
        return <WardOfficerDashboard data={dashboardData} />;
      default:
        return (
          <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF5E8] p-6">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-8 shadow-lg border-2 border-[#D4AF37]"
              >
                <h1 className="text-3xl font-bold text-black mb-4">
                  Welcome, {dashboardData?.user?.name || 'User'}
                </h1>
                <div className="space-y-2 mb-6">
                  <p className="text-gray-600">
                    <span className="font-semibold">Role:</span> {dashboardData?.role || 'Not assigned'}
                  </p>
                  {dashboardData?.user?.designation && (
                    <p className="text-gray-600">
                      <span className="font-semibold">Designation:</span> {dashboardData.user.designation}
                    </p>
                  )}
                  {dashboardData?.user?.department && (
                    <p className="text-gray-600">
                      <span className="font-semibold">Department:</span> {dashboardData.user.department}
                    </p>
                  )}
                </div>
                <div className="mt-6 p-6 bg-amber-50 border-2 border-amber-400 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">!</span>
                    </div>
                    <div>
                      <p className="text-amber-900 font-semibold mb-2">
                        Account Setup Incomplete
                      </p>
                      <p className="text-amber-800 text-sm">
                        Your account is registered but requires admin approval and department allocation. 
                        Please contact your system administrator to complete your account setup.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        );
    }
  };

  return renderDashboard();
};

export default RoleBasedDashboard;
