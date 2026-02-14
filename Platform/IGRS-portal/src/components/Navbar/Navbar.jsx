import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  FolderKanban, 
  BarChart3,
  Menu,
  X
} from 'lucide-react';

const NavItem = ({ icon: Icon, text, path, isActive }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    <Link
      to={path}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
        ${isActive 
          ? 'bg-gray-800 text-white' 
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{text}</span>
    </Link>
  </motion.div>
);

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  const navItems = [
    { icon: LayoutDashboard, text: 'Overview', path: '/' },
    { icon: Calendar, text: 'Calendar', path: '/calendar' },
    { icon: FolderKanban, text: 'Resources', path: '/resources' },
    { icon: BarChart3, text: 'Analytics', path: '/analytics' },
  ];

  return (
    <nav className="bg-black/80 backdrop-blur-md border-b border-gray-800 fixed w-full top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold text-white"
            >
              Officials Portal
            </motion.h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <NavItem
                key={item.path}
                {...item}
                isActive={location.pathname === item.path}
              />
            ))}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800"
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <motion.div
        initial={false}
        animate={{
          height: isMobileMenuOpen ? 'auto' : 0,
          opacity: isMobileMenuOpen ? 1 : 0
        }}
        className="md:hidden overflow-hidden"
      >
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              {...item}
              isActive={location.pathname === item.path}
            />
          ))}
        </div>
      </motion.div>
    </nav>
  );
};

export default Navbar;
