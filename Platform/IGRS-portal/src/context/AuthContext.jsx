import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      const storedUser = authService.getCurrentUser();
      const token = authService.getAccessToken();

      if (storedUser && token) {
        // Migrate old dep_id to department_id
        if (storedUser.dep_id && !storedUser.department_id) {
          console.log('🔄 Migrating dep_id to department_id:', storedUser.dep_id);
          storedUser.department_id = storedUser.dep_id;
          delete storedUser.dep_id;
          localStorage.setItem('user', JSON.stringify(storedUser));
        }
        
        setUser(storedUser);
        setIsAuthenticated(true);
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authService.login(email, password);
      setUser(data.user);
      setIsAuthenticated(true);
      return { success: true, user: data.user };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      const errorData = error.response?.data || {};
      return { 
        success: false, 
        error: errorMessage,
        ...errorData
      };
    }
  };

  const register = async (userData) => {
    try {
      const data = await authService.register(userData);
      
      // If auto-approved (citizen), set user
      if (data.accessToken) {
        setUser(data.user);
        setIsAuthenticated(true);
      }
      
      return { 
        success: true, 
        user: data.user,
        requiresApproval: data.requiresApproval || false
      };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await authService.getProfile();
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
    } catch (error) {
      console.error('Refresh profile error:', error);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
