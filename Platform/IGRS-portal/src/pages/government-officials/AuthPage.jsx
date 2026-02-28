import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, Building, Home, MapPin, ArrowRight, ArrowLeft, CheckCircle, Shield, Key, Briefcase, KeyRound, RefreshCw } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import authService from '../../services/authService';
import { getDepartmentId } from '../../utils/departmentMapping';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const OfficialAuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [governmentRoles, setGovernmentRoles] = useState([]);
  const [rolesByLevel, setRolesByLevel] = useState({});
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    adminId: '',
    adminPasskey: '',
    department: '',
    department_name: '',
    designation: '',
    officerRole: '',
    city: '',
    address: '',
    officialType: '',
    role_id: '', // Add role_id from government_roles table
    hierarchyLevel: '',
    levelType: '',
    ministryName: '',
    district: '',
    taluka: '',
    blockName: '',
    ward: '',
    zone: '',
    corporationName: '',
    jurisdiction: ''
  });
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [resendingOtp, setResendingOtp] = useState(false);
  const navigate = useNavigate();

  const departments = [
    'Municipal Corporation',
    'Public Works Department',
    'Health Department',
    'Education Department',
    'Transport Department',
    'Water Supply Department',
    'Electricity Department',
    'Revenue Department'
  ];

  // Fetch government roles when component mounts
  useEffect(() => {
    if (selectedRole === 'government') {
      fetchGovernmentRoles();
    }
  }, [selectedRole]);

  const fetchGovernmentRoles = async () => {
    try {
      setLoadingRoles(true);
      const response = await fetch(`${API_URL}/api/roles/government-roles/by-level`);
      const data = await response.json();
      
      if (data.success) {
        // Convert array to object keyed by role_level
        const rolesByLevelObj = {};
        data.rolesByLevel.forEach(item => {
          rolesByLevelObj[item.role_level] = item.roles;
        });
        setRolesByLevel(rolesByLevelObj);
        
        // Also keep flat list
        const allRoles = data.rolesByLevel.flatMap(item => item.roles);
        setGovernmentRoles(allRoles);
      }
    } catch (error) {
      console.error('Failed to fetch government roles:', error);
      toast.error('Failed to load government roles', {
        duration: 3000,
        position: 'top-center',
      });
    } finally {
      setLoadingRoles(false);
    }
  };

  const officialTypes = [
    'Panchayat Officer',
    'District Collector',
    'Nagar Sevak',
    'Tehsildar',
    'Block Development Officer',
    'Municipal Commissioner',
    'Zonal Officer'
  ];

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setCurrentStep(2);
  };

  const validateStep = () => {
    if (isLogin) return true;
    
    switch (currentStep) {
      case 1:
        return selectedRole !== '';
      case 2:
        return formData.name && formData.phone;
      case 3:
        if (selectedRole === 'admin') {
          return formData.adminId && formData.adminPasskey;
        } else if (selectedRole === 'department') {
          return formData.department_name && formData.designation && formData.city;
        } else if (selectedRole === 'government') {
          if (!formData.role_id || !formData.hierarchyLevel) return false;
          switch (formData.hierarchyLevel) {
            case 'Central':
            case 'State':
              return formData.levelType && formData.ministryName;
            case 'District':
              return formData.district;
            case 'Taluka':
              return formData.district && formData.taluka;
            case 'City':
              return formData.city && formData.district;
            case 'Ward':
              return formData.city && formData.district && formData.ward;
            case 'Gram Panchayat':
              return true; // Basic validation
            default:
              return false;
          }
        }
        return false;
      case 4:
        return formData.email && formData.password && formData.confirmPassword && 
               formData.password === formData.confirmPassword;
      case 5:
        return otp.length === 6;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    } else {
      toast.error('Please fill all required fields', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
        },
      });
    }
  };

  const prevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setSelectedRole('');
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 5) {
      setCurrentStep(4);
      setOtp('');
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
        },
      });
      return;
    }

    setLoading(true);
    try {
      const otpRes = await fetch(`${API_URL}/api/auth/verify-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registrationEmail,
          otp: otp.trim()
        })
      });

      const otpData = await otpRes.json();
      
      if (!otpRes.ok) {
        toast.error(otpData.error || 'OTP verification failed', {
          duration: 4000,
          position: 'top-center',
          style: {
            background: '#EF4444',
            color: '#fff',
            fontWeight: '600',
          },
        });
        setOtp('');
      } else {
        toast.success('Email verified successfully!', {
          duration: 4000,
          position: 'top-center',
          icon: '✅',
          style: {
            background: '#16A34A',
            color: '#fff',
            fontWeight: '600',
            padding: '16px',
          },
        });

        // Reset form and switch to login
        setTimeout(() => {
          setIsLogin(true);
          setCurrentStep(1);
          setOtp('');
          setOtpSent(false);
          setRegistrationEmail('');
          setFormData({
            email: '',
            password: '',
            confirmPassword: '',
            name: '',
            phone: '',
            adminId: '',
            adminPasskey: '',
            department: '',
            department_name: '',
            designation: '',
            officerRole: '',
            city: '',
            address: '',
            officialType: '',
            hierarchyLevel: '',
            levelType: '',
            ministryName: '',
            district: '',
            taluka: '',
            blockName: '',
            ward: '',
            zone: '',
            corporationName: '',
            jurisdiction: ''
          });
        }, 1500);
      }
    } catch (error) {
      console.error('OTP verification failed:', error);
      toast.error('Failed to verify OTP. Please try again.', {
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!registrationEmail) return;

    setResendingOtp(true);
    try {
      // Call backend to resend OTP
      const resendRes = await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registrationEmail })
      });

      const resendData = await resendRes.json();

      if (!resendRes.ok) {
        toast.error(resendData.error || 'Failed to resend OTP', {
          duration: 4000,
          position: 'top-center',
          style: {
            background: '#EF4444',
            color: '#fff',
            fontWeight: '600',
          },
        });
      } else {
        toast.success('OTP resent successfully! Please check your email.', {
          duration: 4000,
          position: 'top-center',
          icon: '📧',
          style: {
            background: '#10B981',
            color: '#fff',
            fontWeight: '600',
            padding: '16px',
          },
        });
        setOtp('');
      }
    } catch (error) {
      console.error('Resend OTP failed:', error);
      toast.error('Failed to resend OTP. Please try again.', {
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
        },
      });
    } finally {
      setResendingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isLogin && !validateStep()) {
      toast.error('Please fill all required fields', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
        },
      });
      return;
    }
    
    setLoading(true);
    
    try {
      if (isLogin) {
        // Login
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
          // Handle specific error cases
          if (data.requiresEmailVerification) {
            // Prompt OTP when email is not verified yet
            try {
              const enteredOtp = window.prompt('Your email is not verified. Enter the OTP sent to your email:');
              if (enteredOtp && formData.email) {
                const otpRes = await fetch(`${API_URL}/api/auth/verify-email-otp`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: formData.email,
                    otp: enteredOtp.trim()
                  })
                });
                const otpData = await otpRes.json();
                if (!otpRes.ok) {
                  toast.error(otpData.error || 'OTP verification failed', {
                    duration: 4000,
                    position: 'top-center',
                    style: {
                      background: '#EF4444',
                      color: '#fff',
                      fontWeight: '600',
                    },
                  });
                } else {
                  toast.success('Email verified successfully! Please login again.', {
                    duration: 4000,
                    position: 'top-center',
                    icon: '✅',
                    style: {
                      background: '#16A34A',
                      color: '#fff',
                      fontWeight: '600',
                      padding: '16px',
                    },
                  });
                }
              }
            } catch (otpErr) {
              console.error('OTP verification on login failed:', otpErr);
            }
          } else if (data.approval_status === 'pending') {
            toast.error('Account Pending Approval', {
              duration: 5000,
              position: 'top-center',
              icon: '⏳',
              style: {
                background: '#F59E0B',
                color: '#fff',
                fontWeight: '600',
                padding: '16px',
              },
            });
          } else if (data.approval_status === 'rejected') {
            toast.error(`Account Rejected: ${data.message}`, {
              duration: 6000,
              position: 'top-center',
              icon: '❌',
              style: {
                background: '#EF4444',
                color: '#fff',
                fontWeight: '600',
                padding: '16px',
              },
            });
          } else {
            toast.error(data.error || 'Login failed', {
              duration: 4000,
              position: 'top-center',
              style: {
                background: '#EF4444',
                color: '#fff',
                fontWeight: '600',
              },
            });
          }
          throw new Error(data.error || 'Login failed');
        }

        // Check if user is a citizen trying to access officials portal
        if (data.user.role === 'citizen') {
          toast.error('Citizens cannot access the Officials Portal', {
            duration: 5000,
            position: 'top-center',
            icon: '🚫',
            style: {
              background: '#EF4444',
              color: '#fff',
              fontWeight: '600',
              padding: '16px',
            },
          });
          
          // Clear any stored data
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          
          // Redirect to citizen portal after a delay
          setTimeout(() => {
            toast('Redirecting to Citizen Portal...', {
              duration: 3000,
              position: 'top-center',
              icon: '➡️',
              style: {
                background: '#3B82F6',
                color: '#fff',
                fontWeight: '600',
                padding: '16px',
              },
            });
            setTimeout(() => {
              navigate('/citizen-portal/authentication');
            }, 1000);
          }, 2000);
          
          setLoading(false);
          return;
        }

        // Store tokens and user data
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Success toast
        toast.success(`Welcome back, ${data.user.full_name}!`, {
          duration: 3000,
          position: 'top-center',
          icon: '👋',
          style: {
            background: '#10B981',
            color: '#fff',
            fontWeight: '600',
            padding: '16px',
          },
        });

        // Redirect based on role and department
        let redirectUrl = '/';
        
        if (data.user.role === 'admin') {
          redirectUrl = '/admin/dashboard';
        } else if (data.user.role === 'department_officer' || data.user.role === 'department_head') {
          redirectUrl = data.user.id ? `/government/${data.user.id}` : '/officials-portal/authentication';
        } else if (data.user.role === 'citizen') {
          redirectUrl = '/citizen/dashboard';
        }
        
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000);
        
      } else {
        // Registration
        // For government officials, role_id determines the role
        // Backend will map role_id to system role
        const registrationData = {
          email: formData.email,
          password: formData.password,
          full_name: formData.name,
          phone: formData.phone,
          role: selectedRole === 'admin' ? 'admin' : 
                selectedRole === 'department' ? 'department_officer' : 
                'government_official', // Temporary, backend will determine from role_id
          // Additional fields based on role
          ...(selectedRole === 'department' && {
            department_name: formData.department_name,
            designation: formData.designation,
            city: formData.city,
            address: formData.address
          }),
          ...(selectedRole === 'government' && {
            role_id: formData.role_id, // ID from government_roles table
            official_type: formData.officialType,
            hierarchy_level: formData.hierarchyLevel,
            level_type: formData.levelType,
            ministry_name: formData.ministryName,
            district: formData.district,
            taluka: formData.taluka,
            block_name: formData.blockName,
            city: formData.city,
            ward: formData.ward,
            zone: formData.zone,
            corporation_name: formData.corporationName,
            jurisdiction: formData.jurisdiction
          }),
          ...(selectedRole === 'admin' && {
            admin_id: formData.adminId,
            admin_passkey: formData.adminPasskey
          })
        };

        const response = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData)
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || 'Registration failed', {
            duration: 4000,
            position: 'top-center',
            style: {
              background: '#EF4444',
              color: '#fff',
              fontWeight: '600',
            },
          });
          throw new Error(data.error || 'Registration failed');
        }

        if (data.requiresApproval) {
          toast.success('Registration Submitted Successfully!', {
            duration: 6000,
            position: 'top-center',
            icon: '✅',
            style: {
              background: '#10B981',
              color: '#fff',
              fontWeight: '600',
              padding: '16px',
            },
          });
          
          // If backend requires OTP verification, navigate to Step 5
          if (data.requiresOtpVerification) {
            setRegistrationEmail(formData.email);
            setOtpSent(true);
            setCurrentStep(5);
            toast.success('OTP sent to your email! Please verify.', {
              duration: 5000,
              position: 'top-center',
              icon: '📧',
              style: {
                background: '#3B82F6',
                color: '#fff',
                fontWeight: '600',
                padding: '16px',
              },
            });
            return; // Don't proceed to login switch yet
          }

          setTimeout(() => {
            toast('Your account is pending admin approval', {
              duration: 5000,
              position: 'top-center',
              icon: '⏳',
              style: {
                background: '#3B82F6',
                color: '#fff',
                fontWeight: '600',
                padding: '16px',
              },
            });
          }, 1000);
          
          // Switch to login view after 2 seconds
          setTimeout(() => {
            setIsLogin(true);
            setCurrentStep(1);
            setFormData({
              email: '',
              password: '',
              confirmPassword: '',
              name: '',
              phone: '',
              adminId: '',
              adminPasskey: '',
              department: '',
              department_name: '',
              designation: '',
              officerRole: '',
              city: '',
              address: '',
              officialType: '',
              hierarchyLevel: '',
              levelType: '',
              ministryName: '',
              district: '',
              taluka: '',
              blockName: '',
              ward: '',
              zone: '',
              corporationName: '',
              jurisdiction: ''
            });
          }, 2000);
        } else {
          // Auto-approved (shouldn't happen for officials, but handle it)
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          localStorage.setItem('user', JSON.stringify(data.user));

          toast.success('Registration Successful!', {
            duration: 3000,
            position: 'top-center',
            icon: '🎉',
            style: {
              background: '#10B981',
              color: '#fff',
              fontWeight: '600',
              padding: '16px',
            },
          });

          setTimeout(() => {
            window.location.href = '/officer/dashboard';
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      // Error toast already shown above
    } finally {
      setLoading(false);
    }
  };

  const getStepLabel = () => {
    if (currentStep === 1) return 'Select Role';
    if (currentStep === 2) return 'Personal Info';
    if (currentStep === 3) {
      if (selectedRole === 'admin') return 'Admin Details';
      if (selectedRole === 'department') return 'Department Information';
      if (selectedRole === 'government') return 'Official Details';
    }
    if (currentStep === 4) return 'Account Credentials';
    if (currentStep === 5) return 'Email Verification';
    return 'Account Credentials';
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <Toaster 
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
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

      <button
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 md:top-6 md:left-6 z-20 p-2.5 md:p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:shadow-xl hover:scale-105 transition-all duration-300"
        aria-label="Go to home"
      >
        <Home className="w-5 h-5 md:w-6 md:h-6 text-gray-700" />
      </button>

      <div className="relative z-10 w-full max-w-md px-4 sm:px-6 py-8 md:py-12">
        <div className="space-y-8 md:space-y-10">
          <div className="text-center">
            <div className="space-y-3">
              <p className="text-sm md:text-base font-semibold text-gray-800 tracking-wide">महाराष्ट्र शासन</p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Officials Portal</h1>
              <p className="text-sm md:text-base text-gray-700 max-w-md mx-auto">Secure access for government officials and administrators</p>
            </div>
          </div>

          {/* Toggle Buttons - Fixed Position */}
          <div className="sticky top-4 z-20 bg-white/95 backdrop-blur-sm rounded-xl shadow-md p-1">
            <div className="flex bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg p-1">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setCurrentStep(1);
                  setSelectedRole('');
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
                  setSelectedRole('');
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
            {!isLogin && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex items-center flex-1">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all duration-300 ${
                        currentStep >= step 
                          ? 'bg-gray-900 text-white shadow-lg' 
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
                      </div>
                      {step < 5 && (
                        <div className={`flex-1 h-1 mx-2 rounded transition-all duration-300 ${
                          currentStep > step ? 'bg-gray-900' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <span className="text-sm md:text-base font-semibold text-gray-900">{getStepLabel()}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
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
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
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
                        className="w-full pl-11 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
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
                    <p className="text-sm text-right">
                      <Link to="/forgot-password" className="font-medium text-gray-900 hover:underline">
                        Forgot password?
                      </Link>
                    </p>
                  </div>
                </div>
              )}

              {!isLogin && currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">Select Your Role</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      type="button"
                      onClick={() => handleRoleSelect('admin')}
                      className="p-5 border-2 border-gray-200 rounded-xl hover:border-gray-900 hover:bg-gray-50 transition-all duration-300 flex items-center gap-4 group"
                    >
                      <Shield className="w-10 h-10 text-gray-900 flex-shrink-0" />
                      <div className="text-left">
                        <h4 className="font-semibold text-gray-900 text-base">Admin</h4>
                        <p className="text-xs text-gray-600">System Administrator with full access</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleSelect('department')}
                      className="p-5 border-2 border-gray-200 rounded-xl hover:border-gray-900 hover:bg-gray-50 transition-all duration-300 flex items-center gap-4 group"
                    >
                      <Building className="w-10 h-10 text-gray-900 flex-shrink-0" />
                      <div className="text-left">
                        <h4 className="font-semibold text-gray-900 text-base">Department Officer</h4>
                        <p className="text-xs text-gray-600">Department-specific officers and staff</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleSelect('government')}
                      className="p-5 border-2 border-gray-200 rounded-xl hover:border-gray-900 hover:bg-gray-50 transition-all duration-300 flex items-center gap-4 group"
                    >
                      <Briefcase className="w-10 h-10 text-gray-900 flex-shrink-0" />
                      <div className="text-left">
                        <h4 className="font-semibold text-gray-900 text-base">Government Official</h4>
                        <p className="text-xs text-gray-600">Field officers and local authorities</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {!isLogin && currentStep === 2 && (
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
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
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
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                        placeholder="+91 XXXXX XXXXX"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {!isLogin && currentStep === 3 && selectedRole === 'admin' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Admin ID *</label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        name="adminId"
                        value={formData.adminId}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                        placeholder="Enter your admin ID"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Admin Passkey *</label>
                    <div className="relative">
                      <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="password"
                        name="adminPasskey"
                        value={formData.adminPasskey}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                        placeholder="Enter your admin passkey"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {!isLogin && currentStep === 3 && selectedRole === 'department' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Department *</label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        name="department_name"
                        value={formData.department_name}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Designation *</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                        placeholder="e.g., Senior Engineer, Inspector, Officer"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">City *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                        placeholder="Enter your city"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Address</label>
                    <div className="relative">
                      <Home className="absolute left-3.5 top-3 h-5 w-5 text-gray-400" />
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                        placeholder="Enter your address (optional)"
                        rows="3"
                      />
                    </div>
                  </div>
                </div>
              )}

              {!isLogin && currentStep === 3 && selectedRole === 'government' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Hierarchy Level *</label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        name="hierarchyLevel"
                        value={formData.hierarchyLevel}
                        onChange={(e) => {
                          handleInputChange(e);
                          // Reset role selection when level changes
                          setFormData(prev => ({ ...prev, role_id: '', officialType: '' }));
                        }}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                        required
                      >
                        <option value="">Select Level</option>
                        <option value="Central">Central</option>
                        <option value="State">State</option>
                        <option value="District">District</option>
                        <option value="Taluka">Taluka/Block</option>
                        <option value="City">City</option>
                        <option value="Ward">Ward</option>
                        <option value="Gram Panchayat">Gram Panchayat</option>
                      </select>
                    </div>
                  </div>

                  {formData.hierarchyLevel && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Official Role *</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        {loadingRoles ? (
                          <div className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl text-sm text-gray-500">
                            Loading roles...
                          </div>
                        ) : (
                          <select
                            name="role_id"
                            value={formData.role_id}
                            onChange={(e) => {
                              handleInputChange(e);
                              // Also set officialType for display
                              const selectedRole = governmentRoles.find(r => r.id === e.target.value);
                              if (selectedRole) {
                                setFormData(prev => ({ ...prev, officialType: selectedRole.role_name }));
                              }
                            }}
                            className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                            required
                          >
                            <option value="">Select Official Role</option>
                            {rolesByLevel[formData.hierarchyLevel]?.map(role => (
                              <option key={role.id} value={role.id}>
                                {role.role_name} {role.description && `- ${role.description}`}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      {formData.role_id && (
                        <p className="text-xs text-gray-500 mt-1">
                          {rolesByLevel[formData.hierarchyLevel]?.find(r => r.id === formData.role_id)?.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Conditional fields based on hierarchy level */}
                  {(formData.hierarchyLevel === 'Central' || formData.hierarchyLevel === 'State') && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Ministry Name *</label>
                        <div className="relative">
                          <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            name="ministryName"
                            value={formData.ministryName}
                            onChange={handleInputChange}
                            className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                            placeholder="Enter ministry name"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {formData.hierarchyLevel === 'District' && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">District *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          name="district"
                          value={formData.district}
                          onChange={handleInputChange}
                          className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                          placeholder="Enter district name"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {formData.hierarchyLevel === 'Taluka' && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">District *</label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            name="district"
                            value={formData.district}
                            onChange={handleInputChange}
                            className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                            placeholder="Enter district name"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Taluka *</label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            name="taluka"
                            value={formData.taluka}
                            onChange={handleInputChange}
                            className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                            placeholder="Enter taluka name"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Block Name</label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            name="blockName"
                            value={formData.blockName}
                            onChange={handleInputChange}
                            className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                            placeholder="Enter block name (optional)"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {formData.hierarchyLevel === 'City' && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">City *</label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                            placeholder="Enter city name"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">District *</label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            name="district"
                            value={formData.district}
                            onChange={handleInputChange}
                            className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                            placeholder="Enter district name"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Corporation Name</label>
                        <div className="relative">
                          <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            name="corporationName"
                            value={formData.corporationName}
                            onChange={handleInputChange}
                            className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                            placeholder="Enter corporation name (optional)"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {formData.hierarchyLevel === 'Ward' && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Ward Number *</label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            name="ward"
                            value={formData.ward}
                            onChange={handleInputChange}
                            className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                            placeholder="Enter ward number/name"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">City *</label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                            placeholder="Enter city name"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">District *</label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            name="district"
                            value={formData.district}
                            onChange={handleInputChange}
                            className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                            placeholder="Enter district name"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Zone</label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            name="zone"
                            value={formData.zone}
                            onChange={handleInputChange}
                            className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                            placeholder="Enter zone (optional)"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {!isLogin && currentStep === 4 && (
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
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
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
                        className="w-full pl-11 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
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
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-sm md:text-base"
                        placeholder="Confirm your password"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {!isLogin && currentStep === 5 && (
                <div className="space-y-5">
                  <div className="text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="bg-blue-100 p-4 rounded-full">
                        <Mail className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Verify Your Email</h3>
                    <p className="text-gray-600 text-sm">
                      We've sent a 6-digit OTP to <span className="font-semibold text-gray-900">{registrationEmail}</span>
                    </p>
                    <p className="text-gray-500 text-xs">
                      Please check your inbox and enter the OTP below to verify your email address.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Enter OTP *</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={otp}
                        onChange={handleOtpChange}
                        maxLength={6}
                        className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 text-center text-2xl font-bold tracking-widest text-gray-900"
                        placeholder="000000"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      {otp.length}/6 digits
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm">
                    <span className="text-gray-600">Didn't receive the OTP?</span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendingOtp}
                      className="text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <RefreshCw className={`w-4 h-4 ${resendingOtp ? 'animate-spin' : ''}`} />
                      {resendingOtp ? 'Sending...' : 'Resend OTP'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {!isLogin && currentStep > 1 && currentStep !== 5 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-semibold text-sm md:text-base"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                  </button>
                )}
                
                {!isLogin && currentStep === 5 ? (
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading || otp.length !== 6}
                    className="flex-1 bg-gradient-to-r from-gray-900 to-gray-800 text-white py-4 px-6 rounded-xl hover:from-gray-800 hover:to-gray-700 focus:ring-4 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm md:text-base"
                  >
                    {loading ? 'Verifying...' : 'Verify Email'}
                  </button>
                ) : !isLogin && currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-gray-900 to-gray-800 text-white py-4 px-6 rounded-xl hover:from-gray-800 hover:to-gray-700 focus:ring-4 focus:ring-gray-400 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm md:text-base"
                  >
                    Next Step
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-gray-900 to-gray-800 text-white py-4 px-6 rounded-xl hover:from-gray-800 hover:to-gray-700 focus:ring-4 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm md:text-base"
                  >
                    {loading ? 'Processing...' : (isLogin ? 'Sign In to Portal' : 'Create Account')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OfficialAuthPage;


