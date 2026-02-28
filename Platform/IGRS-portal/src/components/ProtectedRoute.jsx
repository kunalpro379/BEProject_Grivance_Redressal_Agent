import React, { useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDepartmentId } from '../utils/departmentMapping';

const ProtectedRoute = ({ children, allowedRoles = [], requireDepartmentMatch = false, requireNoDepId = false }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  const params = useParams();

  // Log access attempts for security monitoring
  useEffect(() => {
    if (!loading && user) {
      console.log('[Security] Route access:', {
        path: location.pathname,
        userRole: user.role,
        userId: user.id,
        departmentId: user.department_id,
        allowedRoles,
        requireNoDepId,
        timestamp: new Date().toISOString()
      });
    }
  }, [location.pathname, user, loading, allowedRoles, requireNoDepId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const isCitizenRoute = location.pathname.startsWith('/citizen');
    const to = isCitizenRoute ? '/citizen-portal/authentication' : '/officials-portal/authentication';
    return <Navigate to={to} state={{ from: location }} replace />;
  }

  // Check if government route is being accessed by officer WITH department_id (should use department portal instead)
  if (requireNoDepId && user?.department_id) {
    console.warn('[Security] Government portal access denied - user has department_id:', {
      userId: user.id,
      departmentId: user.department_id,
      path: location.pathname
    });
    return <Navigate to={`/department/${user.department_id}`} replace />;
  }

  // Only check role when we have allowedRoles and user has a role (avoid redirecting while user is still empty)
  const hasRole = user?.role != null;
  const roleNotAllowed = allowedRoles.length > 0 && hasRole && !allowedRoles.includes(user.role);
  
  if (roleNotAllowed) {
    console.warn('[Security] Access denied - insufficient role:', {
      userRole: user.role,
      requiredRoles: allowedRoles,
      path: location.pathname
    });
    
    const redirectPath = getRoleBasedPath(user);
    if (redirectPath !== location.pathname) {
      return <Navigate to={redirectPath} replace />;
    }
  }

  // Additional security check: verify department access for department-specific routes
  if (requireDepartmentMatch && ['department_officer', 'department_head', 'ward_officer', 'city_commissioner', 'district_collector'].includes(user.role)) {
    const { departmentId, officialId, depId } = params;
    const routeDepartmentId = departmentId || depId;
    
    // Check if user is trying to access another department's data
    if (routeDepartmentId && user.department_id && routeDepartmentId !== user.department_id) {
      console.warn('[Security] Department access denied:', {
        userDepartmentId: user.department_id,
        requestedDepId: routeDepartmentId,
        userId: user.id,
        path: location.pathname
      });
      
      // Redirect to user's own department
      return <Navigate to={`/department/${user.department_id}`} replace />;
    }

    // Check if user is trying to access another official's dashboard
    if (officialId && user.id && String(officialId) !== String(user.id)) {
      console.warn('[Security] Official ID mismatch:', {
        userId: user.id,
        requestedOfficialId: officialId,
        path: location.pathname
      });
      
      // Redirect based on whether user has department_id or not
      if (user.department_id) {
        return <Navigate to={`/department/${user.department_id}`} replace />;
      } else {
        return <Navigate to={`/government/${user.id}`} replace />;
      }
    }
  }

  return children;
};

// Helper function to get default path for each role (pass full user for department officials)
const getRoleBasedPath = (user) => {
  const role = user?.role;
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'department_officer':
    case 'department_head':
    case 'ward_officer':
    case 'city_commissioner':
    case 'district_collector':
      // Officers WITH department_id → department portal
      if (user?.department_id) return `/department/${user.department_id}`;
      // Officers WITHOUT department_id → government portal
      if (user?.id) return `/government/${user.id}/dashboard`;
      return '/officials-portal/authentication';
    case 'citizen':
      return user?.id ? `/citizen/${user.id}` : '/citizen';
    default:
      return '/';
  }
};

export default ProtectedRoute;
