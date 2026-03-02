import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Bell, User, Settings, LogOut, 
  ChevronDown, Shield, Mail, Phone, MapPin,
  Activity, Clock, AlertCircle
} from 'lucide-react';

const PremiumHeader = ({ userAuth, onLogout, title = "Water Supply Department Dashboard" }) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentLocation, setDepartmentLocation] = useState('Loading...');
  const [officerDetails, setOfficerDetails] = useState(null);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  // Fetch officer details (zone and specialization) from database
  useEffect(() => {
    const fetchOfficerDetails = async () => {
      try {
        if (userAuth?.id) {
          console.log('[PremiumHeader] Fetching officer details for user ID:', userAuth.id);
          const response = await fetch(`/api/departments/officer/${userAuth.id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
          });
          
          console.log('[PremiumHeader] Response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('[PremiumHeader] Officer data:', data);
            setOfficerDetails(data.officer);
            // Set location to zone if available, otherwise fallback
            setDepartmentLocation(data.officer?.zone || userAuth?.city || 'Location not set');
          } else {
            console.warn('[PremiumHeader] Response not OK, using fallback');
            setDepartmentLocation(userAuth?.city || 'Location not set');
          }
        } else {
          console.log('[PremiumHeader] No user ID, using fallback');
          setDepartmentLocation(userAuth?.city || 'Location not set');
        }
      } catch (error) {
        console.error('Error fetching officer details:', error);
        setDepartmentLocation(userAuth?.city || 'Location not set');
      }
    };

    fetchOfficerDetails();
  }, [userAuth]);

  // Mock notifications
  const notifications = [
    {
      id: 1,
      type: 'urgent',
      title: 'Emergency Grievance',
      message: 'GRV-DEP-GEN-7BF6-1771618033511-002',
      time: '2 mins ago',
      icon: AlertCircle,
      color: 'red'
    },
    {
      id: 2,
      type: 'info',
      title: 'New Assignment',
      message: 'Water Quality - Zone 3, Ward D',
      time: '15 mins ago',
      icon: Activity,
      color: 'blue'
    },
    {
      id: 3,
      type: 'reminder',
      title: 'Deadline Approaching',
      message: 'Pipeline Leakage - Due in 2 hours',
      time: '1 hour ago',
      icon: Clock,
      color: 'yellow'
    }
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => n.type === 'urgent').length;

  return (
    <div className="bg-gradient-to-r from-[#1a1a1a] via-[#000000] to-[#1a1a1a] border-b-2 border-[#F5E6D3] shadow-xl sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8 py-2">
        {/* Top Row - Logo, Title, and Actions */}
        <div className="flex items-center justify-between gap-3">
          {/* Left Section - Logo and Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden shadow-lg ring-2 ring-[#F5E6D3] hover:ring-[#E8D4B8] transition-all duration-300">
                <img 
                  src="/logo.png" 
                  alt="Department Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Title and Subtitle */}
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-base lg:text-lg font-bold text-white truncate flex items-center gap-2">
                {title}
              </h1>
              <p className="text-xs text-[#F5E6D3] flex items-center gap-1.5 mt-0.5">
                <Shield className="w-3 h-3" />
                <span className="truncate">Department Officer</span>
                <span className="hidden sm:inline">•</span>
                <MapPin className="w-3 h-3 hidden sm:inline" />
                <span className="hidden sm:inline truncate">{departmentLocation}</span>
              </p>
            </div>
          </div>

          {/* Right Section - Search, Notifications, Profile */}
          <div className="flex items-center gap-2">
            {/* Search Bar - Hidden on mobile */}
            <div className="hidden lg:block">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-[#F5E6D3] w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 xl:w-56 pl-8 pr-3 py-1.5 text-sm bg-white/10 border border-[#F5E6D3]/30 rounded-lg text-white placeholder-[#F5E6D3]/60 focus:outline-none focus:border-[#F5E6D3] focus:bg-white/15 transition-all duration-300"
                />
              </div>
            </div>

            {/* Mobile Search Icon */}
            <button className="lg:hidden p-2 bg-white/10 hover:bg-white/20 rounded-lg border border-[#F5E6D3]/30 transition-all duration-300">
              <Search className="w-4 h-4 text-[#F5E6D3]" />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 bg-white/10 hover:bg-white/20 rounded-lg border border-[#F5E6D3]/30 transition-all duration-300 group"
              >
                <Bell className="w-4 h-4 text-[#F5E6D3] group-hover:animate-pulse" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center border border-black animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border-2 border-[#F5E6D3] z-50 overflow-hidden"
                  >
                    <div className="bg-gradient-to-r from-[#1a1a1a] to-[#000000] px-3 py-2 border-b border-[#F5E6D3]">
                      <h3 className="text-white font-bold text-sm">Notifications</h3>
                      <p className="text-[#F5E6D3] text-xs mt-0.5">{unreadCount} urgent alerts</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.map((notification) => (
                        <motion.div
                          key={notification.id}
                          whileHover={{ backgroundColor: '#FFF8F0' }}
                          className="px-3 py-2 border-b border-gray-200 cursor-pointer transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              notification.color === 'red' ? 'bg-red-100' :
                              notification.color === 'blue' ? 'bg-blue-100' :
                              'bg-yellow-100'
                            }`}>
                              <notification.icon className={`w-4 h-4 ${
                                notification.color === 'red' ? 'text-red-600' :
                                notification.color === 'blue' ? 'text-blue-600' :
                                'text-yellow-600'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-900">{notification.title}</p>
                              <p className="text-xs text-gray-600 mt-0.5 truncate">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{notification.time}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                      <button className="w-full text-center text-xs font-semibold text-gray-900 hover:text-black transition-colors">
                        View All Notifications
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-white/10 hover:bg-white/20 rounded-lg border border-[#F5E6D3]/30 transition-all duration-300 group"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#F5E6D3] to-[#E8D4B8] flex items-center justify-center font-bold text-gray-900 text-xs ring-2 ring-white/20">
                  {userAuth?.full_name?.charAt(0) || userAuth?.username?.charAt(0) || 'O'}
                </div>
                <span className="hidden sm:block text-white font-semibold text-xs truncate max-w-24">
                  {userAuth?.full_name || userAuth?.username || 'Officer'}
                </span>
                <ChevronDown className={`hidden sm:block w-3 h-3 text-[#F5E6D3] transition-transform duration-300 ${showProfileDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-xl shadow-2xl border-2 border-[#F5E6D3] z-50 overflow-hidden"
                  >
                    {/* Profile Header */}
                    <div className="bg-gradient-to-r from-[#1a1a1a] to-[#000000] px-4 py-3 border-b border-[#F5E6D3]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F5E6D3] to-[#E8D4B8] flex items-center justify-center font-bold text-gray-900 text-lg ring-2 ring-white/20">
                          {userAuth?.full_name?.charAt(0) || userAuth?.username?.charAt(0) || 'O'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-bold text-sm truncate">
                            {userAuth?.full_name || userAuth?.username || 'Officer'}
                          </h3>
                          <p className="text-[#F5E6D3] text-xs truncate">
                            {userAuth?.department_name || 'Department Officer'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Profile Details */}
                    <div className="px-4 py-3 bg-gradient-to-b from-[#FFF8F0] to-white">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <Mail className="w-3 h-3 text-gray-600" />
                          <span className="text-gray-700 truncate">{userAuth?.email || 'officer@department.gov'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Phone className="w-3 h-3 text-gray-600" />
                          <span className="text-gray-700">{userAuth?.phone || '+91 XXXXXXXXXX'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="w-3 h-3 text-gray-600" />
                          <span className="text-gray-700 truncate">{departmentLocation}</span>
                        </div>
                        {officerDetails?.specialization && (
                          <div className="flex items-center gap-2 text-xs">
                            <Shield className="w-3 h-3 text-gray-600" />
                            <span className="text-gray-700 truncate">{officerDetails.specialization}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Profile Actions */}
                    <div className="px-3 py-2 bg-white border-t border-gray-200">
                      <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FFF8F0] transition-colors group">
                        <User className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
                        <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900">View Profile</span>
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FFF8F0] transition-colors group">
                        <Settings className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
                        <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900">Settings</span>
                      </button>
                      <button 
                        onClick={onLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors group mt-1 border-t border-gray-200"
                      >
                        <LogOut className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-semibold text-red-600">Logout</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumHeader;
