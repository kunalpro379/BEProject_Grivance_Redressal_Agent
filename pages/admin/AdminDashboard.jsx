import { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
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
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section - Slim */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-black">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">DASHBOARD</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">System Overview & User Management</p>
        </div>
        <button
          onClick={() => navigate('/admin/users')}
          className="px-5 py-2.5 bg-black text-white rounded-md hover:bg-gray-800 transition flex items-center gap-2 font-bold text-sm"
        >
          VIEW ALL USERS
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Bar - Slim & Bold */}
      <div className="bg-black text-white rounded-md p-4">
        <div className="grid grid-cols-4 divide-x divide-gray-700">
          <div className="px-4 first:pl-0 last:pr-0">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" />
              <div>
                <p className="text-xs font-semibold opacity-80">TOTAL USERS</p>
                <p className="text-3xl font-black">{stats?.total_users || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="px-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              <div>
                <p className="text-xs font-semibold opacity-80">PENDING</p>
                <p className="text-3xl font-black">{stats?.pending_users || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="px-4">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5" />
              <div>
                <p className="text-xs font-semibold opacity-80">APPROVED</p>
                <p className="text-3xl font-black">{stats?.approved_users || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="px-4">
            <div className="flex items-center gap-3">
              <UserX className="w-5 h-5" />
              <div>
                <p className="text-xs font-semibold opacity-80">REJECTED</p>
                <p className="text-3xl font-black">{stats?.rejected_users || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Distribution - Slim */}
      <div className="bg-white border-2 border-black rounded-md p-4">
        <h2 className="text-sm font-black text-gray-900 mb-3 uppercase tracking-wide">User Distribution</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center border-l-4 border-black pl-3">
            <div className="text-3xl font-black text-gray-900">{stats?.citizens || 0}</div>
            <div className="text-xs text-gray-600 mt-0.5 font-bold uppercase">Citizens</div>
          </div>
          <div className="text-center border-l-4 border-black pl-3">
            <div className="text-3xl font-black text-gray-900">{stats?.officers || 0}</div>
            <div className="text-xs text-gray-600 mt-0.5 font-bold uppercase">Officers</div>
          </div>
          <div className="text-center border-l-4 border-black pl-3">
            <div className="text-3xl font-black text-gray-900">{stats?.department_heads || 0}</div>
            <div className="text-xs text-gray-600 mt-0.5 font-bold uppercase">Dept. Heads</div>
          </div>
          <div className="text-center border-l-4 border-black pl-3">
            <div className="text-3xl font-black text-gray-900">{stats?.admins || 0}</div>
            <div className="text-xs text-gray-600 mt-0.5 font-bold uppercase">Admins</div>
          </div>
        </div>
      </div>

      {/* Pending Approvals Table - Slim */}
      {pendingUsers.length > 0 ? (
        <div className="bg-white border-2 border-black rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-black text-white">
            <h2 className="text-sm font-black uppercase tracking-wide">Pending Approvals</h2>
            <p className="text-xs opacity-80 mt-0.5 font-semibold">{pendingUsers.length} users awaiting approval</p>
          </div>
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-black">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-black text-gray-900 uppercase tracking-wide">User</th>
                <th className="px-4 py-2 text-left text-xs font-black text-gray-900 uppercase tracking-wide">Role</th>
                <th className="px-4 py-2 text-left text-xs font-black text-gray-900 uppercase tracking-wide">Department</th>
                <th className="px-4 py-2 text-left text-xs font-black text-gray-900 uppercase tracking-wide">Dept ID</th>
                <th className="px-4 py-2 text-left text-xs font-black text-gray-900 uppercase tracking-wide">Registered</th>
                <th className="px-4 py-2 text-right text-xs font-black text-gray-900 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pendingUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-900 text-sm">{user.full_name}</div>
                    <div className="text-xs text-gray-500 font-medium">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-black text-white rounded text-xs font-bold uppercase">
                      {formatRole(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                    {user.department_name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {user.dep_id ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-900 rounded text-xs font-bold border border-blue-300">
                        {user.dep_id}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleApprove(user.id)}
                        className="px-3 py-1.5 bg-black text-white text-xs rounded hover:bg-gray-800 font-bold uppercase"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(user.id)}
                        className="px-3 py-1.5 border-2 border-black text-black text-xs rounded hover:bg-gray-50 font-bold uppercase"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border-2 border-black rounded-md p-8 text-center">
          <UserCheck size={40} className="mx-auto text-gray-400 mb-3" />
          <h3 className="text-base font-black text-gray-700 uppercase">No Pending Approvals</h3>
          <p className="text-gray-500 mt-1 text-sm font-medium">All user registrations have been processed</p>
        </div>
      )}
    </div>
  );
};

const formatRole = (role) => {
  const roleMap = {
    'citizen': 'Citizen',
    'department_officer': 'Officer',
    'department_head': 'Dept. Head',
    'admin': 'Admin'
  };
  return roleMap[role] || role;
};

export default AdminDashboard;
