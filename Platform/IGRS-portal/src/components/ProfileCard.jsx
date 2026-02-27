import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, Phone, MapPin, Building, Shield, Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const ProfileCard = ({ user = {}, onClose }) => {
  const navigate = useNavigate();
  const [sessionTimeLeft, setSessionTimeLeft] = useState('');
  
  const {
    username = 'Admin',
    role = 'administrator',
    jurisdiction = 'Uttar Pradesh',
    department = 'Administration'
  } = user;

  // Calculate session time remaining
  useEffect(() => {
    const calculateTimeLeft = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setSessionTimeLeft('Session expired');
        return;
      }

      try {
        // Decode JWT to get expiration
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeLeft = expiresAt - now;

        if (timeLeft <= 0) {
          setSessionTimeLeft('Session expired');
          // Auto logout
          handleLogout();
          return;
        }

        // Convert to minutes
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        
        if (minutes > 60) {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          setSessionTimeLeft(`${hours}h ${mins}m`);
        } else if (minutes > 0) {
          setSessionTimeLeft(`${minutes}m ${seconds}s`);
        } else {
          setSessionTimeLeft(`${seconds}s`);
        }
      } catch (error) {
        console.error('Error calculating session time:', error);
        setSessionTimeLeft('Unknown');
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-96 bg-[#2d2d2d] rounded-lg shadow-2xl border border-[#3d3d3d]"
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 text-white/70 hover:text-white transition-colors"
      >
        <X size={20} />
      </button>

      <div className="p-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-3xl font-bold ring-2 ring-white/20 shadow-lg">
            {username?.[0]?.toUpperCase() || 'A'}
          </div>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white">{username}</h3>
          <p className="text-white/70 capitalize">{role?.replace(/_/g, ' ')}</p>
          
          {/* Session Timer */}
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-white/50">
            <Clock size={12} />
            <span>Session: {sessionTimeLeft}</span>
          </div>
        </div>

        <div className="space-y-4">
          {department && (
            <div className="flex items-center gap-3 text-white/90">
              <Building size={18} className="text-white/60" />
              <span>{department} Department</span>
            </div>
          )}
          
          <div className="flex items-center gap-3 text-white/90">
            <Shield size={18} className="text-white/60" />
            <span>Level: {role?.includes('district') ? 'District' : 
                         role?.includes('block') ? 'Block' : 
                         role?.includes('gram') ? 'Gram Panchayat' : 'Department'}</span>
          </div>

          {jurisdiction && (
            <div className="flex items-center gap-3 text-white/90">
              <MapPin size={18} className="text-white/60" />
              <span>{jurisdiction}</span>
            </div>
          )}

          <div className="flex items-center gap-3 text-white/90">
            <Mail size={18} className="text-white/60" />
            <span>{username?.toLowerCase()}@up.gov.in</span>
          </div>

          <div className="flex items-center gap-3 text-white/90">
            <Phone size={18} className="text-white/60" />
            <span>+91 XXXXX XXXXX</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">127</p>
              <p className="text-sm text-white/60">Resolved Cases</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">23</p>
              <p className="text-sm text-white/60">Pending Cases</p>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileCard;
