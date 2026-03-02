// Premium Citizen Dashboard - Fixed and Optimized
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import authService from "../../services/authService";
import { grievanceService } from "../../services/grievance.service";
import "../../styles/citizen-dashboard.css";
import "../../styles/premium-citizen.css";
import Grievances from "./Grievances";
import Statistics from "./Statistics";
import Announcements from "./Announcements";
import Community from "./components/Community";
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Bell,
  ArrowRight,
  Calendar,
  Vote,
  ExternalLink,
  Heart,
  Star,
  Award,
  Globe,
  Zap,
  Shield,
  Phone,
  Mail,
  Search,
  HelpCircle,
  Settings,
  BarChart3,
  Home,
  User,
  LogOut,
  ChevronDown,
  Plus,
  X,
  Upload,
  Image,
  File,
  Menu
} from "lucide-react";

const CitizenDashboard = ({ userAuth, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { citizenId } = useParams();
  const { signOut } = useAuth();
  const basePath = `/citizen/${citizenId || userAuth?.id || ''}`;

  // Redirect to own citizen URL if visiting another citizen's id
  useEffect(() => {
    if (userAuth?.id && citizenId && citizenId !== userAuth.id) {
      navigate(`/citizen/${userAuth.id}/dashboard`, { replace: true });
    }
  }, [userAuth?.id, citizenId, navigate]);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [isGrievanceModalOpen, setIsGrievanceModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [grievanceForm, setGrievanceForm] = useState({
    category: '',
    age: '',
    city: '',
    title: '',
    description: '',
    proof: null
  });
  const [grievanceSubmitting, setGrievanceSubmitting] = useState(false);
  const [grievanceSubmitError, setGrievanceSubmitError] = useState(null);

  const grievanceCategories = [
    'Infrastructure',
    'Healthcare',
    'Education',
    'Transport',
    'Sanitation',
    'Water Supply',
    'Electricity',
    'Roads & Highways',
    'Public Safety',
    'Environment',
    'Housing',
    'Other'
  ];

  const handleGrievanceFormChange = (field, value) => {
    setGrievanceForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setGrievanceForm(prev => ({
        ...prev,
        proof: file
      }));
    }
  };

  const handleSubmitGrievance = async (e) => {
    e.preventDefault();
    setGrievanceSubmitError(null);
    setGrievanceSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('category', grievanceForm.category);
      formData.append('age', String(grievanceForm.age));
      formData.append('city', grievanceForm.city);
      formData.append('title', grievanceForm.title);
      formData.append('description', grievanceForm.description);
      if (grievanceForm.proof && typeof window !== 'undefined' && grievanceForm.proof instanceof window.File) {
        formData.append('proof', grievanceForm.proof);
      }
      const result = await grievanceService.submitGrievanceForm(formData);
      setIsGrievanceModalOpen(false);
      setGrievanceForm({
        category: '',
        age: '',
        city: '',
        title: '',
        description: '',
        proof: null
      });
      alert(`Grievance submitted successfully!\n\nSubmission ID: ${result.grievance_id}\nStatus: Pending AI Analysis`);
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to submit grievance';
      setGrievanceSubmitError(message);
    } finally {
      setGrievanceSubmitting(false);
    }
  };
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update active tab based on current route (e.g. /citizen/:id/dashboard -> Dashboard)
  useEffect(() => {
    const path = location.pathname;
    const tab = path.replace(new RegExp(`^/citizen/[^/]+`), '') || '/dashboard';
    switch (tab) {
      case '/grievances':
        setActiveTab("Grievances");
        break;
      case '/statistics':
        setActiveTab("Statistics");
        break;
      case '/announcements':
        setActiveTab("Announcements");
        break;
      case '/community':
        setActiveTab("Community");
        break;
      case '/profile':
        setActiveTab("Profile");
        break;
      case '/settings':
        setActiveTab("Settings");
        break;
      case '/dashboard':
      default:
        setActiveTab("Dashboard");
    }
  }, [location.pathname]);

  const [grievanceStats, setGrievanceStats] = useState(null);
  const [recentGrievances, setRecentGrievances] = useState([]);

  // Fetch citizen profile when on profile page
  useEffect(() => {
    if (!location.pathname.endsWith('/profile')) return;
    let cancelled = false;
    setProfileLoading(true);
    authService.getProfile()
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch(() => { if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [location.pathname]);

  // Fetch grievance stats and recent list for profile (metadata: kab, kya, kitne)
  useEffect(() => {
    if (!location.pathname.endsWith('/profile')) return;
    let cancelled = false;
    Promise.all([
      grievanceService.getStats().catch(() => null),
      grievanceService.getGrievances({ limit: 5 }).then((r) => r.grievances || []).catch(() => [])
    ]).then(([stats, list]) => {
      if (!cancelled) {
        setGrievanceStats(stats || null);
        setRecentGrievances(Array.isArray(list) ? list : []);
      }
    });
    return () => { cancelled = true; };
  }, [location.pathname]);

  // Sidebar auto-expands on hover, collapses when mouse leaves (no manual collapse button)

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileOpen && !event.target.closest('.profile-dropdown-container')) {
        setIsProfileOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  // Sample data
  const statsData = [
    { id: 1, title: "Total Grievances", value: "1,247", change: "+12%", icon: FileText },
    { id: 2, title: "Resolved", value: "1,089", change: "+8%", icon: CheckCircle },
    { id: 3, title: "In Progress", value: "158", change: "+3%", icon: Clock },
    { id: 4, title: "Response Rate", value: "98.5%", change: "+2%", icon: TrendingUp }
  ];

  const announcementsData = [
    {
      id: 1,
      title: "New Digital Service Launch",
      date: "2024-01-15",
      type: "Digital Services",
      description: "Introduction of new online services for citizen convenience"
    },
    {
      id: 2,
      title: "Public Meeting Schedule",
      date: "2024-01-20",
      type: "Community",
      description: "Monthly public meeting for citizen feedback and suggestions"
    }
  ];

  const pollsData = [
    {
      id: 1,
      title: "City Park Development Plan",
      votes: 1234,
      daysLeft: 2,
      description: "Vote on the proposed development plan for the new city park"
    },
    {
      id: 2,
      title: "Public Transport Routes",
      votes: 890,
      daysLeft: 5,
      description: "Help decide the new public transport routes in your area"
    }
  ];

  const smartServicesData = [
    {
      id: 1,
      title: "Smart Grievance Resolution",
      description: "AI-powered system for faster complaint resolution",
      metric: "90% resolution rate",
      icon: Zap
    },
    {
      id: 2,
      title: "IGRS UP Initiative",
      description: "Unified platform for citizen grievances",
      metric: "1M+ citizens served",
      icon: Shield
    },
    {
      id: 3,
      title: "Digital Feedback System",
      description: "Real-time tracking and updates",
      metric: "24/7 monitoring",
      icon: Globe
    }
  ];

  const initiativesData = [
    { id: 1, title: "Digital India Initiative", description: "Empowering citizens through technology", icon: Award },
    { id: 2, title: "Smart City Project", description: "Building sustainable urban infrastructure", icon: Star },
    { id: 3, title: "E-Governance Portal", description: "Access government services online", icon: Globe }
  ];

  const faqsData = [
    {
      id: 1,
      question: "How do I track my grievance?",
      answer: "You can track your grievance using the tracking ID provided after submission. Our real-time tracking system provides updates at every stage."
    },
    {
      id: 2,
      question: "What happens after I submit a grievance?",
      answer: "Your grievance is analyzed by our AI system, categorized by priority, and assigned to the relevant department. You'll receive regular updates via SMS/email."
    },
    {
      id: 3,
      question: "How long does resolution take?",
      answer: "Resolution time varies by type of grievance. Simple issues are typically resolved within 48 hours, while complex cases may take 7-14 days."
    },
    {
      id: 4,
      question: "Can I submit anonymous complaints?",
      answer: "Yes, you can submit anonymous complaints. However, we recommend providing contact details for better follow-up and updates."
    }
  ];

  // Render content based on current route
  const renderMainContent = () => {
    const path = location.pathname;
    const tab = path.replace(new RegExp(`^/citizen/[^/]+`), '') || '/dashboard';
    
    if (tab === '/grievances') {
      return <Grievances />;
    }
    
    if (tab === '/statistics') {
      return <Statistics />;
    }
    
    if (tab === '/announcements') {
      return <Announcements />;
    }
    
    if (tab === '/community') {
      return <Community />;
    }
    
    if (tab === '/profile') {
      const displayProfile = profile || userAuth;
      const memberSince = (displayProfile?.created_at && new Date(displayProfile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })) || '—';
      const lastLogin = (displayProfile?.last_login && new Date(displayProfile.last_login).toLocaleString('en-IN')) || '—';
      return (
        <main className="flex-1 p-2 sm:p-3 md:p-4 relative z-10 overflow-y-auto premium-scrollbar min-w-0">
          <div className="max-w-3xl mx-auto w-full">
            <h2 className="text-xl sm:text-2xl font-bold premium-heading mb-4">My Profile</h2>
            {profileLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#7D6E5C] border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 pb-4 border-b border-[#D4CCC3]">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#F5F3F0] flex items-center justify-center ring-2 ring-[#7D6E5C]/20">
                    {displayProfile?.profile_image ? (
                      <img src={displayProfile.profile_image} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-[#7D6E5C]" />
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-xl font-bold premium-heading" style={{ fontFamily: 'Georgia, serif' }}>
                      {displayProfile?.full_name || 'Citizen'}
                    </h3>
                    <p className="premium-text-muted text-sm">Citizen · IGRS Portal</p>
                    <p className="premium-text text-sm mt-1">{displayProfile?.email || '—'}</p>
                  </div>
                </div>
                <dl className="space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5 border-b border-[#E8E4DF]">
                    <dt className="text-sm font-semibold premium-text-muted shrink-0 w-24 sm:w-28 flex items-center gap-2"><Mail size={14} /> Email</dt>
                    <dd className="premium-text">{displayProfile?.email || 'Not set'}</dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5 border-b border-[#E8E4DF]">
                    <dt className="text-sm font-semibold premium-text-muted shrink-0 w-24 sm:w-28 flex items-center gap-2"><Phone size={14} /> Phone</dt>
                    <dd className="premium-text text-sm sm:text-base break-words">{displayProfile?.phone || 'Not set'}</dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2.5 border-b border-[#E8E4DF]">
                    <dt className="text-sm font-semibold premium-text-muted shrink-0 w-24 sm:w-28 flex items-center gap-2"><Globe size={14} /> Address</dt>
                    <dd className="premium-text text-sm sm:text-base break-words">{displayProfile?.address || 'Not set'}</dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5 border-b border-[#E8E4DF]">
                    <dt className="text-sm font-semibold premium-text-muted shrink-0 w-24 sm:w-28 flex items-center gap-2"><Calendar size={14} /> Member since</dt>
                    <dd className="premium-text text-sm sm:text-base">{memberSince}</dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5 border-b border-[#E8E4DF]">
                    <dt className="text-sm font-semibold premium-text-muted shrink-0 w-24 sm:w-28 flex items-center gap-2"><Clock size={14} /> Last login</dt>
                    <dd className="premium-text text-sm sm:text-base">{lastLogin}</dd>
                  </div>
                  {/* Grievance metadata: kab, kya, kitne */}
                  <div className="flex flex-col gap-1 sm:gap-4 py-2.5 border-b border-[#E8E4DF]">
                    <dt className="text-sm font-semibold premium-text-muted shrink-0 w-24 sm:w-28 flex items-center gap-2"><FileText size={14} /> Grievance summary</dt>
                    <dd className="premium-text space-y-2">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span>Total: <strong className="premium-heading">{grievanceStats?.total ?? profile?.total_grievances ?? 0}</strong></span>
                        <span>Resolved: <strong className="premium-heading">{grievanceStats?.resolved ?? profile?.resolved_grievances ?? 0}</strong></span>
                        <span>Pending: <strong className="premium-heading">{grievanceStats?.pending ?? 0}</strong></span>
                      </div>
                      {recentGrievances.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[#E8E4DF]">
                          <p className="text-xs premium-text-muted font-semibold mb-1">Recent (kab — kya)</p>
                          <ul className="text-sm space-y-1">
                            {recentGrievances.map((g) => {
                              const title = (g.grievance_text && (g.grievance_text.split('\n').find(l => l.trim().startsWith('Title:')) || '').replace(/^Title:\s*/i, '').trim()) || g.grievance_text?.slice(0, 40) || 'Grievance';
                              const date = g.created_at ? new Date(g.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                              return (
                                <li key={g.id} className="flex items-baseline gap-2">
                                  <span className="premium-text-muted shrink-0">{date}</span>
                                  <span className="premium-text truncate">{title}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </main>
      );
    }

    if (tab === '/settings') {
      return (
        <main className="flex-1 p-2 sm:p-3 md:p-4 relative z-10 overflow-y-auto min-w-0">
          <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8 shadow-lg border-2 border-gray-300 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Settings Page</h1>
            <p className="text-gray-600">User preferences and account settings coming soon...</p>
          </div>
        </main>
      );
    }
    
    // Default dashboard content
    return (
      <main className="flex-1 p-2 sm:p-3 md:p-4 relative z-10 overflow-y-auto premium-scrollbar min-w-0">
          {/* Hero Section with Create Grievance Button - Premium Design */}
        <div className="mb-4 md:mb-6">
          <div className="relative premium-card rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-8 shadow-xl overflow-hidden premium-hover-lift">
            {/* Elegant Pattern Background */}
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                <defs>
                  <pattern id="premium-dots" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="10" cy="10" r="1.5" fill="#7D6E5C"/>
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#premium-dots)" />
              </svg>
            </div>
            
            {/* Decorative Corner Element */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                <polygon points="50,0 100,50 50,100 0,50" fill="#7D6E5C" />
              </svg>
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="mb-0 text-center md:text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 premium-heading" style={{ fontFamily: 'Georgia, serif' }}>
                  Welcome, {userAuth?.full_name || userAuth?.username || 'Citizen'}
                </h1>
                <p className="premium-text text-sm sm:text-base md:text-lg" style={{ fontFamily: 'Georgia, serif' }}>
                  Your voice matters. Submit grievances and track their progress.
                </p>
              </div>
              <button
                onClick={() => setIsGrievanceModalOpen(true)}
                className="group relative premium-btn-primary px-5 py-3 sm:px-6 sm:py-3.5 md:px-8 md:py-4 rounded-xl font-semibold flex items-center gap-2 sm:gap-3 transition-all duration-300 shrink-0"
              >
                <Plus className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Create Grievance</span>
              </button>
            </div>
          </div>

          {/* Overview Section */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 mt-4 md:mt-6">
            <h2 className="text-lg sm:text-xl font-bold premium-heading">Overview</h2>
            <select className="premium-input px-3 py-2 text-sm">
              <option>Last month</option>
              <option>Last week</option>
              <option>Last year</option>
            </select>
          </div>

            {/* Stats Cards - Premium Design */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-4 md:mb-6">
              {statsData.map((stat, index) => (
              <div key={stat.id} className="premium-stats-card premium-hover-lift">
                  <div className="flex items-center justify-between mb-4">
                    <div className="premium-icon-container">
                      <stat.icon size={20} className="premium-text" />
                    </div>
                    <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                      stat.change.startsWith('+') 
                        ? 'premium-badge-success' 
                        : 'premium-badge-error'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold premium-text-muted mb-1">{stat.title}</h3>
                  <p className="text-2xl font-bold premium-heading">{stat.value}</p>
                </div>
              ))}
          </div>
            </div>

        {/* Latest Announcements and Grievance Activity in a row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          {/* Latest Announcements */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 hover:border-amber-300/70 transition-all duration-300">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Latest Announcements</h3>
                <button className="text-amber-700 hover:text-amber-900 text-sm font-medium flex items-center gap-1">
                  View all
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {announcementsData.map((announcement) => (
                  <div key={announcement.id} className="border border-gray-200/50 bg-white/60 backdrop-blur-sm p-4 rounded-lg hover:border-amber-300/70 transition-all duration-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{announcement.title}</h4>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {announcement.type}
                      </span>
              </div>
                    <p className="text-sm text-gray-600 mb-2">{announcement.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar size={12} />
                      <span>{announcement.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Public Polls */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 hover:border-amber-300/70 transition-all duration-300">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Active Public Polls</h3>
                <button className="text-amber-700 hover:text-amber-900 text-sm font-medium flex items-center gap-1">
                  View all
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {pollsData.map((poll) => (
                  <div key={poll.id} className="border border-gray-200/50 bg-white/60 backdrop-blur-sm p-4 rounded-lg hover:border-amber-300/70 transition-all duration-200">
                    <h4 className="font-medium text-gray-900 text-sm mb-2">{poll.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{poll.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Vote size={12} />
                        <span>{poll.votes} votes</span>
                    </div>
                      <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                        Ends in {poll.daysLeft} days
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
              </div>

        {/* Grievance Redressal Process Flow */}
        <div className="mb-4 md:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Grievance Redressal Process</h3>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 hover:border-amber-300/70 transition-all duration-300 overflow-hidden">
            <div className="p-4 pr-2">
              <img 
                src="/image.png" 
                alt="Grievance Redressal Process Flow" 
                className="w-full h-auto rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
              />
            </div>
          </div>
        </div>

        {/* Smart Services */}
        <div className="mb-4 md:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Smart Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {smartServicesData.map((service) => (
              <div key={service.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200/50 hover:border-amber-300/70 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <service.icon size={24} className="text-amber-700" />
              </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{service.title}</h4>
                    <p className="text-xs text-amber-700 font-medium">{service.metric}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">{service.description}</p>
                <button className="text-amber-700 hover:text-amber-900 text-sm font-medium flex items-center gap-1">
                  Learn more
                  <ExternalLink size={14} />
                </button>
              </div>
            ))}
          </div>
          {/* Feedback and Support buttons */}
          <div className="hidden md:block mt-6">
            <div className="flex gap-4">
              <button
                onClick={() => setIsFeedbackOpen(true)}
                className="flex-1 bg-[var(--dark)] text-white py-3 px-4 rounded-xl text-sm font-medium shadow-lg hover:bg-amber-700 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Heart size={18} />
                Give Feedback
              </button>
              <button
                onClick={() => {/* Add support functionality */}}
                className="flex-1 bg-amber-600 text-white py-3 px-4 rounded-xl text-sm font-medium shadow-lg hover:bg-amber-700 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <HelpCircle size={18} />
                Get Support
              </button>
            </div>
          </div>
        </div>

        {/* Government Initiatives */}
        <div className="mb-4 md:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Government Initiatives</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {initiativesData.map((initiative) => (
              <div key={initiative.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200/50 hover:border-amber-300/70 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-[var(--dark)] rounded-lg">
                    <initiative.icon size={24} className="text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900">{initiative.title}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-4">{initiative.description}</p>
                <button className="text-amber-700 hover:text-amber-900 text-sm font-medium flex items-center gap-1">
                  Learn more →
                  <ExternalLink size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div className="mb-4 md:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50">
            <div className="p-6">
              <div className="space-y-6">
                {faqsData.map((faq) => (
                  <div key={faq.id} className="border border-gray-200/50 bg-white/60 backdrop-blur-sm p-4 rounded-lg hover:border-amber-300/70 transition-all duration-200">
                    <h4 className="font-medium text-gray-900 mb-2">{faq.question}</h4>
                    <p className="text-sm text-gray-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Removed older thank-you section */}

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>© 2023 Grievance System. All rights reserved.</p>
        </footer>
      </main>
    );
  };

  const sidebarWidth = isSidebarCollapsed ? '64px' : '256px';
  return (
    <div
      className="min-h-screen flex relative premium-bg overflow-x-hidden"
      style={{ ['--sidebar-width']: sidebarWidth }}
    >
      {/* Premium Background Patterns */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(125, 110, 92, 0.15) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}></div>
      </div>
      
      {/* Subtle Texture Overlay */}
      <div className="fixed inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%237D6E5C' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      {/* Ultra Dense White Grid Pattern */}
      <div 
        className="fixed inset-0 opacity-25"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='denseGrid' width='8' height='8' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 8 0 L 0 0 0 8 M 4 0 L 4 8 M 0 4 L 8 4' fill='none' stroke='%23ffffff' stroke-width='0.8'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23denseGrid)' /%3E%3C/svg%3E")`,
          backgroundSize: '8px 8px'
        }}
      ></div>
      
      {/* Dense Cross Pattern */}
      <div 
        className="fixed inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='denseCross' width='12' height='12' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 0 0 L 12 12 M 12 0 L 0 12' fill='none' stroke='%23ffffff' stroke-width='0.8'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23denseCross)' /%3E%3C/svg%3E")`,
          backgroundSize: '12px 12px'
        }}
      ></div>

      {/* Premium Sidebar - smooth expand/collapse */}
      <aside
        className="premium-sidebar flex flex-col fixed left-0 top-0 bottom-0 z-40 shadow-2xl"
        style={{ width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)' }}
        onMouseEnter={() => setIsSidebarCollapsed(false)}
        onMouseLeave={() => setIsSidebarCollapsed(true)}
      >
        {/* Logo Section - centered only when collapsed */}
        <div className={`border-b premium-border premium-sidebar-transition flex flex-col ${isSidebarCollapsed ? 'items-center p-3' : 'items-stretch p-4'}`}>
          <div className={`flex items-center gap-3 w-full ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-lg ring-2 ring-[#7D6E5C]/20 transition-all duration-300 ease-out hover:ring-[#7D6E5C]/40">
              <img src="/logo.png" alt="IGRS" className="w-full h-full object-cover" />
            </div>
            <div className={`overflow-hidden premium-sidebar-transition ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <h1 className="text-lg font-bold premium-heading whitespace-nowrap">IGRS Portal</h1>
              <p className="text-xs premium-text-muted whitespace-nowrap">Citizen Dashboard</p>
            </div>
          </div>
          <div className={`mt-4 premium-card p-3 rounded-lg overflow-hidden premium-sidebar-transition ${isSidebarCollapsed ? 'max-h-0 opacity-0 mt-0 p-0 w-full max-w-[calc(var(--sidebar-width)-2rem)]' : 'max-h-32 opacity-100 w-full'}`}>
            <div className={`text-sm font-semibold premium-text ${isSidebarCollapsed ? 'text-center' : 'text-left'}`}>
              {currentTime.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className={`text-xs premium-text-muted mt-1 ${isSidebarCollapsed ? 'text-center' : 'text-left'}`}>
              {currentTime.toLocaleDateString('en-IN', { weekday: 'long' })}
            </div>
          </div>
        </div>

        {/* Navigation - centered when collapsed, left-aligned when expanded */}
        <nav className={`flex-1 p-4 premium-scrollbar overflow-y-auto flex flex-col premium-sidebar-transition ${isSidebarCollapsed ? 'items-center' : ''}`}>
          <div className={`space-y-2 w-full premium-sidebar-transition ${isSidebarCollapsed ? 'max-w-[calc(var(--sidebar-width)-2rem)]' : ''}`}>
            {[
              { label: "Dashboard", icon: Home, path: `${basePath}/dashboard` },
              { label: "Profile", icon: User, path: `${basePath}/profile` },
              { label: "Grievances", icon: FileText, path: `${basePath}/grievances` },
              { label: "Statistics", icon: BarChart3, path: `${basePath}/statistics` },
              { label: "Announcements", icon: Bell, path: `${basePath}/announcements` },
              { label: "Community", icon: Users, path: `${basePath}/community` },
              { label: "Settings", icon: Settings, path: `${basePath}/settings` }
            ].map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveTab(item.label);
                  if (item.path) navigate(item.path);
                }}
                className={`w-full flex items-center rounded-xl transition-colors duration-200 group ${
                  isSidebarCollapsed ? 'justify-center px-0 py-3' : 'justify-start gap-3 px-3 py-3'
                } text-sm font-semibold ${
                  activeTab === item.label
                    ? "premium-btn-primary text-white shadow-md"
                    : "premium-text hover:bg-gradient-to-r hover:from-[#FFF8ED] hover:to-[#F5F3F0]"
                }`}
                title={item.label}
              >
                <item.icon size={20} className="flex-shrink-0" />
                <span className={`overflow-hidden premium-sidebar-transition whitespace-nowrap ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </nav>

        {/* Bottom Section - centered only when collapsed, left-aligned when expanded */}
        <div className={`border-t premium-border premium-sidebar-transition flex flex-col ${isSidebarCollapsed ? 'items-center p-3' : 'items-stretch p-4'}`}>
          <div className={`space-y-2 w-full premium-sidebar-transition ${isSidebarCollapsed ? 'max-w-[calc(var(--sidebar-width)-2rem)]' : ''}`}>
            <button className={`w-full flex items-center premium-text hover:bg-[#FFF8ED] rounded-lg transition-colors duration-300 ease-out group ${isSidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-start gap-3 px-3 py-2.5'}`}>
              <HelpCircle size={20} className="flex-shrink-0" />
              <span className={`overflow-hidden premium-sidebar-transition whitespace-nowrap ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                Help & Support
              </span>
            </button>
            <button
              onClick={async () => { await signOut(); onLogout(); navigate('/'); }}
              className={`w-full flex items-center text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-300 ease-out group ${isSidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-start gap-3 px-3 py-2.5'}`}
            >
              <LogOut size={20} className="flex-shrink-0" />
              <span className={`overflow-hidden premium-sidebar-transition whitespace-nowrap text-sm font-medium ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                Logout
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area - margin matches sidebar width exactly; only this area scrolls */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden" style={{ marginLeft: 'var(--sidebar-width)' }}>
        {/* Premium Top Bar - fixed, not scrollable, full width so bar meets sidebar */}
        <header
          className="premium-navbar fixed top-0 left-0 z-30 shadow-2xl backdrop-blur-md flex flex-col justify-center min-h-14 sm:min-h-16 md:min-h-[72px] py-2 px-3 box-border overflow-hidden shrink-0"
          style={{
            width: '100%',
            paddingLeft: 'var(--sidebar-width)',
          }}
        >
          {/* Desktop: one row - title, search, icons (compact gap) */}
          <div className="hidden md:flex items-center justify-between w-full gap-1 min-w-0">
            <div className="flex items-center gap-1 shrink-0">
              <div className="w-1.5 lg:w-2 h-6 lg:h-8 bg-gradient-to-b from-[#7D6E5C] to-[#5D4E3C] rounded-full shrink-0"></div>
              <h1 className="text-lg lg:text-2xl font-bold text-white truncate">{activeTab}</h1>
            </div>
            <div className="relative group flex-1 min-w-0 max-w-[220px] sm:max-w-[280px] md:max-w-[340px] lg:max-w-[400px] xl:max-w-[480px] mx-1">
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-amber-600 transition shrink-0" />
              <input
                type="text"
                placeholder="Search grievances, announcements..."
                className="pl-9 pr-3 py-2 w-full bg-white border border-gray-700/40 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 shadow-sm placeholder:text-gray-400"
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button className="p-2.5 lg:p-3.5 text-gray-200 hover:text-white bg-white/5 rounded-xl lg:rounded-2xl border border-gray-700 hover:border-gray-500 transition" aria-label="Add">
                <Plus size={18} className="lg:w-5 lg:h-5" />
              </button>
              <button className="p-2.5 lg:p-3.5 text-gray-200 hover:text-white bg-white/5 rounded-xl lg:rounded-2xl border border-gray-700 hover:border-gray-500 transition" aria-label="Notifications">
                <Bell size={18} className="lg:w-5 lg:h-5" />
              </button>
              <button className="p-2.5 lg:p-3.5 text-gray-200 hover:text-white bg-white/5 rounded-xl lg:rounded-2xl border border-gray-700 hover:border-gray-500 transition" aria-label="Help">
                <HelpCircle size={18} className="lg:w-5 lg:h-5" />
              </button>
              <button
                onClick={() => { setActiveTab("Profile"); navigate(`${basePath}/profile`); }}
                className="flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-1.5 lg:py-2 rounded-xl lg:rounded-2xl bg-white/5 border border-gray-700 hover:border-gray-500 hover:bg-white/10 transition min-w-0"
              >
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-[#7D6E5C] to-[#5D4E3C] border border-white/20 shrink-0">
                  <User size={18} className="text-white lg:w-5 lg:h-5" />
                </div>
                <span className="text-xs lg:text-sm font-medium text-white truncate max-w-[80px] lg:max-w-[120px] hidden xl:block">
                  {userAuth?.full_name || userAuth?.email || 'Profile'}
                </span>
              </button>
            </div>
          </div>

          {/* Mobile: compact title + search */}
          <div className="md:hidden flex items-center gap-2 w-full min-w-0">
            <div className="w-1 h-4 bg-[#7D6E5C] rounded-full flex-shrink-0"></div>
            <h1 className="text-sm font-bold text-white truncate flex-shrink-0 max-w-[80px]">{activeTab}</h1>
            <div className="relative group flex-1 min-w-0 max-w-[200px]">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-6 pr-2 py-1.5 bg-white border border-gray-700/40 rounded-md text-xs focus:ring-2 focus:ring-amber-500/40 w-full min-w-0 placeholder:text-gray-400"
              />
            </div>
          </div>
        </header>

        {/* Scrollable content only - tabbar stays fixed */}
        <div className="relative z-10 pt-14 sm:pt-16 md:pt-[72px] px-2 sm:px-3 md:px-4 lg:px-6 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {renderMainContent()}
        </div>
      </div> {/* End Main Content Area */}

      {/* Feedback Modal */}
        {isFeedbackOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setIsFeedbackOpen(false)}></div>
            <div className="relative z-50 w-[92%] max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Your feedback is valuable</h3>
                <p className="text-sm text-gray-600">Tell us what you think. It helps us improve.</p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsFeedbackOpen(false);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input type="text" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" placeholder="Short summary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Describe what you think</label>
                  <textarea required rows="5" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y" placeholder="Your suggestions, issues, or ideas..." />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setIsFeedbackOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--dark)] text-white hover:bg-amber-700">Send Feedback</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Grievance Submission Modal */}
        {isGrievanceModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-gray-200">
              {/* Enhanced Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-100 rounded-xl">
                    <FileText className="w-6 h-6 text-gray-700" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Brush Script MT, cursive, serif' }}>
                      Submit Your Grievance
                    </h2>
                    <p className="text-sm text-gray-600">Same fields as Telegram: Title, Category, City, Age, Description</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsGrievanceModalOpen(false)}
                  className="p-3 hover:bg-gray-100 rounded-xl transition-colors group"
                >
                  <X className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
                </button>
              </div>
              
              <form onSubmit={handleSubmitGrievance} className="p-8 space-y-8">
                {/* Same order as Telegram: Title, Category, City, Age, Description */}

                {/* Title */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={grievanceForm.title}
                    onChange={(e) => handleGrievanceFormChange('title', e.target.value)}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-200 bg-gray-50 hover:bg-white"
                    placeholder="Brief title (e.g. Garbage, Water Supply)"
                  />
                </div>

                {/* Category */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    Category *
                  </label>
                  <select
                    required
                    value={grievanceForm.category}
                    onChange={(e) => handleGrievanceFormChange('category', e.target.value)}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-200 bg-gray-50 hover:bg-white"
                  >
                    <option value="">Choose category (e.g. Sanitation, Water Supply)</option>
                    {grievanceCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* City and Age */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={grievanceForm.city}
                      onChange={(e) => handleGrievanceFormChange('city', e.target.value)}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-200 bg-gray-50 hover:bg-white"
                      placeholder="Enter your city"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      Age *
                    </label>
                    <input
                      type="number"
                      required
                      min="18"
                      max="100"
                      value={grievanceForm.age}
                      onChange={(e) => handleGrievanceFormChange('age', e.target.value)}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-200 bg-gray-50 hover:bg-white"
                      placeholder="Your age"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    Description *
                  </label>
                  <textarea
                    required
                    rows="5"
                    value={grievanceForm.description}
                    onChange={(e) => handleGrievanceFormChange('description', e.target.value)}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
                    placeholder="Describe your grievance in detail (when, where, how it occurred)..."
                  />
                </div>

                {/* File Upload */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    Proof/Evidence (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-all duration-300 bg-gray-50 hover:bg-white group">
                    <input
                      type="file"
                      id="proof-upload"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label htmlFor="proof-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center">
                        <div className="p-4 bg-gray-200 rounded-full mb-4 group-hover:bg-gray-300 transition-colors">
                          <Upload className="w-8 h-8 text-gray-600" />
                        </div>
                        <p className="text-base font-medium text-gray-700 mb-2">Click to upload files or drag and drop</p>
                        <p className="text-sm text-gray-500">Images, PDF, DOC (Max 10MB)</p>
                      </div>
                    </label>
                    {grievanceForm.proof && (
                      <div className="mt-4 flex items-center justify-center gap-3 text-sm bg-gray-100 px-4 py-3 rounded-lg">
                        <File className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-700">{grievanceForm.proof.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {grievanceSubmitError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    {grievanceSubmitError}
                  </div>
                )}
                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsGrievanceModalOpen(false)}
                    disabled={grievanceSubmitting}
                    className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={grievanceSubmitting}
                    className="px-8 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {grievanceSubmitting ? (
                      <>
                        <span className="animate-pulse">Submitting...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5" />
                        Submit Grievance
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div> 
  );
};

export default CitizenDashboard;