import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./pages/Dashboard";
import React from "react";
import Layout from "./layout";
import GrievanceList from "./components/GrievanceList";
import AreaHeatmap from "./pages/AreaHeatmap";
import Chat from "./pages/Chat";
import Announcements from "./pages/Announcements";
import OfficialAnnouncements from "./pages/OfficialAnnouncements";
import { ThemeProvider } from "./components/ThemeProvider";
import TaskManagement from './pages/TaskManagement';
import Feedback from "./pages/Feedback";
import Landing from "./pages/Landing";
import CitizenAuthPage from "./pages/CitizenAuthPage";
import OfficialAuthPage from "./pages/OfficialAuthPage";
import CitizenHome from "./pages/CitizenHome";
import CitizenDashboard from "./pages/CitizenDashboard";
import Grievances from "./pages/Grievances";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

function App() {
  const { user, loading } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [userData, setUserData] = useState(null);

  // Sync with new auth system
  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
      setUserRole(user.role === 'citizen' ? 'citizen' : 'official');
      setUserData(user);
    } else {
      // Check for legacy auth
      const storedAuth = localStorage.getItem('isAuthenticated');
      const storedRole = localStorage.getItem('userRole');
      const storedUserData = localStorage.getItem('userData');

      if (storedAuth === 'true' && storedRole && storedUserData) {
        setIsAuthenticated(true);
        setUserRole(storedRole);
        setUserData(JSON.parse(storedUserData));
      }
    }
  }, [user]);

  const handleLogin = (role, data) => {
    setIsAuthenticated(true);
    setUserRole(role);
    setUserData(data);
    
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', role);
    localStorage.setItem('userData', JSON.stringify(data));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole("");
    setUserData(null);
    
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
  };

  const grievances = [
    {
      id: 1,
      title: "Broken Street Light",
      category: "Infrastructure",
      status: "Pending",
      description: "The street light near the park is broken for weeks.",
      attachments: [{ name: "image1.pdf", url: "https://example.com/image1.pdf" }],
    },
    {
      id: 2,
      title: "Water Leakage Issue",
      category: "Water Supply",
      status: "Resolved",
      description: "There is a major water leakage near the main road.",
      attachments: [{ name: "report.pdf", url: "https://example.com/report.pdf" }],
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
          {/* Public landing */}
          <Route path="/" element={<Landing />} />

          {/* New Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Legacy Authentication Routes */}
          <Route
            path="/citizen-portal/authentication"
            element={isAuthenticated && userRole === "citizen" ? (
              <Navigate to="/citizen-portal/dashboard" replace />
            ) : (
              <CitizenAuthPage />
            )}
          />
          
          <Route
            path="/officials-portal/authentication"
            element={isAuthenticated && userRole === "official" ? (
              <Navigate to="/officials-portal/dashboard" replace />
            ) : (
              <OfficialAuthPage />
            )}
          />

          {/* Aliases */}
          <Route path="/citizens-portal/dashboard" element={<Navigate to="/citizen-portal/dashboard" replace />} />
          <Route path="/oficials-portal/dashboard" element={<Navigate to="/officials-portal/dashboard" replace />} />
          
          {/* Citizen Portal Routes */}
          <Route path="/citizen-portal/home" element={
            isAuthenticated && userRole === "citizen" ? 
              <CitizenHome userAuth={userData} onLogout={handleLogout} /> : 
              <Navigate to="/citizen-portal/authentication" replace />
          } />
          <Route path="/citizen-portal/dashboard" element={
            isAuthenticated && userRole === "citizen" ? 
              <CitizenDashboard userAuth={userData} onLogout={handleLogout} /> : 
              <Navigate to="/citizen-portal/authentication" replace />
          } />
          <Route path="/citizen-portal/grievances" element={
            isAuthenticated && userRole === "citizen" ? 
              <CitizenDashboard userAuth={userData} onLogout={handleLogout} /> : 
              <Navigate to="/citizen-portal/authentication" replace />
          } />
          <Route path="/citizen-portal/statistics" element={
            isAuthenticated && userRole === "citizen" ? 
              <CitizenDashboard userAuth={userData} onLogout={handleLogout} /> : 
              <Navigate to="/citizen-portal/authentication" replace />
          } />
          <Route path="/citizen-portal/announcements" element={
            isAuthenticated && userRole === "citizen" ? 
              <CitizenDashboard userAuth={userData} onLogout={handleLogout} /> : 
              <Navigate to="/citizen-portal/authentication" replace />
          } />
          <Route path="/citizen-portal/community" element={
            isAuthenticated && userRole === "citizen" ? 
              <CitizenDashboard userAuth={userData} onLogout={handleLogout} /> : 
              <Navigate to="/citizen-portal/authentication" replace />
          } />
          <Route path="/citizen-portal/settings" element={
            isAuthenticated && userRole === "citizen" ? 
              <CitizenDashboard userAuth={userData} onLogout={handleLogout} /> : 
              <Navigate to="/citizen-portal/authentication" replace />
          } />
          <Route path="/citizen-portal/*" element={
            isAuthenticated && userRole === "citizen" ? 
              <Navigate to="/citizen-portal/dashboard" replace /> : 
              <Navigate to="/citizen-portal/authentication" replace />
          } />

          {/* Officials Portal Routes */}
          {isAuthenticated && userRole === "official" ? (
            <Route path="/officials-portal" element={<Layout userRole={userRole} onLogout={handleLogout} userAuth={userData} />}>
              <Route path="dashboard" element={<Dashboard userAuth={userData} />} />
              <Route path="grievances" element={<GrievanceList grievances={grievances} />} />
              <Route path="heatmap" element={<AreaHeatmap />} />
              <Route path="chat" element={<Chat />} />
              <Route path="announcements" element={<OfficialAnnouncements userRole={userRole} />} />
              <Route path="tasks" element={<TaskManagement />} />
              <Route path="feedback" element={<Feedback />} />
              <Route path="*" element={<Navigate to="/officials-portal/dashboard" replace />} />
            </Route>
          ) : (
            <Route path="/officials-portal/*" element={<Navigate to="/officials-portal/authentication" replace />} />
          )}

          {/* New Protected Routes for Admin */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout userRole="admin" onLogout={handleLogout} userAuth={user} />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard userAuth={user} />} />
            <Route path="grievances" element={<GrievanceList grievances={grievances} />} />
            <Route path="tasks" element={<TaskManagement />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
