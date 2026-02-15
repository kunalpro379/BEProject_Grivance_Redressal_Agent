import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to appropriate authentication page based on attempted route
    const isCitizenRoute = location.pathname.startsWith('/citizen');
    const redirectPath = isCitizenRoute 
      ? '/citizen-portal/authentication' 
      : '/officials-portal/authentication';
    
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = getRoleBasedPath(user?.role);
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

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
      return '/citizen/portal';
    default:
      return '/';
  }
};

export default ProtectedRoute;
