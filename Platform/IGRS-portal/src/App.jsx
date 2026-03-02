import React, { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

// Public pages
import Landing from "./pages/Landing";
import OfficialAuthPage from "./pages/government-officials/AuthPage";
import CitizenAuthPage from "./pages/citizen/AuthPage";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Layouts
import AdminLayout from "./pages/admin/Layout";
import OfficerLayout from "./pages/government-officials/Layout";

// Dashboard pages
import DepartmentDashboardNew from "./pages/department/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CitizenDashboard from "./pages/citizen/Dashboard";
import OfficerDashboard from "./pages/government-officials/DashboardPremium";

// Government Officials Portal Pages
import GrievanceList from "./pages/government-officials/components/GrievanceList";
import AreaHeatmap from "./pages/government-officials/AreaHeatmap";
import Chat from "./pages/government-officials/Chat";
import OfficialAnnouncements from "./pages/government-officials/Announcements";
import TaskManagement from './pages/government-officials/TaskManagement';
import Feedback from "./pages/government-officials/Feedback";
import WardOfficerDashboard from "./pages/government-officials/WardOfficerDashboard";
import MunicipalCommissionerDashboard from "./pages/government-officials/MunicipalCommissionerDashboard";
import DistrictCollectorDashboard from "./pages/government-officials/DistrictCollectorDashboard";
import RoleBasedDashboard from "./pages/government-officials/RoleBasedDashboard";
import GrievanceMap from "./components/GrievanceMap";

// Admin Portal Pages
import KnowledgeBaseManagement from "./pages/admin/KnowledgeBaseManagement";
import Settings from "./pages/admin/Settings";

// Inline Users Page Component
function UsersPage() {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('http://localhost:4000/api/admin/users', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
    })
    .then(res => res.json())
    .then(data => {
      // Filter out citizens - only show Users table entries
      const filteredUsers = (data.users || []).filter(u => u.role !== 'citizen');
      setUsers(filteredUsers);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">User Management</h1>
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{user.role}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{user.approval_status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function App() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="light">
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          
          {/* Portal-specific Authentication Routes */}
          <Route 
            path="/citizen-portal/authentication" 
            element={user ? <Navigate to={getRoleBasedPath(user)} replace /> : <CitizenAuthPage />} 
          />
          <Route 
            path="/officials-portal/authentication" 
            element={user ? <Navigate to={getRoleBasedPath(user)} replace /> : <OfficialAuthPage />} 
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Government Officers Portal - For officers WITHOUT department_id */}
          <Route
            path="/government/:officialId/*"
            element={
              <ProtectedRoute 
                allowedRoles={['department_officer', 'department_head', 'ward_officer', 'city_commissioner', 'district_collector', 'government_official']} 
                requireNoDepId={true}
              >
                <OfficerLayout userRole="government_officer" onLogout={logout} userAuth={user} />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OfficerDashboard userAuth={user} />} />
            <Route path="role-dashboard" element={<RoleBasedDashboard />} />
            <Route path="grievances" element={<GrievanceList />} />
            <Route path="map" element={<GrievanceMap />} />
            <Route path="heatmap" element={<AreaHeatmap />} />
            <Route path="chat" element={<Chat />} />
            <Route path="announcements" element={<OfficialAnnouncements userRole="government_officer" />} />
            <Route path="tasks" element={<TaskManagement />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Department Officers Portal - For officers WITH department_id */}
          <Route
            path="/department/:departmentId"
            element={
              <ProtectedRoute allowedRoles={['department_officer', 'department_head', 'ward_officer', 'city_commissioner', 'district_collector']} requireDepartmentMatch={true}>
                <DepartmentDashboardNew userAuth={user} />
              </ProtectedRoute>
            }
          />

          {/* Citizen Portal - Base URL: /citizen/:citizenId, tabs: /dashboard, /grievances, /profile, etc. */}
          <Route
            path="/citizen"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                {user?.id ? <Navigate to={`/citizen/${user.id}`} replace /> : <Navigate to="/citizen-portal/authentication" replace />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/:citizenId/*"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <Routes>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<CitizenDashboard userAuth={user} onLogout={logout} />} />
                  <Route path="profile" element={<CitizenDashboard userAuth={user} onLogout={logout} />} />
                  <Route path="grievances" element={<CitizenDashboard userAuth={user} onLogout={logout} />} />
                  <Route path="map" element={<GrievanceMap />} />
                  <Route path="statistics" element={<CitizenDashboard userAuth={user} onLogout={logout} />} />
                  <Route path="announcements" element={<CitizenDashboard userAuth={user} onLogout={logout} />} />
                  <Route path="community" element={<CitizenDashboard userAuth={user} onLogout={logout} />} />
                  <Route path="settings" element={<CitizenDashboard userAuth={user} onLogout={logout} />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Department Specific Dashboard - Protected Routes (real department_id in URL) */}
          <Route
            path="/department/:departmentId"
            element={
              <ProtectedRoute allowedRoles={['department_officer', 'department_head']} requireDepartmentMatch={true}>
                <DepartmentDashboardNew userAuth={user} />
              </ProtectedRoute>
            }
          />

          {/* Admin Portal - Protected Routes with AdminLayout */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout userAuth={user} onLogout={logout} />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard userAuth={user} />} />
            <Route path="users" element={
              <UsersPage />
            } />
            <Route path="knowledge-base" element={<KnowledgeBaseManagement />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          {/* Legacy redirects */}
          <Route path="/citizen-portal/*" element={<Navigate to="/citizen" replace />} />
          <Route path="/government-officials/*" element={<Navigate to="/officials-portal/authentication" replace />} />
          <Route path="/officer/*" element={<Navigate to="/officials-portal/authentication" replace />} />

          {/* 404 - Redirect to appropriate page */}
          <Route 
            path="*" 
            element={
              user ? <Navigate to={getRoleBasedPath(user)} replace /> : <Navigate to="/" replace />
            } 
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

// Helper function to get default path for each role (pass full user for department officials)
const getRoleBasedPath = (userOrRole, departmentName, depId) => {
  const user = userOrRole && typeof userOrRole === 'object' ? userOrRole : null;
  const role = user ? user.role : userOrRole;
  
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    
    case 'department_officer':
    case 'department_head':
    case 'ward_officer':
    case 'city_commissioner':
    case 'district_collector':
      // Department officers WITH department_id → department portal
      if (user?.department_id) return `/department/${user.department_id}`;
      if (depId) return `/department/${depId}`;
      // Department officers WITHOUT department_id → government portal
      if (user?.id) return `/government/${user.id}/dashboard`;
      return '/officials-portal/authentication';
    
    case 'government_official':
      // Government officials should NOT have department_id
      return user?.id ? `/government/${user.id}` : '/officials-portal/authentication';
    
    case 'citizen':
      return user?.id ? `/citizen/${user.id}` : '/citizen';
    
    default:
      return '/login';
  }
};

export default App;
