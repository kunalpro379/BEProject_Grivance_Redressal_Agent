import { useEffect, useState } from 'react';

// Mock test credentials for demo purposes
const testCredentials = {
  'citizen@test.com': {
    password: 'citizen123',
    name: 'John Citizen',
    phone: '+91-9876543210',
    address: '123 Main Street, Mumbai',
    user_type: 'citizen'
  },
  'official@test.com': {
    password: 'official123',
    name: 'Jane Official',
    phone: '+91-9876543211',
    department: 'Public Works',
    designation: 'Assistant Engineer',
    user_type: 'official'
  }
};

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const userData = localStorage.getItem('userData');
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    
    if (userData && isAuthenticated === 'true') {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setSession({ user: parsedUser });
    }
    
    setLoading(false);
  }, []);

  const signUp = async (email, password, userType, profileData) => {
    // Mock signup - simulate success
    const mockUser = {
      id: Date.now().toString(),
      email,
      user_type: userType,
      ...profileData
    };
    
    // Store user data
    localStorage.setItem('userData', JSON.stringify(mockUser));
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', userType);
    
    setUser(mockUser);
    setSession({ user: mockUser });
    
    return { error: null };
  };

  const signIn = async (email, password) => {
    // Check test credentials first
    const testUser = testCredentials[email];
    
    if (testUser && testUser.password === password) {
      const userData = {
        id: Date.now().toString(),
        email,
        ...testUser
      };
      
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userRole', testUser.user_type);
      
      setUser(userData);
      setSession({ user: userData });
      
      return { error: null };
    }
    
    // For demo purposes, allow any credentials
    const userData = {
      id: Date.now().toString(),
      email,
      name: 'Demo User',
      user_type: 'citizen'
    };
    
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', 'citizen');
    
    setUser(userData);
    setSession({ user: userData });
    
    return { error: null };
  };

  const signInWithGoogle = async () => {
    // Mock Google sign-in
    const userData = {
      id: Date.now().toString(),
      email: 'google.user@gmail.com',
      name: 'Google User',
      user_type: 'citizen'
    };
    
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', 'citizen');
    
    setUser(userData);
    setSession({ user: userData });
    
    return { error: null };
  };

  const signInWithOtp = async (email) => {
    // Mock OTP request - always succeed
    return { error: null };
  };

  const verifyOtp = async (email, token) => {
    // Mock OTP verification - always succeed for demo
    const userData = {
      id: Date.now().toString(),
      email,
      name: 'OTP User',
      user_type: 'citizen'
    };
    
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', 'citizen');
    
    setUser(userData);
    setSession({ user: userData });
    
    return { error: null };
  };

  const signOut = async () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    
    setUser(null);
    setSession(null);
    
    return { error: null };
  };

  const getCurrentProfile = async () => {
    if (!user) return null;
    return user;
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithOtp,
    verifyOtp,
    signOut,
    getCurrentProfile,
  };
};