import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Clock, TrendingUp } from 'lucide-react';
import adminService from '../../services/adminService';

const AdminDashboard = ({ userAuth }) => {
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, pendingData] = await Promise.all([
        adminService.getUserStats(),
        adminService.getPendingUsers()
      ]);
      
      setStats(statsData.stats);
      setPendingUsers(pendingData.users);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await adminService.approveUser(userId);
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to approve user:', err);
      alert('Failed to approve user');
    }
  };

  const handleReject = async (userId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await adminService.rejectUser(userId, reason);
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to reject user:', err);
      alert('Failed to reject user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage user approvals and system overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats?.total_users || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Pending Approvals"
          value={stats?.pending_users || 0}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Approved Users"
          value={stats?.approved_users || 0}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="Rejected Users"
          value={stats?.rejected_users || 0}
          icon={UserX}
          color="red"
        />
      </div>

      {/* User Role Distribution */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">User Distribution by Role</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <RoleCard title="Citizens" count={stats?.citizens || 0} />
          <RoleCard title="Officers" count={stats?.officers || 0} />
          <RoleCard title="Dept. Heads" count={stats?.department_heads || 0} />
          <RoleCard title="Admins" count={stats?.admins || 0} />
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Pending User Approvals</h2>
            <p className="text-gray-600 text-sm mt-1">
              {pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} awaiting approval
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingUsers.map((user) => (
              <div key={user.id} className="p-6 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">{user.full_name}</h3>
                    <p className="text-gray-600">{user.email}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-gray-500">
                        Role: <span className="font-medium text-gray-700">{formatRole(user.role)}</span>
                      </span>
                      {user.department_name && (
                        <span className="text-gray-500">
                          Department: <span className="font-medium text-gray-700">{user.department_name}</span>
                        </span>
                      )}
                      <span className="text-gray-500">
                        Phone: <span className="font-medium text-gray-700">{user.phone || 'N/A'}</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Registered: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(user.id)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2 font-medium shadow-sm"
                    >
                      <UserCheck size={18} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(user.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 font-medium shadow-sm"
                    >
                      <UserX size={18} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingUsers.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
          <UserCheck size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No Pending Approvals</h3>
          <p className="text-gray-500 mt-2">All user registrations have been processed</p>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    yellow: 'bg-amber-50 text-amber-600 border-amber-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    red: 'bg-red-50 text-red-600 border-red-100',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2 text-gray-900">{value}</p>
        </div>
        <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
          <Icon size={28} />
        </div>
      </div>
    </div>
  );
};

const RoleCard = ({ title, count }) => {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 text-center border border-gray-200 hover:shadow-md transition-shadow">
      <p className="text-3xl font-bold text-gray-900">{count}</p>
      <p className="text-sm text-gray-600 mt-1 font-medium">{title}</p>
    </div>
  );
};

const formatRole = (role) => {
  const roleMap = {
    'citizen': 'Citizen',
    'department_officer': 'Department Officer',
    'department_head': 'Department Head',
    'admin': 'Administrator'
  };
  return roleMap[role] || role;
};

export default AdminDashboard;
