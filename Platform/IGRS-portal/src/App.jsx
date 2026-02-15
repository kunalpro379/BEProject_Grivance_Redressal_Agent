import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

// Public pages
import Landing from "./pages/Landing";
import OfficialAuthPage from "./pages/OfficialAuthPage";
import CitizenAuthPage from "./pages/CitizenAuthPage";

// Layout
import Layout from "./layout";
import AdminLayout from "./components/AdminLayout";

// Dashboard pages
import Dashboard from "./pages/Dashboard";
import GrievanceList from "./components/GrievanceList";
import AreaHeatmap from "./pages/AreaHeatmap";
import Chat from "./pages/Chat";
import OfficialAnnouncements from "./pages/OfficialAnnouncements";
import TaskManagement from './pages/TaskManagement';
import Feedback from "./pages/Feedback";

// Citizen pages
import CitizenDashboard from "./pages/CitizenDashboard";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
// Temporarily disabled - import UserManagement from "./pages/admin/UserManagement";

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
            element={user ? <Navigate to={getRoleBasedPath(user.role)} replace /> : <CitizenAuthPage />} 
          />
          <Route 
            path="/officials-portal/authentication" 
            element={user ? <Navigate to={getRoleBasedPath(user.role)} replace /> : <OfficialAuthPage />} 
          />

          {/* Citizen Portal - Protected Routes */}
          <Route
            path="/citizen/*"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <Routes>
                  <Route path="dashboard" element={<CitizenDashboard userAuth={user} onLogout={logout} />} />
                  <Route path="grievances" element={<CitizenDashboard userAuth={user} onLogout={logout} />} />
                  <Route path="statistics" element={<CitizenDashboard userAuth={user} onLogout={logout} />} />
                  <Route path="announcements" element={<CitizenDashboard userAuth={user} onLogout={logout} />} />
                  <Route path="community" element={<CitizenDashboard userAuth={user} onLogout={logout} />} />
                  <Route path="settings" element={<CitizenDashboard userAuth={user} onLogout={logout} />} />
                  <Route path="*" element={<Navigate to="/citizen/dashboard" replace />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Department Officer Portal - Protected Routes */}
          <Route
            path="/officer/*"
            element={
              <ProtectedRoute allowedRoles={['department_officer']}>
                <Layout userRole="department_officer" onLogout={logout} userAuth={user} />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard userAuth={user} />} />
            <Route path="grievances" element={<GrievanceList />} />
            <Route path="heatmap" element={<AreaHeatmap />} />
            <Route path="chat" element={<Chat />} />
            <Route path="announcements" element={<OfficialAnnouncements userRole="department_officer" />} />
            <Route path="tasks" element={<TaskManagement />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="*" element={<Navigate to="/officer/dashboard" replace />} />
          </Route>

          {/* Department Head Portal - Protected Routes */}
          <Route
            path="/department/*"
            element={
              <ProtectedRoute allowedRoles={['department_head']}>
                <Layout userRole="department_head" onLogout={logout} userAuth={user} />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard userAuth={user} />} />
            <Route path="grievances" element={<GrievanceList />} />
            <Route path="heatmap" element={<AreaHeatmap />} />
            <Route path="chat" element={<Chat />} />
            <Route path="announcements" element={<OfficialAnnouncements userRole="department_head" />} />
            <Route path="tasks" element={<TaskManagement />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="*" element={<Navigate to="/department/dashboard" replace />} />
          </Route>

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
            <Route path="knowledge-base" element={<div className="p-6 bg-white rounded-xl shadow-sm"><h2 className="text-2xl font-bold text-gray-900">Knowledge Base</h2><p className="text-gray-600 mt-2">Coming soon...</p></div>} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          {/* Legacy redirects */}
          <Route path="/citizen-portal/*" element={<Navigate to="/citizen/dashboard" replace />} />
          <Route path="/officials-portal/*" element={<Navigate to="/officer/dashboard" replace />} />

          {/* 404 - Redirect to appropriate page */}
          <Route 
            path="*" 
            element={
              user ? <Navigate to={getRoleBasedPath(user.role)} replace /> : <Navigate to="/" replace />
            } 
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

// Helper function to get default path for each role
const getRoleBasedPath = (role) => {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'department_officer':
      return '/officer/dashboard';
    case 'department_head':
      return '/department/dashboard';
    case 'citizen':
      return '/citizen/dashboard';
    default:
      return '/login';
  }
};

export default App;
