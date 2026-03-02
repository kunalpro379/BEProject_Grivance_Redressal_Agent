import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronRight, BarChart2, Users2, Clock, 
  CheckCircle, CheckCircle2, AlertTriangle, TrendingUp,
  Activity, MapPin, BarChart3,
  ClipboardList, Star, PieChart, Building
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';

const DashboardPremium = ({ userAuth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState(null);
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
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch role-based dashboard data
        const response = await api.get('/dashboard/role-dashboard');
        setDashboardData(response.data);
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [userAuth?.id]);

  const features = [
    {
      title: "Real-time Monitoring",
      description: "Track grievances and their resolution status in real-time",
      icon: Clock,
      path: "heatmap",
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

  // Get data from API
  const apiKpis = dashboardData?.dashboard?.kpis;
  const wardPerformance = dashboardData?.dashboard?.wardPerformance || [];
  const departmentPerformance = dashboardData?.dashboard?.departmentPerformance || [];
  const highPriorityIssues = dashboardData?.dashboard?.highPriorityIssues || [];
  
  const kpis = [
    { label: 'Active Complaints', value: apiKpis?.active_complaints || '0', icon: AlertTriangle, color: 'black', trend: '+5%' },
    { label: 'Resolved This Month', value: apiKpis?.resolved_this_month || '0', icon: CheckCircle, color: 'golden', trend: '+12%' },
    { label: 'Overdue', value: apiKpis?.overdue || '0', icon: Clock, color: 'cream', trend: '-3%' },
    { label: 'Avg Resolution Time', value: `${apiKpis?.avg_resolution_time || '0'} days`, icon: Activity, color: 'white', trend: '-8%' },
    { label: 'Critical Issues', value: apiKpis?.critical_issues || '0', icon: TrendingUp, color: 'black', trend: '+2%' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF5E8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#D4AF37] mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

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
                Welcome back, {dashboardData?.user?.name || userAuth?.full_name || 'Officer'}
              </h1>
              <p className="text-gray-600 text-lg mb-3">Government Officer Portal</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {dashboardData?.user?.designation && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Building className="w-4 h-4 text-[#D4AF37]" />
                    <span>{dashboardData.user.designation}</span>
                  </div>
                )}
                {dashboardData?.user?.department && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Building className="w-4 h-4 text-[#D4AF37]" />
                    <span>{dashboardData.user.department}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* City-Wide KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {kpis.map((kpi, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-2xl p-6 shadow-lg border-2 hover:shadow-2xl transition-all duration-300 ${
                kpi.color === 'black' ? 'bg-black text-white border-black' :
                kpi.color === 'golden' ? 'bg-gradient-to-br from-[#D4AF37] to-[#C5A028] text-white border-[#D4AF37]' :
                kpi.color === 'cream' ? 'bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] text-black border-[#D4AF37]' :
                'bg-white text-black border-black'
              }`}
            >
              <kpi.icon className={`w-8 h-8 mb-3 ${
                kpi.color === 'black' || kpi.color === 'golden' ? 'text-white' : 'text-[#D4AF37]'
              }`} />
              <p className={`text-3xl font-bold mb-1 ${
                kpi.color === 'black' || kpi.color === 'golden' ? 'text-white' : 'text-black'
              }`}>
                {kpi.value}
              </p>
              <p className={`text-sm mb-2 ${
                kpi.color === 'black' || kpi.color === 'golden' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {kpi.label}
              </p>
              <p className={`text-xs font-bold ${
                kpi.trend.startsWith('+') ? 'text-green-400' : 'text-red-400'
              }`}>
                {kpi.trend} vs last month
              </p>
            </motion.div>
          ))}
        </div>

        {/* Ward Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <h3 className="text-2xl font-bold text-black mb-6 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[#D4AF37]" />
            Ward Performance
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wardPerformance.length > 0 ? wardPerformance.map((ward, index) => {
              const resolutionRate = ward.total_grievances > 0 
                ? Math.round((ward.resolved / ward.total_grievances) * 100) 
                : 0;
              
              const getPerformanceBadge = () => {
                if (ward.total_grievances === 0) return { label: 'No Data', color: 'bg-gray-100 text-gray-700' };
                if (resolutionRate >= 70) return { label: 'Excellent', color: 'bg-green-100 text-green-700' };
                if (resolutionRate >= 50) return { label: 'Good', color: 'bg-yellow-100 text-yellow-700' };
                return { label: 'Needs Attention', color: 'bg-red-100 text-red-700' };
              };
              
              const performanceBadge = getPerformanceBadge();
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-[#D4AF37] hover:-translate-y-1"
                >
                  <div className="bg-gradient-to-r from-black to-gray-900 p-6 text-white">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#D4AF37] rounded-lg">
                          <MapPin className="w-6 h-6 text-black" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{ward.ward_name || `Ward ${ward.ward_number}`}</h3>
                          <p className="text-gray-300 text-sm">Ward #{ward.ward_number || 'N/A'}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${performanceBadge.color}`}>
                        {performanceBadge.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{ward.total_grievances}</span>
                      <span className="text-gray-300">Total Grievances</span>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-[#FFF8F0] to-white">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-[#D4AF37] shadow-sm">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold text-black">{ward.resolved}</p>
                          <p className="text-xs text-gray-600">Resolved</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-[#D4AF37] shadow-sm">
                        <Clock className="w-8 h-8 text-yellow-600" />
                        <div>
                          <p className="text-2xl font-bold text-black">{ward.total_grievances - ward.resolved}</p>
                          <p className="text-xs text-gray-600">Pending</p>
                        </div>
                      </div>

                      {ward.overdue > 0 && (
                        <div className="col-span-2 flex items-center gap-3 p-3 bg-red-50 rounded-lg border-2 border-red-300 shadow-sm">
                          <AlertTriangle className="w-8 h-8 text-red-600" />
                          <div>
                            <p className="text-2xl font-bold text-red-700">{ward.overdue}</p>
                            <p className="text-xs text-red-600">Overdue Cases</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-black">Resolution Rate</span>
                        <span className={`text-sm font-bold ${
                          resolutionRate >= 70 ? 'text-green-600' :
                          resolutionRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {resolutionRate}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 border border-gray-300">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            resolutionRate >= 70 ? 'bg-green-600' :
                            resolutionRate >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${resolutionRate}%` }}
                        />
                      </div>
                    </div>

                    {ward.avg_resolution_time && (
                      <div className="p-3 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-lg border border-[#D4AF37]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Avg Resolution Time</span>
                          <span className="text-lg font-bold text-black">{ward.avg_resolution_time} days</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            }) : (
              <div className="col-span-3 text-center py-12 bg-white rounded-xl shadow-lg border-2 border-[#D4AF37]">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-black mb-2">No Ward Data Available</h3>
                <p className="text-gray-600">There are no ward performance metrics to display at this time.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Department Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl p-6 shadow-lg border-2 border-black mb-8"
        >
          <h3 className="text-2xl font-bold text-black mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#D4AF37]" />
            Department Performance
          </h3>
          <div className="space-y-4">
            {departmentPerformance.length > 0 ? departmentPerformance.map((dept, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-black">{dept.department}</h4>
                  <span className="px-3 py-1 bg-[#D4AF37] text-white rounded-full text-sm font-bold">
                    Score: {dept.performance_score || 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total</p>
                    <p className="font-bold text-black">{dept.total_grievances}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Resolved</p>
                    <p className="font-bold text-green-600">{dept.resolved}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Avg Time</p>
                    <p className="font-bold text-blue-600">{dept.avg_resolution_time || 'N/A'} days</p>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-4">No department data available</p>
            )}
          </div>
        </motion.div>

        {/* High Priority Issues */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37] mb-8"
        >
          <h3 className="text-2xl font-bold text-black mb-6 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            High Priority Issues
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {highPriorityIssues.length > 0 ? highPriorityIssues.map((issue, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + index * 0.05 }}
                className="p-4 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-lg border-2 border-[#D4AF37] hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="font-bold text-sm text-black">{issue.grievance_id}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    issue.priority === 'critical' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                  }`}>
                    {issue.priority?.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-3 line-clamp-2">{issue.title}</p>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <MapPin className="w-3 h-3 text-[#D4AF37]" />
                  <span>{issue.ward_name || issue.location}</span>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-3 text-center py-8">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No high priority issues at this time</p>
              </div>
            )}
          </div>
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


      </main>
    </div>
  );
};

export default DashboardPremium;
