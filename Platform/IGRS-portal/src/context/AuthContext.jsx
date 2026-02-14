import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const storedUser = authService.getStoredUser();
          if (storedUser) {
            setUser(storedUser);
          } else {
            const profile = await authService.getProfile();
            setUser(profile);
            localStorage.setItem('user', JSON.stringify(profile));
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        authService.clearTokens();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    setUser(response.user);
    return response;
  };

  const register = async (data) => {
    const response = await authService.register(data);
    setUser(response.user);
    return response;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const hasRole = (...roles) => {
    return user && roles.includes(user.role);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    hasRole,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
