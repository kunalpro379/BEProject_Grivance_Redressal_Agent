import { Outlet, useNavigate, useLocation, Link } from "react-router-dom"
import { 
  LayoutDashboard, 
  FileText, 
  Map, 
  MessageSquare, 
  Megaphone,
  LogOut,
  MessageCircle,
  Bell,
  UserCircle,
  CheckSquare,
  BarChart3,
  Settings
} from "lucide-react"
import React, { useState } from "react"
import Logo from "./components/Logo"
import ThemeToggle from './components/ThemeToggle'
import { useTheme } from './components/ThemeProvider';
import ProfileCard from './components/ProfileCard';
import TopNavbar from './components/TopNavbar';
import { useAuth } from './hooks/useAuth';
import BackgroundGrid from './components/BackgroundGrid';

function Layout({ userRole, onLogout, userAuth, basePath }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  // Sidebar is icon-only by default and expands on hover (no explicit collapsed state needed)
  const { colors, theme, setTheme } = useTheme();
  const [showProfile, setShowProfile] = useState(false);

  const mockUserData = {
    username: userAuth?.username || "admin",
    role: userRole || "administrator",
    jurisdiction: "Uttar Pradesh",
    department: "Administration"
  };

  // Update the navigation items paths with proper icons
  const navItems = [
    { path: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "grievances", label: "Grievances", icon: FileText },
    { path: "heatmap", label: "Area Heatmap", icon: Map },
    { path: "chat", label: "Chat", icon: MessageSquare },
    { path: "announcements", label: "Announcements", icon: Megaphone },
    { path: "tasks", label: "Task Management", icon: CheckSquare },
    { path: "feedback", label: "Feedback", icon: BarChart3 }
  ];

  // Update isActive to handle path matching correctly
  const isActive = (path) => {
    return location.pathname.endsWith(path);
  };

  // Update navigation handler
  const handleNavigation = (path) => {
    // Use explicit basePath (e.g. /government/:id) or determine from user role
    const pathBase = basePath ?? (userRole === 'admin' ? '/admin' :
                     userRole === 'department_head' ? '/department' :
                     userRole === 'citizen' ? '/citizen' : '/officer');
    navigate(`${pathBase}/${path}`);
  };

  return (
    <div className="min-h-screen transition-colors duration-300 flex overflow-hidden relative bg-transparent">
      <BackgroundGrid />
      {/* Fixed Left Sidebar - Full Height - Responsive */}
      <div className="fixed inset-y-0 left-0 w-20 lg:w-64 bg-white border-r border-gray-200 flex flex-col h-screen transition-all duration-300 z-20">
        {/* Logo section */}
        <div className="p-2 lg:p-4 border-b border-gray-200 flex items-center justify-center lg:justify-start">
          <div className="flex items-center justify-center lg:justify-start gap-3 w-full">
            <img src="/logo.png" alt="MyGov Grievance" className="h-8 w-8 lg:h-10 lg:w-10 rounded-md object-cover" />
            <div className="hidden lg:block">
              <Logo />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 pt-4 overflow-y-auto no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center justify-center lg:justify-start py-2 lg:py-3 px-2 lg:px-4 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors rounded-lg mx-1 lg:mx-2 ${
                isActive(item.path) 
                  ? "bg-indigo-50 text-gray-900 ring-1 ring-indigo-100" 
                  : ""
              }`}
            >
              <item.icon size={20} className="flex-shrink-0" />
              <span className="ml-3 whitespace-nowrap hidden lg:inline">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Control buttons */}
        <div className="border-t border-gray-200 p-2 lg:p-4 space-y-2">
          {/* Mobile-only notification and profile icons */}
          <div className="flex flex-col items-center justify-center lg:hidden gap-2 mb-3">
            <button
              onClick={() => {
                // Handle notifications - you can add state management here
                console.log('Notifications clicked');
              }}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-md flex-shrink-0"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                2
              </span>
            </button>
            
            <button
              onClick={() => {
                // Handle profile - you can add state management here
                console.log('Profile clicked');
              }}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md flex-shrink-0"
            >
              <UserCircle className="h-5 w-5" />
            </button>
          </div>
          
          <button
            onClick={() => {
              (async () => { await signOut(); onLogout(); navigate('/'); })();
            }}
            className="w-full flex items-center justify-center lg:justify-start gap-2 text-red-600 hover:bg-red-50 p-2 rounded-md mx-1 lg:mx-2"
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span className="whitespace-nowrap hidden lg:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col ml-20 lg:ml-64 h-screen overflow-hidden relative z-10">
        {/* Top Navbar - sticky */}
        <div className="sticky top-0 z-30 bg-gray-100/90 backdrop-blur supports-[backdrop-filter]:bg-gray-100/60 border-b border-gray-200">
          <div className="p-3 lg:p-4">
            <TopNavbar userAuth={userAuth} />
          </div>
        </div>

        {/* Profile Card Modal */}
        {showProfile && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowProfile(false)}
            />
            {/* Centered Profile Card */}
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
              <ProfileCard
                user={mockUserData}
                onClose={() => setShowProfile(false)}
              />
            </div>
          </>
        )}

        {/* Scrollable page content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Layout;

