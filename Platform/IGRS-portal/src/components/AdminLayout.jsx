import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { 
  LayoutDashboard, 
  BookOpen,
  LogOut,
  Bell,
  UserCircle,
  Menu,
  X
} from "lucide-react"
import React, { useState } from "react"
import { useAuth } from '../context/AuthContext';

function AdminLayout({ userAuth, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Admin-specific navigation items - Only Dashboard and Knowledge Base
  const navItems = [
    { path: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "knowledge-base", label: "Knowledge Base", icon: BookOpen }
  ];

  const isActive = (path) => {
    return location.pathname.includes(path);
  };

  const handleNavigation = (path) => {
    navigate(`/admin/${path}`);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    if (onLogout) onLogout();
    navigate('/officials-portal/authentication');
  };

  return (
    <div className="min-h-screen flex bg-[#FFF8F0]">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - White with shadow */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-72 bg-white shadow-xl
        flex flex-col h-screen
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-xs text-gray-500">System Management</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <UserCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {userAuth?.full_name || 'Administrator'}
              </p>
              <p className="text-xs text-gray-500 truncate">{userAuth?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl
                transition-all duration-200 font-medium
                ${isActive(item.path)
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-gray-700 hover:bg-gray-100"
                }
              `}
            >
              <item.icon size={20} className="flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 font-medium"
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top Navbar - White */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="lg:hidden w-12" /> {/* Spacer for mobile menu button */}
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {navItems.find(item => isActive(item.path))?.label || 'Dashboard'}
                </h2>
                <p className="text-sm text-gray-500">Welcome back, {userAuth?.full_name?.split(' ')[0]}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              {/* Profile */}
              <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {userAuth?.full_name?.charAt(0) || 'A'}
                  </span>
                </div>
                <span className="hidden md:inline text-sm font-medium text-gray-700">
                  {userAuth?.full_name?.split(' ')[0]}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable page content - Creamy background */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
