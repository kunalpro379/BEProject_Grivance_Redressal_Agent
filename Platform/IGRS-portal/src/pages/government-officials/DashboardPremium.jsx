import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronRight, BarChart2, Users2, Clock, FileText, 
  CheckCircle, AlertTriangle, TrendingUp, Award,
  Bell, Activity, Zap,
  Timer, ThumbsUp, UserCheck, BarChart3,
  ClipboardList, Star, PieChart, Mail, Phone, Building
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import departmentDashboardService from '../../services/departmentDashboard.service';

const DashboardPremium = ({ userAuth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [liveStats, setLiveStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);

  const getBasePath = () => {
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'government' && pathParts[2]) {
      return `/government/${pathParts[2]}`;
    }
    return '/officer';
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const userId = userAuth?.id;
        
        if (userId && token) {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            setProfileData(data.user);
          }
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };

    fetchProfile();

    const departmentId = userAuth?.department_id;
    const token = localStorage.getItem('accessToken');
    if (!departmentId || !token) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    departmentDashboardService.getStats(departmentId, token)
      .then((stats) => {
        setLiveStats(stats);
        setLoading(false);
      })
      .catch(() => {
        setLiveStats(null);
        setLoading(false);
      });
  }, [userAuth?.department_id, userAuth?.id]);

  const features = [
    {
      title: "Real-time Monitoring",
      description: "Track grievances and their resolution status in real-time",
      icon: Clock,
      path: "grievances",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop"
    },
    {
      title: "Analytics Dashboard",
      description: "Comprehensive analytics to make informed decisions",
      icon: BarChart2,
      path: "heatmap",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop"
    },
    {
      title: "Department Coordination",
      description: "Seamless coordination between different departments",
      icon: Users2,
      path: "chat",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=300&fit=crop"
    },
    {
      title: "Task Management",
      description: "Organize and prioritize your daily tasks efficiently",
      icon: ClipboardList,
      path: "tasks",
      image: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=300&fit=crop"
    },
    {
      title: "Performance Reports",
      description: "Generate detailed performance and progress reports",
      icon: PieChart,
      path: "reports",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop"
    },
    {
      title: "Citizen Feedback",
      description: "View and respond to citizen feedback and ratings",
      icon: Star,
      path: "feedback",
      image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=300&fit=crop"
    },
  ];

  const totalGrievances = liveStats?.total || 0;
  const pendingGrievances = liveStats?.pending || 0;
  const resolvedGrievances = liveStats?.resolved || 0;
  const criticalGrievances = liveStats?.overdue || 0;
  const inProgressGrievances = liveStats?.in_progress || 0;
  const resolutionRate = totalGrievances > 0 ? Math.round((resolvedGrievances / totalGrievances) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF5E8]">
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF37] to-[#C5A028] rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {(profileData?.full_name || userAuth?.full_name || 'O')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-black mb-2">
                Welcome back, {profileData?.full_name || userAuth?.full_name || 'Officer'}
              </h1>
              <p className="text-gray-600 text-lg mb-3">Government Officer Portal</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {profileData?.email && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4 text-[#D4AF37]" />
                    <span>{profileData.email}</span>
                  </div>
                )}
                {profileData?.phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-[#D4AF37]" />
                    <span>{profileData.phone}</span>
                  </div>
                )}
                {(profileData?.department_name || userAuth?.department_name) && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Building className="w-4 h-4 text-[#D4AF37]" />
                    <span>{profileData?.department_name || userAuth?.department_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards - Only Golden/Cream/Black/White */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-lg border-2 border-black hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center shadow-md">
                <FileText className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <span className="text-xs font-bold text-black bg-[#FFF8F0] px-3 py-1.5 rounded-full border-2 border-[#D4AF37]">
                TOTAL
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Total Grievances</h3>
            <p className="text-4xl font-bold text-black mb-2">{totalGrievances}</p>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-gray-700 font-semibold">Active this month</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37] hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#D4AF37] to-[#C5A028] rounded-xl flex items-center justify-center shadow-md">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-bold text-[#C5A028] bg-white px-3 py-1.5 rounded-full border-2 border-[#D4AF37]">
                PENDING
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Pending Cases</h3>
            <p className="text-4xl font-bold text-black mb-2">{pendingGrievances}</p>
            <div className="flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-gray-700 font-semibold">{inProgressGrievances} in progress</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-lg border-2 border-black hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center shadow-md">
                <CheckCircle className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <span className="text-xs font-bold text-black bg-[#FFF8F0] px-3 py-1.5 rounded-full border-2 border-[#D4AF37]">
                RESOLVED
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Resolved Cases</h3>
            <p className="text-4xl font-bold text-black mb-2">{resolvedGrievances}</p>
            <div className="flex items-center gap-2 text-sm">
              <Award className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-gray-700 font-semibold">{resolutionRate}% completion</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-2xl p-6 shadow-lg border-2 border-black hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center shadow-md">
                <AlertTriangle className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <span className="text-xs font-bold text-black bg-white px-3 py-1.5 rounded-full border-2 border-black">
                CRITICAL
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Critical Cases</h3>
            <p className="text-4xl font-bold text-black mb-2">{criticalGrievances}</p>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-black" />
              <span className="text-gray-700 font-semibold">Immediate action</span>
            </div>
          </motion.div>
        </div>

        {/* Today's Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37] mb-8"
        >
          <h3 className="text-2xl font-bold text-black mb-6">Today's Activity</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-black to-gray-900 rounded-xl shadow-md">
              <div className="w-14 h-14 bg-[#D4AF37] rounded-xl flex items-center justify-center shadow-md">
                <FileText className="w-7 h-7 text-black" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">12</p>
                <p className="text-sm text-gray-300">New cases registered</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-[#D4AF37] to-[#C5A028] rounded-xl shadow-md">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-md">
                <Bell className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">5</p>
                <p className="text-sm text-white/90">Cases need attention</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-xl border-2 border-[#D4AF37] shadow-md">
              <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center shadow-md">
                <CheckCircle className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-black">8</p>
                <p className="text-sm text-gray-700">Cases resolved</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => navigate(`${getBasePath()}/grievances`)}
            className="mt-6 w-full py-4 bg-gradient-to-r from-black to-gray-900 text-white rounded-xl font-bold hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 border-2 border-[#D4AF37]"
          >
            View All Activity
            <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Features with Images */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-black mb-6">Officer Portal Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                onClick={() => navigate(`${getBasePath()}/${feature.path}`)}
                className="bg-white rounded-2xl overflow-hidden shadow-lg border-2 border-[#D4AF37] hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer group"
              >
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 w-12 h-12 bg-[#D4AF37] rounded-xl flex items-center justify-center shadow-lg">
                    <feature.icon className="w-6 h-6 text-black" />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-black mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{feature.description}</p>
                  <div className="flex items-center text-[#D4AF37] font-bold text-sm group-hover:gap-2 transition-all">
                    Learn more
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="bg-gradient-to-br from-black to-gray-900 rounded-2xl p-8 shadow-lg border-2 border-[#D4AF37] mb-8"
        >
          <h2 className="text-3xl font-bold text-white mb-6">Performance Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#D4AF37]/30">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#D4AF37] rounded-lg flex items-center justify-center">
                  <Timer className="w-6 h-6 text-black" />
                </div>
                <span className="text-[#D4AF37] text-sm font-bold">↓ 12%</span>
              </div>
              <p className="text-sm text-gray-300 mb-1">Avg. Resolution Time</p>
              <p className="text-3xl font-bold text-white">2.5 days</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#D4AF37]/30">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#D4AF37] rounded-lg flex items-center justify-center">
                  <ThumbsUp className="w-6 h-6 text-black" />
                </div>
                <span className="text-[#D4AF37] text-sm font-bold">↑ 8%</span>
              </div>
              <p className="text-sm text-gray-300 mb-1">Citizen Satisfaction</p>
              <p className="text-3xl font-bold text-white">4.8/5</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#D4AF37]/30">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#D4AF37] rounded-lg flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-black" />
                </div>
                <span className="text-[#D4AF37] text-sm font-bold">↑ 3%</span>
              </div>
              <p className="text-sm text-gray-300 mb-1">Response Rate</p>
              <p className="text-3xl font-bold text-white">98.5%</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#D4AF37]/30">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#D4AF37] rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-black" />
                </div>
                <span className="text-gray-400 text-sm font-bold">—</span>
              </div>
              <p className="text-sm text-gray-300 mb-1">Cases This Week</p>
              <p className="text-3xl font-bold text-white">47</p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default DashboardPremium;
