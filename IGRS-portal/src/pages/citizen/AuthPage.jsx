import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, Building, Home, MapPin, ArrowRight, ArrowLeft, CheckCircle, Calendar, Briefcase, CreditCard, Users } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import authService from '../../services/authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const CitizenAuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    dateOfBirth: '',
    gender: '',
    aadhaarNumber: '',
    occupation: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Timer for OTP resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleOtpChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      
      // Auto-focus next input
      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const sendOtp = async () => {
    if (!formData.email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/otp/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email,
          name: formData.name 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setResendTimer(60);
        toast({
          title: 'OTP Sent',
          description: 'Please check your email for the verification code',
        });
      } else {
        toast({
          title: 'Failed to Send OTP',
          description: data.error || data.message || 'Please try again',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      toast({
        title: 'Error',
        description: 'Could not send OTP. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter the complete 6-digit code',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Verifying OTP:', { email: formData.email, otp: otpCode });
      
      const response = await fetch(`${API_URL}/api/otp/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email,
          otp: otpCode
        })
      });

      const data = await response.json();
      console.log('OTP verification response:', data);

      if (response.ok && data.verified) {
        toast({
          title: 'Email Verified',
          description: 'Your email has been verified successfully',
        });
        setShowOtpVerification(false);
        // Proceed with registration
        await completeRegistration();
      } else {
        console.error('OTP verification failed:', data);
        toast({
          title: 'Verification Failed',
          description: data.error || data.message || 'Invalid OTP code',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      toast({
        title: 'Error',
        description: 'Could not verify OTP. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendTimer > 0) {
      toast({
        title: 'Please Wait',
        description: `You can resend OTP in ${resendTimer} seconds`,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/otp/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email,
          name: formData.name 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResendTimer(60);
        setOtp(['', '', '', '', '', '']); // Clear OTP inputs
        toast({
          title: 'OTP Resent',
          description: 'A new OTP has been sent to your email',
        });
      } else {
        toast({
          title: 'Failed to Resend OTP',
          description: data.error || data.message || 'Please try again',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast({
        title: 'Error',
        description: 'Could not resend OTP. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    setLoading(true);
    try {
      const registrationData = {
        email: formData.email,
        password: formData.password,
        full_name: formData.name,
        phone: formData.phone,
        address: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
        date_of_birth: formData.dateOfBirth || null,
        gender: formData.gender || null,
        aadhaar_number: formData.aadhaarNumber || null,
        occupation: formData.occupation || null
      };

      console.log('Sending registration data:', registrationData);

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      const data = await response.json();
      console.log('Registration response:', data);

      if (!response.ok) {
        console.error('Registration failed:', data);
        if (data.errors && Array.isArray(data.errors)) {
          console.error('Validation errors:', data.errors);
          const errorMessages = data.errors.map(e => `${e.field}: ${e.message}`).join(', ');
          toast({
            title: 'Registration Failed',
            description: errorMessages || data.error || 'Could not create account',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Registration Failed',
            description: data.error || data.message || 'Could not create account',
            variant: 'destructive'
          });
        }
        return;
      }

      // Store tokens and redirect
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userRole', 'citizen');

        toast({
          title: 'Registration Successful',
          description: 'Welcome to Citizen Portal!',
        });

        // Use window.location for hard redirect
        setTimeout(() => {
          window.location.href = `/citizen/${data.user.id}`;
        }, 500);
      } else {
        toast({
          title: 'Registration Issue',
          description: 'Account created but login failed. Please try logging in.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const validateStep = () => {
    if (isLogin) return true;
    
    switch (currentStep) {
      case 1:
        return formData.name && formData.phone && formData.dateOfBirth && formData.gender;
      case 2:
        return formData.address && formData.city && formData.pincode;
      case 3:
        return formData.email && formData.password && formData.confirmPassword && 
               formData.password === formData.confirmPassword;
      case 4:
        return formData.aadhaarNumber && formData.occupation;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    } else {
      toast({
        title: 'Incomplete Information',
        description: 'Please fill all required fields',
        variant: 'destructive'
      });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isLogin && !validateStep()) {
      toast({
        title: 'Incomplete Information',
        description: 'Please fill all required fields',
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);
    
    try {
      if (isLogin) {
        // Login API call
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        });

        const data = await response.json();

        if (!response.ok) {
          toast({
            title: 'Login Failed',
            description: data.error || 'Invalid credentials',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        // Store tokens and user data
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('userRole', data.user.role);
        }

        toast({
          title: 'Login Successful',
          description: 'Welcome back!',
        });

        // Redirect based on role
        if (data.user.role === 'citizen') {
          window.location.href = `/citizen/${data.user.id}`;
        } else {
          window.location.href = '/';
        }

      } else {
        // For registration, show OTP verification
        setShowOtpVerification(true);
        await sendOtp();
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
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
        className="fixed top-4 left-4 md:top-6 md:left-6 z-20 p-2.5 md:p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:shadow-xl hover:scale-105 transition-all duration-300"
        aria-label="Go to home"
      >
        <Home className="w-5 h-5 md:w-6 md:h-6 text-gray-700" />
      </button>

      {/* Main Content - Clean, Professional Layout */}
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6 py-8 md:py-12">
        <div className="space-y-8 md:space-y-10">
          {/* Header */}
          <div className="text-center">
            <div className="space-y-3">
              <p className="text-sm md:text-base font-semibold text-gray-800 tracking-wide">महाराष्ट्र शासन</p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Citizen Portal</h1>
              <p className="text-sm md:text-base text-gray-700 max-w-md mx-auto">Secure access to your grievance management account</p>
            </div>
          </div>

          {/* Toggle Buttons - Fixed Position */}
          <div className="sticky top-4 z-20 bg-white/95 backdrop-blur-sm rounded-xl shadow-md p-1">
            <div className="flex bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg p-1">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setCurrentStep(1);
                }}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm md:text-base font-semibold transition-all duration-300 ${
                  isLogin
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setCurrentStep(1);
                }}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm md:text-base font-semibold transition-all duration-300 ${
                  !isLogin
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Form Content Area */}
          <div className="space-y-6">

            {/* Progress Steps for Sign Up */}
            {!isLogin && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex items-center flex-1">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all duration-300 ${
                        currentStep >= step 
                          ? 'bg-gray-900 text-white shadow-lg' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
                      </div>
                      {step < 4 && (
                        <div className={`flex-1 h-1 mx-2 rounded transition-all duration-300 ${
                          currentStep > step ? 'bg-gray-900' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs md:text-sm font-semibold">
                  <span className={currentStep >= 1 ? 'text-gray-900' : 'text-gray-500'}>Personal</span>
                  <span className={currentStep >= 2 ? 'text-gray-900' : 'text-gray-500'}>Address</span>
                  <span className={currentStep >= 3 ? 'text-gray-900' : 'text-gray-500'}>Account</span>
                  <span className={currentStep >= 4 ? 'text-gray-900' : 'text-gray-500'}>Details</span>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
              {/* Login Form */}
              {isLogin && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sign Up Form - Step 1: Personal Info */}
              {!isLogin && currentStep === 1 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Phone Number *</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base"
                        placeholder="+91 XXXXX XXXXX"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Date of Birth *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Gender *</label>
                    <div className="relative">
                      <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base"
                        required
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Sign Up Form - Step 2: Address */}
              {!isLogin && currentStep === 2 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Address *</label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-4 h-5 w-5 text-gray-400" />
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base resize-none"
                        placeholder="Enter your complete address"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">City *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base"
                          placeholder="City"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Pincode *</label>
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        maxLength="6"
                        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base"
                        placeholder="400001"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">State</label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base"
                    >
                      <option value="Maharashtra">Maharashtra</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Sign Up Form - Step 3: Account */}
              {!isLogin && currentStep === 3 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base"
                        placeholder="your.email@example.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base"
                        placeholder="Create a strong password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base"
                        placeholder="Confirm your password"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sign Up Form - Step 4: Additional Details */}
              {!isLogin && currentStep === 4 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Aadhaar Number *</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        name="aadhaarNumber"
                        value={formData.aadhaarNumber}
                        onChange={handleInputChange}
                        maxLength="12"
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base"
                        placeholder="XXXX XXXX XXXX"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Occupation *</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        name="occupation"
                        value={formData.occupation}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base"
                        placeholder="Your occupation"
                        required
                      />
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Your information is secure and will be used only for grievance management purposes.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3">
                {!isLogin && currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-semibold text-sm md:text-base"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                  </button>
                )}
                
                {!isLogin && currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm md:text-base"
                  >
                    Next Step
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm md:text-base"
                  >
                    {loading ? 'Processing...' : (isLogin ? 'Sign In to Portal' : 'Create Account')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOtpVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 relative animate-fadeIn">
            {/* Close button */}
            <button
              onClick={() => {
                setShowOtpVerification(false);
                setOtp(['', '', '', '', '', '']);
              }}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
              <p className="text-sm text-gray-600">
                We've sent a 6-digit code to<br />
                <span className="font-semibold text-gray-900">{formData.email}</span>
              </p>
            </div>

            {/* OTP Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                Enter Verification Code
              </label>
              <div className="flex gap-2 justify-center">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

            {/* Resend OTP */}
            <div className="text-center mb-6">
              {resendTimer > 0 ? (
                <p className="text-sm text-gray-600">
                  Resend code in <span className="font-semibold text-blue-600">{resendTimer}s</span>
                </p>
              ) : (
                <button
                  onClick={resendOtp}
                  disabled={loading}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                >
                  Resend OTP
                </button>
              )}
            </div>

            {/* Verify Button */}
            <button
              onClick={verifyOtp}
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

            {/* Help text */}
            <p className="text-xs text-gray-500 text-center mt-4">
              Didn't receive the code? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default CitizenAuthPage;
