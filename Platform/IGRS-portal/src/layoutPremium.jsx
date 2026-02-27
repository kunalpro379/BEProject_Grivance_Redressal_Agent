import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { 
  LayoutDashboard, 
  FileText, 
  Map, 
  MessageSquare, 
  Megaphone,
  LogOut,
  Bell,
  UserCircle,
  CheckSquare,
  BarChart3
} from "lucide-react"
import React, { useState } from "react"
import { useAuth } from './hooks/useAuth';

function LayoutPremium({ userRole, onLogout, userAuth, basePath }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const mockUserData = {
    username: userAuth?.username || "Admin",
    role: userRole || "administrator",
    jurisdiction: "Uttar Pradesh",
    department: "Administration"
  };

  const navItems = [
    { path: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "grievances", label: "Grievances", icon: FileText },
    { path: "heatmap", label: "Area Heatmap", icon: Map },
    { path: "chat", label: "Chat", icon: MessageSquare },
    { path: "announcements", label: "Announcements", icon: Megaphone },
    { path: "tasks", label: "Task Management", icon: CheckSquare },
    { path: "feedback", label: "Feedback", icon: BarChart3 }
  ];

  const isActive = (path) => {
    return location.pathname.endsWith(path);
  };

  const handleNavigation = (path) => {
    const pathBase = basePath ?? (userRole === 'admin' ? '/admin' :
                     userRole === 'department_head' ? '/department' :
                     userRole === 'citizen' ? '/citizen' : '/officer');
    navigate(`${pathBase}/${path}`);
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-gradient-to-br from-[#FFF8F0] via-[#FFFBF5] to-[#FFF5E8]">
      {/* Premium Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 bg-gradient-to-b from-[#1a1a1a] to-[#000000] text-white flex flex-col h-screen transition-all duration-300 z-30 shadow-2xl ${
          sidebarExpanded ? 'w-64' : 'w-16 md:w-20'
        }`}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        {/* Logo Section */}
        <div className="p-3 md:p-6 border-b border-white/10">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden shadow-lg ring-2 ring-white/20 flex-shrink-0">
              <img 
                src="/logo.png" 
                alt="IGRS Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            {sidebarExpanded && (
              <div className="overflow-hidden">
                <h1 className="text-sm md:text-lg font-bold text-white whitespace-nowrap">Grievance Portal</h1>
                <p className="text-[10px] md:text-xs text-gray-400 whitespace-nowrap">Government Officials</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 pt-3 md:pt-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="space-y-1 md:space-y-2 px-2 md:px-3">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-2 md:gap-3 py-2 md:py-3 px-2 md:px-3 rounded-lg md:rounded-xl transition-all duration-200 group ${
                  isActive(item.path)
                    ? "bg-gradient-to-r from-[#F5E6D3] to-[#E8D4B8] text-black shadow-lg"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon 
                  size={18} 
                  className={`flex-shrink-0 md:w-[22px] md:h-[22px] ${
                    isActive(item.path) ? "text-black" : "text-gray-400 group-hover:text-white"
                  }`}
                />
                {sidebarExpanded && (
                  <span className={`whitespace-nowrap text-sm md:text-base font-medium ${
                    isActive(item.path) ? "text-black" : ""
                  }`}>
                    {item.label}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-white/10 p-2 md:p-4">
          <button
            onClick={() => {
              (async () => { await signOut(); onLogout(); navigate('/'); })();
            }}
            className="w-full flex items-center gap-2 md:gap-3 py-2 md:py-3 px-2 md:px-3 rounded-lg md:rounded-xl text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut size={18} className="flex-shrink-0 md:w-[22px] md:h-[22px]" />
            {sidebarExpanded && <span className="whitespace-nowrap text-sm md:text-base font-medium">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${
        sidebarExpanded ? 'ml-64' : 'ml-16 md:ml-20'
      }`}>
        {/* Premium Top Navbar */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
          <div className="px-3 py-2 md:py-2">
            <div className="flex items-center justify-between">
              {/* Left: Breadcrumb/Title */}
              <div>
                <h2 className="text-base md:text-xl font-bold text-gray-900">
                  {navItems.find(item => isActive(item.path))?.label || 'Dashboard'}
                </h2>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                  {userAuth?.username || 'Admin'} • {mockUserData.department}
                </p>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                {/* Notifications */}
                <button className="relative p-2 md:p-2.5 hover:bg-gray-100 rounded-lg md:rounded-xl transition-colors">
                  <Bell className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                  <span className="absolute top-1 right-1 md:top-1.5 md:right-1.5 w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Profile */}
                <button 
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-2.5 hover:bg-gray-100 rounded-lg md:rounded-xl transition-colors"
                >
                  <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-gray-800 to-black rounded-lg flex items-center justify-center">
                    <UserCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-sm font-semibold text-gray-900">{userAuth?.username || 'Admin'}</p>
                    <p className="text-xs text-gray-500">{userRole || 'Officer'}</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Dropdown */}
        {showProfile && (
          <>
            <div 
              className="fixed inset-0 z-30"
              onClick={() => setShowProfile(false)}
            />
            <div className="absolute top-16 md:top-20 right-3 md:right-6 z-40 w-64 md:w-72 bg-white rounded-xl md:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-white border-b border-gray-200">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-gray-800 to-black rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                    <UserCircle className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-bold text-gray-900">{mockUserData.username}</h3>
                    <p className="text-xs md:text-sm text-gray-600">{mockUserData.role}</p>
                  </div>
                </div>
              </div>
              <div className="p-3 md:p-4 space-y-2">
                <div className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 rounded-lg md:rounded-xl">
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="text-sm font-semibold text-gray-900">{mockUserData.department}</p>
                </div>
                <div className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 rounded-lg md:rounded-xl">
                  <p className="text-xs text-gray-500">Jurisdiction</p>
                  <p className="text-sm font-semibold text-gray-900">{mockUserData.jurisdiction}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

export default LayoutPremium;
