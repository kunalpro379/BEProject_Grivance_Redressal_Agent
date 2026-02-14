import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, Building, Home, Shield } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const OfficialAuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    department: '',
    designation: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Test credentials for officials
    const testCredentials = {
      'official@test.com': { password: 'official123', name: 'Test Official', department: 'Municipal Corporation', designation: 'Senior Officer', phone: '+91-9876543210' },
      'admin@test.com': { password: 'admin123', name: 'Test Admin', department: 'Administration', designation: 'Administrator', phone: '+91-9876543211' },
      'officer@test.com': { password: 'officer123', name: 'Test Officer', department: 'Public Works', designation: 'Engineer', phone: '+91-9876543212' }
    };

    const testUser = testCredentials[formData.email];
    
    if (testUser && testUser.password === formData.password) {
      // Use test credentials
      const userData = {
        id: Date.now(),
        name: testUser.name,
        email: formData.email,
        phone: testUser.phone,
        department: testUser.department,
        designation: testUser.designation,
        role: "official"
      };
      
      // Store in localStorage for session management
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userRole', 'official');
      
      toast({
        title: 'Login Successful',
        description: 'Welcome to Officials Portal!',
      });
      
      // Force page reload to ensure authentication state is properly set
      window.location.href = '/officials-portal/dashboard';
      return;
    }
    
    // Simulate API call for other credentials
    setTimeout(() => {
      const userData = {
        id: Date.now(),
        name: formData.name || "Official User",
        email: formData.email,
        phone: formData.phone,
        department: formData.department || "General Administration",
        designation: formData.designation || "Officer",
        role: "official"
      };
      
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userRole', 'official');
      
      window.location.href = '/officials-portal/dashboard';
    }, 1500);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-4 md:py-8 lg:py-0">
      {/* Indian flag inspired gradient with fine white grid */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, rgba(255,153,51,0.25) 0%, rgba(255,230,200,0.25) 12%, rgba(255,255,255,0.96) 48%, rgba(220,245,220,0.25) 72%, rgba(19,136,8,0.25) 100%), radial-gradient(1000px 600px at 20% 15%, rgba(255,153,51,0.20), transparent 60%), radial-gradient(900px 500px at 80% 85%, rgba(19,136,8,0.20), transparent 60%), radial-gradient(500px 500px at 60% 30%, rgba(0,56,168,0.15), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      {/* Home Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 md:top-6 md:left-6 z-20 p-2 md:p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-200"
      >
        <Home className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
      </button>

      {/* Main Content - Responsive sizing */}
      <div className="relative z-10 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl mx-auto px-3 sm:px-4 md:px-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/20 p-3 sm:p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center mb-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg overflow-hidden bg-white">
                <img src="/logo.png" alt="IGRS Logo" className="w-12 h-12 object-contain" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">महाराष्ट्र शासन</p>
              <h1 className="text-xl font-bold text-gray-900">Official Portal</h1>
              <p className="text-gray-600 mt-1 text-xs">Access your officials portal account</p>
            </div>
          </div>

          {/* Toggle Buttons */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                isLogin
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                !isLogin
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your full name"
                      required={!isLogin}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your phone number"
                      required={!isLogin}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required={!isLogin}
                    >
                      <option value="">Select Department</option>
                      <option value="Municipal Corporation">Municipal Corporation</option>
                      <option value="Administration">Administration</option>
                      <option value="Public Works">Public Works</option>
                      <option value="Health Department">Health Department</option>
                      <option value="Education Department">Education Department</option>
                      <option value="Transport Department">Transport Department</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your designation"
                      required={!isLogin}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 h-5 w-5 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Confirm your password"
                      required={!isLogin}
                    />
                  </div>
                </div>
              </>
            )}

            {isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 h-5 w-5 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </div>
          </form>

          {/* Test Credentials Info */}
          <div className="mt-6 p-4 bg-purple-50 rounded-lg">
            <h3 className="text-sm font-medium text-purple-900 mb-2">Test Credentials:</h3>
            <div className="text-xs text-purple-700 space-y-1">
              <p><strong>Email:</strong> official@test.com</p>
              <p><strong>Password:</strong> official123</p>
            </div>
          </div>

          {/* Switch to Citizens */}
          <div className="mt-6 text-center lg:hidden">
            <p className="text-sm text-gray-600">
              Are you a citizen?{' '}
              <button
                onClick={() => navigate('/citizen-portal/authentication')}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Access Citizen Portal
              </button>
            </p>
          </div>
        </div>
        
      </div>
    </section>
  );
};

export default OfficialAuthPage;
