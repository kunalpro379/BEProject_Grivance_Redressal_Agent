import React, { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Eye, EyeOff, User, Lock, Mail, Phone, MapPin, Calendar, Shield, MessageCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useToast, Toast } from "../hooks/use-toast";

const CitizenAuth = ({ onLogin }) => {
  const { user, loading: authLoading, signUp, signIn, signInWithGoogle, signInWithOtp, verifyOtp, getCurrentProfile } = useAuth();
  const { toast, toasts, dismiss } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState("request"); // request, verify, complete
  const [userType, setUserType] = useState(""); // citizen or official
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    address: "",
    dob: "",
    aadhar: "",
    department: "",
    designation: ""
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If already authenticated, resolve role and bubble up to parent to trigger route redirect
  useEffect(() => {
    const resolveAndLogin = async () => {
      if (!authLoading && user) {
        const profile = await getCurrentProfile();
        const userData = {
          id: user?.id,
          name: profile?.full_name || "User",
          email: profile?.email || "",
          phone: profile?.phone || "",
          role: profile?.user_type || "citizen",
        };
        if (onLogin) {
          onLogin(userData);
        }
      }
    };
    resolveAndLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (!userType) {
      toast({
        title: 'Error',
        description: 'Please select user type',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const profileData = {
      full_name: formData.name,
      phone: formData.phone,
    };

    if (userType === 'citizen') {
      profileData.address = formData.address;
      profileData.aadhar_number = formData.aadhar;
    } else {
      profileData.department = formData.department;
      profileData.designation = formData.designation;
    }

    const { error } = await signUp(formData.email, formData.password, userType, profileData);
    
    if (error) {
      toast({
        title: 'Sign Up Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      // After signup, send OTP to verify email and switch to OTP screen
      const otpReq = await signInWithOtp(formData.email);
      if (otpReq.error) {
        toast({
          title: 'Verification Email Failed',
          description: otpReq.error.message,
          variant: 'destructive',
        });
      } else {
        setOtpEmail(formData.email);
        setOtpSent(true);
        setStep('verify');
        toast({
          title: 'Account Created',
          description: 'We sent a 6-digit code to your email. Enter it to verify your account.',
        });
      }
    }
    
    setLoading(false);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Check for test credentials first
    const testCredentials = {
      // Test Official Credentials
      'official@test.com': { password: 'official123', role: 'official', name: 'Test Official', department: 'Municipal Corporation', designation: 'Senior Officer' },
      'admin@test.com': { password: 'admin123', role: 'official', name: 'Test Admin', department: 'Administration', designation: 'Administrator' },
      'officer@test.com': { password: 'officer123', role: 'official', name: 'Test Officer', department: 'Public Works', designation: 'Engineer' },
      
      // Test Citizen Credentials
      'citizen@test.com': { password: 'citizen123', role: 'citizen', name: 'Test Citizen', phone: '+91-9876543210' },
      'user@test.com': { password: 'user123', role: 'citizen', name: 'Test User', phone: '+91-9876543211' }
    };

    const testUser = testCredentials[formData.email];
    
    if (testUser && testUser.password === formData.password) {
      // Use test credentials
      const userData = {
        id: Date.now(),
        name: testUser.name,
        email: formData.email,
        phone: testUser.phone || '+91-9876543210',
        role: testUser.role,
        department: testUser.department,
        designation: testUser.designation
      };
      
      if (onLogin) {
        onLogin(userData);
      }
      
      setLoading(false);
      return;
    }
    
    // Fallback to Supabase authentication
    const { error } = await signIn(formData.email, formData.password);
    
    if (error) {
      toast({
        title: 'Sign In Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      // Get user profile to determine role
      const profile = await getCurrentProfile();
      const userData = {
        id: user?.id,
        name: profile?.full_name || formData.name || "User",
        email: formData.email,
        phone: profile?.phone,
        role: profile?.user_type || "citizen"
      };
      
      if (onLogin) {
        onLogin(userData);
      }
    }
    
    setLoading(false);
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    
    if (error) {
      toast({
        title: 'Google Authentication Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
    
    setLoading(false);
  };

  const requestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signInWithOtp(formData.email);
    
    if (error) {
      toast({
        title: 'OTP Request Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setOtpEmail(formData.email);
      setOtpSent(true);
      setStep("verify");
      toast({
        title: 'OTP Sent',
        description: 'Please check your email for the verification code',
      });
    }
    
    setLoading(false);
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await verifyOtp(otpEmail, otp);
    
    if (error) {
      toast({
        title: 'OTP Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'You have been successfully authenticated',
      });
      
      // Get user profile to determine role
      const profile = await getCurrentProfile();
      const userData = {
        id: user?.id,
        name: profile?.full_name || "User",
        email: otpEmail,
        phone: profile?.phone,
        role: profile?.user_type || "citizen"
      };
      
      if (onLogin) {
        onLogin(userData);
      }
    }
    
    setLoading(false);
  };

  const completeRegistration = async (e) => {
    e.preventDefault();
    // This step is now handled in handleSignUp
    handleSignUp(e);
  };

  const handleSubmit = (e) => {
    if (isLogin) {
      if (step === "request") {
        handleSignIn(e);
      } else if (step === "verify") {
        handleOtpVerify(e);
      }
    } else {
      if (step === "request") {
        setStep("complete");
        e.preventDefault();
      } else if (step === "complete") {
        handleSignUp(e);
      }
    }
  };

  const handleOtpLogin = (e) => {
    requestOtp(e);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Indian flag inspired gradient with fine white grid */}
      <div className="absolute inset-0 z-0">
        {/* Enhanced multi-layer tricolor gradient with subtle blue accent */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, rgba(255,153,51,0.25) 0%, rgba(255,230,200,0.25) 12%, rgba(255,255,255,0.96) 48%, rgba(220,245,220,0.25) 72%, rgba(19,136,8,0.25) 100%), radial-gradient(1000px 600px at 20% 15%, rgba(255,153,51,0.20), transparent 60%), radial-gradient(900px 500px at 80% 85%, rgba(19,136,8,0.20), transparent 60%), radial-gradient(500px 500px at 60% 30%, rgba(0,56,168,0.15), transparent 60%)",
          }}
        />
        {/* Strong white grid (clear and visible) */}
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.9) 0, rgba(255,255,255,0.9) 2px, transparent 2px, transparent 22px), repeating-linear-gradient(90deg, rgba(255,255,255,0.9) 0, rgba(255,255,255,0.9) 2px, transparent 2px, transparent 22px)",
            backgroundSize: "22px 22px, 22px 22px",
          }}
        />
        {/* Vignette for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/10" />
        {/* Soft floating blobs for depth */}
        <div className="absolute top-[-40px] left-[-40px] w-[220px] h-[220px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle at 40% 40%, rgba(255,153,51,0.25), transparent 60%)" }} />
        <div className="absolute bottom-[-60px] right-[-40px] w-[260px] h-[260px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle at 60% 60%, rgba(19,136,8,0.25), transparent 60%)" }} />
        <div className="absolute top-[30%] right-[10%] w-[180px] h-[180px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle at 50% 50%, rgba(0,56,168,0.18), transparent 60%)" }} />
      </div>

      <div className="relative z-10 w-full max-w-md p-4">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-6">
            <img 
              src="/logo.png"
              alt="IGRS Logo" 
              className="h-16 w-16 object-cover rounded-lg shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            महाराष्ट्र शासन
          </h1>
          <h2 className="text-xl text-gray-600 mb-4">
            Citizen Portal
          </h2>
          <div className="flex justify-center gap-2">
            <div className="h-1 w-12 bg-[#FF9933] rounded-full"></div>
            <div className="h-1 w-12 bg-[#000080] rounded-full"></div>
            <div className="h-1 w-12 bg-[#138808] rounded-full"></div>
          </div>
        </div>

        {/* Login/Signup Toggle */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => {
                setIsLogin(true);
                setStep("request");
                setOtpSent(false);
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                isLogin 
                  ? "bg-white text-orange-600 shadow-sm" 
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setStep("request");
                setOtpSent(false);
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !isLogin 
                  ? "bg-white text-orange-600 shadow-sm" 
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === "request" && (
              <>
                {!isLogin && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        User Type
                      </label>
                      <select
                        name="userType"
                        value={userType}
                        onChange={(e) => setUserType(e.target.value)}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        required={!isLogin}
                      >
                        <option value="">Select user type</option>
                        <option value="citizen">Citizen</option>
                        <option value="official">Government Official</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          placeholder="Enter your full name"
                          required={!isLogin}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          placeholder="Enter your email"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                  </>
                )}

                {isLogin ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          placeholder="Enter your password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        placeholder="Enter 10-digit mobile number"
                        required
                        maxLength="10"
                      />
                    </div>
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        placeholder="Create a password (min 6 chars)"
                        minLength={6}
                        required={!isLogin}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        placeholder="Re-enter your password"
                        minLength={6}
                        required={!isLogin}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {step === "verify" && (
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                    <MessageCircle className="w-8 h-8 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Verify Your Email
                  </h3>
                  <p className="text-sm text-gray-600">
                    We've sent a 6-digit OTP to <span className="font-medium">{otpEmail}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-center text-lg tracking-widest"
                      placeholder="000000"
                      required
                      maxLength="6"
                    />
                  </div>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("request");
                      setOtpSent(false);
                      setOtp("");
                      setOtpEmail("");
                    }}
                    className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                  >
                    Use different email
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const { error } = await signInWithOtp(otpEmail);
                      if (error) {
                        toast({ title: 'Resend Failed', description: error.message, variant: 'destructive' });
                      } else {
                        toast({ title: 'OTP Resent', description: 'Please check your inbox/spam.' });
                      }
                    }}
                    className="ml-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Resend code
                  </button>
                </div>
              </div>
            )}

            {step === "complete" && (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <User className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Complete Your Profile
                  </h3>
                  <p className="text-sm text-gray-600">
                    Please provide additional details to complete your registration
                  </p>
                </div>

                {userType === "citizen" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                          placeholder="Enter your complete address"
                          rows="3"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Aadhar Number
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          type="text"
                          name="aadhar"
                          value={formData.aadhar}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          placeholder="Enter 12-digit Aadhar number"
                          maxLength="12"
                          required
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          type="text"
                          name="department"
                          value={formData.department}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          placeholder="Enter your department"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Designation
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          type="text"
                          name="designation"
                          value={formData.designation}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          placeholder="Enter your designation"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-lg font-medium hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isLogin ? 
                    (step === "verify" ? "Verifying..." : "Signing In...") : 
                    (step === "complete" ? "Creating Account..." : "Continue")
                  }
                </div>
              ) : (
                isLogin ? 
                  (step === "verify" ? "Verify & Sign In" : "Sign In") : 
                  (step === "complete" ? "Complete Registration" : "Continue")
              )}
            </button>
          </form>

          {/* Additional login options for login only */}
          {isLogin && step === "request" && (
            <>
              <div className="mt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or continue with</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all disabled:opacity-50"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleOtpLogin(e);
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-3 border border-orange-300 rounded-lg shadow-sm text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all disabled:opacity-50"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Sign in with OTP
                </button>
              </div>
            </>
          )}

          {step === "request" && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-1 text-orange-600 hover:text-orange-800 font-medium"
                >
                  {isLogin ? "Register here" : "Sign in here"}
                </button>
              </p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Need Help? Contact Citizen Support
              </p>
              <p className="text-xs text-gray-500 mt-1">
                support@maharashtra.gov.in | 1800-XXX-XXXX
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toastItem => (
          <Toast key={toastItem.id} toast={toastItem} onDismiss={dismiss} />
        ))}
      </div>
    </section>
  );
};

export default CitizenAuth;


