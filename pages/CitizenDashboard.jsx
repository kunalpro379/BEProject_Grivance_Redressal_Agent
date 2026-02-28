import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "../styles/citizen-dashboard.css";
import Grievances from "./Grievances";
import Statistics from "./Statistics";
import Announcements from "./Announcements";
import Community from "../components/Community";
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
  File
} from "lucide-react";

const CitizenDashboard = ({ userAuth, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [isGrievanceModalOpen, setIsGrievanceModalOpen] = useState(false);
  const [grievanceForm, setGrievanceForm] = useState({
    category: '',
    age: '',
    city: '',
    title: '',
    description: '',
    proof: null
  });

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

  const handleSubmitGrievance = (e) => {
    e.preventDefault();
    // Here you would typically send the data to your backend
    console.log('Grievance submitted:', grievanceForm);
    alert('Grievance submitted successfully!');
    setIsGrievanceModalOpen(false);
    setGrievanceForm({
      category: '',
      age: '',
      city: '',
      title: '',
      description: '',
      proof: null
    });
  };
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    switch (path) {
      case '/citizen/grievances':
        setActiveTab("Grievances");
        break;
      case '/citizen/statistics':
        setActiveTab("Statistics");
        break;
      case '/citizen/announcements':
        setActiveTab("Announcements");
        break;
      case '/citizen/community':
        setActiveTab("Community");
        break;
      case '/citizen/settings':
        setActiveTab("Settings");
        break;
      default:
        setActiveTab("Dashboard");
    }
  }, [location.pathname]);

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
    
    if (path === '/citizen/grievances') {
      return <Grievances />;
    }
    
    if (path === '/citizen/statistics') {
      return <Statistics />;
    }
    
    if (path === '/citizen/announcements') {
      return <Announcements />;
    }
    
    if (path === '/citizen/community') {
      return <Community />;
    }
    
    if (path === '/citizen/settings') {
      return (
        <main className="flex-1 p-2 sm:p-4 md:p-6 relative z-10 overflow-y-auto">
          <div className="bg-white rounded-xl p-12 shadow-lg border-2 border-gray-300 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Settings Page</h1>
            <p className="text-gray-600">User preferences and account settings coming soon...</p>
          </div>
        </main>
      );
    }
    
    // Default dashboard content
    return (
      <main className="flex-1 p-2 sm:p-4 md:p-6 relative z-10 overflow-y-auto">
          {/* Hero Section with Create Grievance Button */}
        <div className="mb-6 md:mb-8">
          <div className="relative bg-white rounded-xl p-6 md:p-8 border-2 border-gray-200 shadow-lg overflow-hidden">
            {/* Subtle Pattern Background */}
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                <defs>
                  <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#dots)" />
              </svg>
            </div>
            
            {/* Geometric Pattern Overlay */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                <polygon points="50,0 100,50 50,100 0,50" fill="currentColor" />
              </svg>
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-800" style={{ fontFamily: 'Brush Script MT, cursive, serif' }}>
                  Welcome, {userAuth?.username || 'Citizen'}
                </h1>
                <p className="text-gray-600 text-lg" style={{ fontFamily: 'Brush Script MT, cursive, serif' }}>
                  Your voice matters. Submit grievances and track their progress.
                </p>
              </div>
              <button
                onClick={() => setIsGrievanceModalOpen(true)}
                className="group relative bg-gray-900 text-white hover:bg-gray-800 px-8 py-4 rounded-xl font-semibold flex items-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gray-700 to-gray-900 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Plus className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Create Grievance</span>
              </button>
            </div>
          </div>

          {/* Overview Section */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Last month</option>
              <option>Last week</option>
              <option>Last year</option>
            </select>
          </div>

            {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
              {statsData.map((stat, index) => (
              <div key={stat.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200/50 hover:border-blue-300/70 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <stat.icon size={20} className="text-gray-600" />
                    </div>
                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                      stat.change.startsWith('+') 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              ))}
          </div>
            </div>

        {/* Latest Announcements and Grievance Activity in a row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Latest Announcements */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 hover:border-blue-300/70 transition-all duration-300">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Latest Announcements</h3>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                  View all
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {announcementsData.map((announcement) => (
                  <div key={announcement.id} className="border border-gray-200/50 bg-white/60 backdrop-blur-sm p-4 rounded-lg hover:border-blue-300/70 transition-all duration-200">
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
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 hover:border-blue-300/70 transition-all duration-300">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Active Public Polls</h3>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                  View all
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {pollsData.map((poll) => (
                  <div key={poll.id} className="border border-gray-200/50 bg-white/60 backdrop-blur-sm p-4 rounded-lg hover:border-blue-300/70 transition-all duration-200">
                    <h4 className="font-medium text-gray-900 text-sm mb-2">{poll.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{poll.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Vote size={12} />
                        <span>{poll.votes} votes</span>
                    </div>
                      <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
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
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Grievance Redressal Process</h3>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 hover:border-blue-300/70 transition-all duration-300 overflow-hidden">
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
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Smart Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {smartServicesData.map((service) => (
              <div key={service.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200/50 hover:border-blue-300/70 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <service.icon size={24} className="text-blue-600" />
              </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{service.title}</h4>
                    <p className="text-xs text-blue-600 font-medium">{service.metric}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">{service.description}</p>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
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
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl hover:brightness-110 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Heart size={18} />
                Give Feedback
              </button>
              <button
                onClick={() => {/* Add support functionality */}}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl hover:brightness-110 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <HelpCircle size={18} />
                Get Support
              </button>
            </div>
          </div>
        </div>

        {/* Government Initiatives */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Government Initiatives</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {initiativesData.map((initiative) => (
              <div key={initiative.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200/50 hover:border-blue-300/70 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <initiative.icon size={24} className="text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900">{initiative.title}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-4">{initiative.description}</p>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                  Learn more →
                  <ExternalLink size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h3>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50">
            <div className="p-6">
              <div className="space-y-6">
                {faqsData.map((faq) => (
                  <div key={faq.id} className="border border-gray-200/50 bg-white/60 backdrop-blur-sm p-4 rounded-lg hover:border-blue-300/70 transition-all duration-200">
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

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Background Gradient with Patterns */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 animate-gradientShift"></div>
      
      {/* Additional Gradient Overlay */}
      <div className="fixed inset-0 bg-gradient-to-tr from-transparent via-gray-200/40 to-gray-300/50"></div>
      
      {/* Subtle Radial Gradient */}
      <div className="fixed inset-0 bg-gradient-radial from-transparent via-gray-200/30 to-gray-400/40"></div>
      
      {/* Enhanced Diagonal Gradient */}
      <div className="fixed inset-0 bg-gradient-to-bl from-gray-300/20 via-transparent to-gray-400/30"></div>
      
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

      {/* Sidebar - Fixed */}
      <div className="w-16 sm:w-18 md:w-64 bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 h-full z-30">
        {/* Logo */}
        <div className="p-2 sm:p-3 md:p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
              <img src="/logo.png" alt="IGRS Logo" className="w-full h-full object-contain" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-lg font-semibold text-gray-900">IGRS Portal</h1>
              <p className="text-xs text-gray-500">Citizen Dashboard</p>
            </div>
          </div>
          {/* Date and Day */}
          <div className="hidden md:block mt-4">
            <div className="text-sm font-medium text-gray-800">
              {currentTime.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="text-xs text-gray-500">
              {currentTime.toLocaleDateString('en-IN', { weekday: 'long' })}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 sm:p-3 md:p-4">
          <div className="space-y-1 sm:space-y-2">
            {[
              { label: "Dashboard", icon: Home, path: "/citizen/dashboard" },
              { label: "Grievances", icon: FileText, path: "/citizen/grievances" },
              { label: "Statistics", icon: BarChart3, path: "/citizen/statistics" },
              { label: "Announcements", icon: Bell, path: "/citizen/announcements" },
              { label: "Community", icon: Users, path: "/citizen/community" },
              { label: "Settings", icon: Settings, path: "/citizen/settings" }
            ].map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveTab(item.label);
                  if (item.path) {
                    navigate(item.path);
                  }
                }}
                className={`w-full flex items-center gap-2 md:gap-3 px-1 sm:px-2 md:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === item.label
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200/50 shadow-sm"
                    : "text-gray-600 hover:bg-gray-50/80 hover:text-gray-900 hover:shadow-sm"
                }`}
                title={item.label}
              >
                <item.icon size={24} className="flex-shrink-0 sm:w-5 sm:h-5 md:w-5 md:h-5" />
                <span className="hidden md:inline">{item.label}</span>
                <ChevronDown size={14} className={`hidden md:inline ml-auto ${
                  item.label === "Grievances" || item.label === "Community" ? 'block' : 'hidden'
                }`} />
              </button>
            ))}
          </div>
        </nav>

        {/* Bottom Utilities */}
        <div className="p-2 sm:p-3 md:p-4 border-t border-gray-200">
          <div className="space-y-1 sm:space-y-2">
            {/* Mobile-only quick actions (all 4 icons from navbar) - Stacked vertically */}
            <div className="md:hidden space-y-2 mb-4">
              <button className="w-full p-3 text-gray-700 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 flex items-center justify-center">
                <Plus size={24} />
              </button>
              <button className="w-full p-3 text-gray-700 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 hover:border-green-300 transition-all duration-200 flex items-center justify-center">
                <Bell size={24} />
              </button>
              <button className="w-full p-3 text-gray-700 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 hover:border-purple-300 transition-all duration-200 flex items-center justify-center">
                <HelpCircle size={24} />
              </button>
              <button className="w-full p-3 text-gray-700 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 hover:border-orange-300 transition-all duration-200 flex items-center justify-center">
                <User size={24} />
              </button>
              {/* Mobile Logout Button */}
              <button 
                onClick={async () => { await signOut(); onLogout(); navigate('/'); }}
                className="w-full p-3 text-red-600 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all duration-200 flex items-center justify-center"
              >
                <LogOut size={24} />
              </button>
            </div>
            {/* Desktop-only Help & Support and Logout buttons */}
            <button className="hidden md:flex w-full items-center gap-2 md:gap-3 px-1 sm:px-2 md:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50/80 hover:text-gray-900 rounded-lg transition-all duration-200">
              <HelpCircle size={20} className="sm:w-5 sm:h-5 md:w-5 md:h-5 flex-shrink-0" />
              <span className="hidden md:inline">Help & Support</span>
            </button>
            <button 
              onClick={async () => { await signOut(); onLogout(); navigate('/'); }}
              className="hidden md:flex w-full items-center gap-2 md:gap-3 px-1 sm:px-2 md:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50/80 hover:text-red-700 rounded-lg transition-all duration-200"
            >
              <LogOut size={20} className="sm:w-5 sm:h-5 md:w-5 md:h-5 flex-shrink-0" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-16 sm:ml-18 md:ml-64">
        {/* Enhanced Top Navbar - Beautiful & Responsive */}
        <header className="bg-black/90 border border-gray-800 px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 fixed top-2 sm:top-3 md:top-4 z-20 shadow-2xl backdrop-blur-md left-20 sm:left-24 md:left-72 right-4 sm:right-6 md:right-8 rounded-2xl sm:rounded-3xl">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between w-full">
            {/* Left: Title */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
              <h1 className="text-2xl font-bold text-white">{activeTab}</h1>
            </div>
            {/* Middle: Expanding search */}
            <div className="relative group flex-1 max-w-2xl mx-8">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition" />
              <input
                type="text"
                placeholder="Search grievances, announcements..."
                className="pl-12 pr-6 py-3.5 w-full bg-white border border-gray-700/40 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 shadow-lg placeholder:text-gray-400"
              />
            </div>
            {/* Right: Icons - Moved to the end for PC screen */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              <button className="p-3.5 text-gray-200 hover:text-white bg-white/5 rounded-2xl border border-gray-700 hover:border-gray-500 transition hover:scale-105">
                <Plus size={20} />
              </button>
              <button className="p-3.5 text-gray-200 hover:text-white bg-white/5 rounded-2xl border border-gray-700 hover:border-gray-500 transition hover:scale-105">
                <Bell size={20} />
              </button>
              <button className="p-3.5 text-gray-200 hover:text-white bg-white/5 rounded-2xl border border-gray-700 hover:border-gray-500 transition hover:scale-105">
                <HelpCircle size={20} />
              </button>
              <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg border border-blue-500/60">
                <User size={20} className="text-white" />
              </div>
            </div>
          </div>

          {/* Mobile Layout - Only Title and Search Bar */}
          <div className="md:hidden flex items-center gap-2 sm:gap-3">
            <div className="w-1 sm:w-1.5 h-4 sm:h-6 bg-blue-500 rounded-full flex-shrink-0"></div>
            <h1 className="text-sm sm:text-base font-bold text-white truncate flex-shrink-0 min-w-0">{activeTab}</h1>
            <div className="relative group flex-1 min-w-0">
              <Search size={14} className="sm:w-4 sm:h-4 absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-7 sm:pl-9 pr-2 sm:pr-3 py-1.5 sm:py-2 bg-white border border-gray-700/40 rounded-lg sm:rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 w-full shadow-sm placeholder:text-gray-400"
              />
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="relative z-10 pt-14 sm:pt-18 md:pt-24 px-2 sm:px-4 md:px-6">
          {renderMainContent()}
        </div>

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
                  <input type="text" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent" placeholder="Short summary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Describe what you think</label>
                  <textarea required rows="5" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-y" placeholder="Your suggestions, issues, or ideas..." />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setIsFeedbackOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Send Feedback</button>
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
                    <p className="text-sm text-gray-600">Help us serve you better</p>
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
                {/* Category Selection */}
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
                    <option value="">Choose a category that best describes your issue</option>
                    {grievanceCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Age and City */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      Your Age *
                    </label>
                    <input
                      type="number"
                      required
                      min="18"
                      max="100"
                      value={grievanceForm.age}
                      onChange={(e) => handleGrievanceFormChange('age', e.target.value)}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-200 bg-gray-50 hover:bg-white"
                      placeholder="Enter your age"
                    />
                  </div>
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
                </div>

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
                    placeholder="Brief title of your grievance"
                  />
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
                    placeholder="Describe your grievance in detail. Include specific information about when, where, and how the issue occurred..."
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

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsGrievanceModalOpen(false)}
                    className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <FileText className="w-5 h-5" />
                    Submit Grievance
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenDashboard;