import { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Clock, ArrowRight, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';

const isOfficerOrHead = (role) => role === 'department_officer' || role === 'department_head';
const isDepartmentOfficer = (user) => isOfficerOrHead(user.role) && !user.is_government_official;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approveTarget, setApproveTarget] = useState(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (pendingUsers.some((u) => isDepartmentOfficer(u))) {
      adminService.getDepartments().then((data) => setDepartments(data.departments || [])).catch(() => {});
    }
  }, [pendingUsers.length]);

  useEffect(() => {
    if (approveTarget && isDepartmentOfficer(approveTarget) && departments.length === 0) {
      adminService.getDepartments().then((data) => {
        const list = data.departments || [];
        setDepartments(list);
        if (list.length && !selectedDepartmentId) setSelectedDepartmentId(list[0].id);
      }).catch(() => {});
    }
  }, [approveTarget?.id]);

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

  const handleApproveClick = (user) => {
    if (isDepartmentOfficer(user)) {
      setApproveTarget(user);
      setSelectedDepartmentId(departments[0]?.id || '');
    } else {
      handleApprove(user.id);
    }
  };

  const handleApprove = async (userId, body = {}) => {
    try {
      setApproving(true);
      await adminService.approveUser(userId, body);
      setApproveTarget(null);
      setSelectedDepartmentId('');
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to approve user:', err);
      if (err.response?.data?.error) alert(err.response.data.error);
    } finally {
      setApproving(false);
    }
  };

  const handleApproveConfirm = () => {
    if (!approveTarget) return;
    if (isDepartmentOfficer(approveTarget) && !selectedDepartmentId) {
      alert('Please select a department to allocate.');
      return;
    }
    const body = isDepartmentOfficer(approveTarget) ? { department_id: selectedDepartmentId } : {};
    handleApprove(approveTarget.id, body);
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
                <th className="px-4 py-2 text-left text-xs font-black text-gray-900 uppercase tracking-wide">Details</th>
                <th className="px-4 py-2 text-left text-xs font-black text-gray-900 uppercase tracking-wide">Allocate dept</th>
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
                      {formatRole(user.role, user.is_government_official)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_government_official && user.hierarchy_info ? (
                      <div className="text-xs">
                        <div className="font-bold text-green-700 mb-1">Government Official</div>
                        <div className="text-gray-600">{formatHierarchyInfo(user)}</div>
                        {user.hierarchy_info.designation && (
                          <div className="text-gray-500 mt-0.5">{user.hierarchy_info.designation}</div>
                        )}
                      </div>
                    ) : user.department_name ? (
                      <div className="text-xs">
                        <div className="font-semibold text-gray-700">Department Officer</div>
                        <div className="text-gray-600">{user.department_name}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                    {user.is_government_official ? (
                      <span className="text-xs text-green-600 font-bold">Gov. Official (No Dept)</span>
                    ) : isDepartmentOfficer(user) ? (
                      <span className="text-xs text-gray-500">Select on Approve</span>
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
                        onClick={() => handleApproveClick(user)}
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

      {/* Modal: Select department to allocate (officer/head) */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-2 border-black rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-black text-gray-900 mb-1">Allocate Department</h3>
            <p className="text-sm text-gray-600 mb-4">
              Approve <strong>{approveTarget.full_name}</strong> ({formatRole(approveTarget.role, approveTarget.is_government_official)}) and assign to a department.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Department</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-md focus:ring-2 focus:ring-black focus:border-black text-sm"
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setApproveTarget(null); setSelectedDepartmentId(''); }}
                className="px-4 py-2 border-2 border-black rounded-md font-bold text-sm uppercase hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveConfirm}
                disabled={approving || (isDepartmentOfficer(approveTarget) && !selectedDepartmentId)}
                className="px-4 py-2 bg-black text-white rounded-md font-bold text-sm uppercase hover:bg-gray-800 disabled:opacity-50"
              >
                {approving ? 'Approving…' : 'Approve & Allocate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const formatRole = (role, isGovOfficial) => {
  if (isGovOfficial) {
    return 'Gov. Official';
  }
  const roleMap = {
    'citizen': 'Citizen',
    'department_officer': 'Officer',
    'department_head': 'Dept. Head',
    'admin': 'Admin'
  };
  return roleMap[role] || role;
};

const formatHierarchyInfo = (user) => {
  if (!user.hierarchy_info) return null;
  const info = user.hierarchy_info;
  
  switch (info.hierarchy_level) {
    case 'state_central':
      return `${info.level_type || 'State/Central'} - ${info.ministry_name || 'N/A'}`;
    case 'district':
      return `District: ${info.district || 'N/A'}`;
    case 'taluka':
      return `Taluka: ${info.taluka || 'N/A'}, District: ${info.district || 'N/A'}`;
    case 'city':
      return `City: ${info.city || 'N/A'}, District: ${info.district || 'N/A'}`;
    case 'ward':
      return `Ward: ${info.ward_number || 'N/A'}, City: ${info.city || 'N/A'}`;
    default:
      return null;
  }
};

export default AdminDashboard;
