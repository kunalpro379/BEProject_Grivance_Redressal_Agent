import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, UserCircle } from 'lucide-react';
import ProfileCard from './ProfileCard';
import NotificationPanel from './NotificationPanel';

const TopNavbar = ({ userAuth, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  // Mock notification data
  const notifications = [
    {
      id: 1,
      title: "New grievance assigned",
      message: "Water supply issue in Sector 15",
      time: "2 minutes ago",
      type: "info"
    },
    {
      id: 2,
      title: "Deadline approaching",
      message: "Road repair task due tomorrow",
      time: "1 hour ago",
      type: "warning"
    }
  ];

  return (
    <>
      {/* Top Navbar */}
      <div className="bg-black rounded-lg shadow-lg p-2 sm:p-3 mb-3 sm:mb-4 flex flex-col sm:flex-row justify-between items-center border border-gray-700">
        <div className="flex-1 max-w-xl w-full mb-3 sm:mb-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search grievances, departments, or locations..."
              className="w-full pl-10 pr-4 py-1.5 sm:py-2 border rounded-md bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>
        
        {/* Desktop-only icons - hidden on mobile */}
        <div className="hidden sm:flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="relative"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-6 w-6 text-white" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              2
            </span>
          </motion.button>
          
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setShowProfile(!showProfile)}
          >
            <UserCircle className="h-6 w-6 text-white" />
            <span className="text-white text-sm font-medium">
              {userAuth?.username || 'Admin'}
            </span>
          </motion.div>
        </div>
      </div>

      {/* Profile Card Modal */}
      {showProfile && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowProfile(false);
          }}
        >
          <ProfileCard 
            user={userAuth} 
            onClose={() => setShowProfile(false)} 
          />
        </motion.div>
      )}

      {/* Notification Panel */}
      {showNotifications && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          className="dark:bg-gray-800 dark:text-gray-100"
        />
      )}
    </>
  );
};

export default TopNavbar;
