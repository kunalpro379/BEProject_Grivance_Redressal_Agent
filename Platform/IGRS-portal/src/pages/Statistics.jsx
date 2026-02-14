import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  FileText, 
  MapPin, 
  Calendar,
  Filter,
  ChevronDown,
  Users,
  AlertTriangle,
  Award,
  Target,
  X,
  Eye
} from "lucide-react";
import statisticsData from "../data/statistics.json";

const Statistics = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState("Last 30 Days");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedWard, setSelectedWard] = useState("All Wards");
  const [grievances, setGrievances] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWardModal, setShowWardModal] = useState(false);

  useEffect(() => {
    // Load and process grievance data
    const data = statisticsData.grievances || [];
    setGrievances(data);
    
    // Calculate analytics
    const totalGrievances = data.length;
    const resolvedGrievances = data.filter(g => g.status === "Resolved").length;
    const pendingGrievances = data.filter(g => g.status === "New" || g.status === "In Progress").length;
    const resolutionRate = totalGrievances > 0 ? ((resolvedGrievances / totalGrievances) * 100).toFixed(1) : 0;
    
    // Calculate average resolution time
    const resolvedWithTime = data.filter(g => g.resolutionTimeHours !== null);
    const avgResolutionTime = resolvedWithTime.length > 0 
      ? (resolvedWithTime.reduce((sum, g) => sum + g.resolutionTimeHours, 0) / resolvedWithTime.length).toFixed(1)
      : 0;

    // Category analysis
    const categoryStats = {};
    data.forEach(grievance => {
      const category = grievance.category;
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, resolved: 0, pending: 0 };
      }
      categoryStats[category].total += 1;
      if (grievance.status === "Resolved") {
        categoryStats[category].resolved += 1;
      } else {
        categoryStats[category].pending += 1;
      }
    });

    // Ward analysis
    const wardStats = {};
    data.forEach(grievance => {
      const ward = grievance.ward;
      if (!wardStats[ward]) {
        wardStats[ward] = { total: 0, resolved: 0, pending: 0 };
      }
      wardStats[ward].total += 1;
      if (grievance.status === "Resolved") {
        wardStats[ward].resolved += 1;
      } else {
        wardStats[ward].pending += 1;
      }
    });

    // Status distribution
    const statusStats = {};
    data.forEach(grievance => {
      const status = grievance.status;
      statusStats[status] = (statusStats[status] || 0) + 1;
    });

    setAnalytics({
      totalGrievances,
      resolvedGrievances,
      pendingGrievances,
      resolutionRate,
      avgResolutionTime,
      categoryStats,
      wardStats,
      statusStats
    });
  }, []);

  // KPI Cards Data
  const kpiData = [
    {
      id: 1,
      title: "Total Grievances",
      value: analytics.totalGrievances || 0,
      change: "+12%",
      icon: FileText,
      color: "blue",
      description: "Filed this month"
    },
    {
      id: 2,
      title: "Resolved Cases",
      value: analytics.resolvedGrievances || 0,
      change: "+8%",
      icon: CheckCircle,
      color: "green",
      description: "Successfully resolved"
    },
    {
      id: 3,
      title: "Pending Cases",
      value: analytics.pendingGrievances || 0,
      change: "-5%",
      icon: Clock,
      color: "orange",
      description: "Awaiting resolution"
    },
    {
      id: 4,
      title: "Resolution Rate",
      value: `${analytics.resolutionRate}%`,
      change: "+3%",
      icon: Target,
      color: "purple",
      description: "Success rate"
    },
    {
      id: 5,
      title: "Avg Resolution Time",
      value: `${analytics.avgResolutionTime}h`,
      change: "-15%",
      icon: Award,
      color: "indigo",
      description: "Hours to resolve"
    },
    {
      id: 6,
      title: "Active Wards",
      value: Object.keys(analytics.wardStats || {}).length,
      change: "Stable",
      icon: MapPin,
      color: "teal",
      description: "Wards with complaints"
    }
  ];

  const getColorClass = (color) => {
    const colors = {
      blue: "from-blue-500 to-blue-600",
      green: "from-green-500 to-green-600",
      orange: "from-orange-500 to-orange-600",
      purple: "from-purple-500 to-purple-600",
      indigo: "from-indigo-500 to-indigo-600",
      teal: "from-teal-500 to-teal-600"
    };
    return colors[color] || colors.blue;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Resolved": return "bg-green-100 text-green-800";
      case "In Progress": return "bg-blue-100 text-blue-800";
      case "New": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <main className="flex-1 p-3 md:p-6 relative z-10 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics & Statistics</h2>
          <p className="text-gray-600">Comprehensive overview of grievance data and trends</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
          <select 
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
          >
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Last 3 Months</option>
            <option>Last Year</option>
          </select>
          
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
          >
            <option>All Categories</option>
            {Object.keys(analytics.categoryStats || {}).map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <select 
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
          >
            <option>All Wards</option>
            {Object.keys(analytics.wardStats || {}).map(ward => (
              <option key={ward} value={ward}>{ward}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {kpiData.map((kpi) => (
          <div key={kpi.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 bg-gradient-to-r ${getColorClass(kpi.color)} rounded-lg shadow-lg`}>
                <kpi.icon size={24} className="text-white" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                {kpi.change}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-sm font-medium text-gray-700">{kpi.title}</p>
              <p className="text-xs text-gray-500">{kpi.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Category Analysis - Enhanced Bar Chart */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Grievances by Category</h3>
            <BarChart3 size={20} className="text-gray-400" />
          </div>
          
          {/* Visual Bar Chart - Top 3 Only */}
          <div className="space-y-4 mb-6">
            {Object.entries(analytics.categoryStats || {})
              .sort(([,a], [,b]) => b.total - a.total)
              .slice(0, 3)
              .map(([category, stats], index) => {
                const colors = [
                  'from-blue-500 to-blue-600',
                  'from-green-500 to-green-600',
                  'from-purple-500 to-purple-600'
                ];
                const percentage = (stats.total / analytics.totalGrievances) * 100;
                return (
                  <div key={category} className="space-y-3 p-4 bg-gradient-to-r from-gray-50/80 to-white/80 rounded-xl border border-gray-100/50 hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 truncate flex-1">{category}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-gray-900">{stats.total}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Enhanced Progress Bar */}
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-5 shadow-inner">
                        <div 
                          className={`bg-gradient-to-r ${colors[index]} h-5 rounded-full transition-all duration-1000 ease-out shadow-lg relative overflow-hidden`}
                          style={{ width: `${percentage}%` }}
                        >
                          {/* Shine effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status breakdown */}
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 font-medium flex items-center space-x-1">
                        <CheckCircle size={14} />
                        <span>Resolved: {stats.resolved}</span>
                      </span>
                      <span className="text-orange-600 font-medium flex items-center space-x-1">
                        <Clock size={14} />
                        <span>Pending: {stats.pending}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Show More Button */}
          <button 
            onClick={() => setShowCategoryModal(true)}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <Eye size={16} />
            <span>Show All Categories</span>
          </button>
        </div>

        {/* Ward Analysis - Enhanced with Visual Chart */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Grievances by Ward</h3>
            <MapPin size={20} className="text-gray-400" />
          </div>
          
          
          {/* Top 3 Ward Details */}
          <div className="space-y-3 mb-6">
            {Object.entries(analytics.wardStats || {})
              .sort(([,a], [,b]) => b.total - a.total)
              .slice(0, 3)
              .map(([ward, stats], index) => {
                const percentage = (stats.total / analytics.totalGrievances) * 100;
                const resolvedPercentage = stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0;
                
                return (
                  <div key={ward} className="bg-gradient-to-r from-gray-50/80 to-white/80 rounded-xl p-4 border border-gray-100/50 hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-gray-700">{ward}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-gray-900">{stats.total}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    
                    {/* Dual progress bar for resolved vs pending */}
                    <div className="flex space-x-2 mb-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full transition-all duration-1000"
                          style={{ width: `${resolvedPercentage}%` }}
                        ></div>
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-orange-400 to-red-500 h-3 rounded-full transition-all duration-1000"
                          style={{ width: `${100 - resolvedPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 font-medium flex items-center space-x-1">
                        <CheckCircle size={14} />
                        <span>{stats.resolved} Resolved</span>
                      </span>
                      <span className="text-orange-600 font-medium flex items-center space-x-1">
                        <Clock size={14} />
                        <span>{stats.pending} Pending</span>
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Show More Button */}
          <button 
            onClick={() => setShowWardModal(true)}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <Eye size={16} />
            <span>Show All Wards</span>
          </button>
        </div>
      </div>

      {/* Status Distribution & Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Distribution - Enhanced with Donut Chart */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Status Distribution</h3>
          </div>
          
          
          {/* Status Legend and Details */}
          <div className="space-y-3">
            {Object.entries(analytics.statusStats || {}).map(([status, count]) => {
              const colors = {
                'Resolved': 'bg-green-500',
                'In Progress': 'bg-blue-500', 
                'New': 'bg-red-500'
              };
              const percentage = ((count / analytics.totalGrievances) * 100).toFixed(1);
              
              return (
                <div key={status} className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg hover:bg-gray-100/80 transition-colors duration-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${colors[status]} shadow-sm`}></div>
                    <span className="font-medium text-gray-700">{status}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500">{percentage}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
            <TrendingUp size={20} className="text-gray-400" />
          </div>
          
          <div className="space-y-6">
            {/* Resolution Rate Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Resolution Rate</span>
                <span className="text-lg font-bold text-green-600">{analytics.resolutionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${analytics.resolutionRate}%` }}
                ></div>
              </div>
            </div>

            {/* Average Resolution Time */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-3">
                <Clock size={24} className="text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Average Resolution Time</p>
                  <p className="text-2xl font-bold text-blue-700">{analytics.avgResolutionTime} hours</p>
                </div>
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
              <div className="flex items-center gap-3">
                <TrendingUp size={24} className="text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Monthly Growth</p>
                  <p className="text-2xl font-bold text-purple-700">+12%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trends - Enhanced with Line Chart */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity & Trends</h3>
          <Calendar size={20} className="text-gray-400" />
        </div>
        
        {/* Clean Trend Line Chart */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-semibold text-gray-900">Monthly Grievance Trends</h4>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-green-500 rounded-full"></div>
                <span className="text-gray-700 font-medium">Resolved</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700 font-medium">New</span>
              </div>
            </div>
          </div>
          
          <div className="h-64 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm relative">
            <svg className="w-full h-full" viewBox="0 0 500 140">
              {/* Minimal grid lines - only major ones */}
              {[0, 5, 10, 15, 20].map((value, index) => (
                <g key={value}>
                  <line
                    x1="60"
                    y1={120 - (index * 25)}
                    x2="440"
                    y2={120 - (index * 25)}
                    stroke="#F3F4F6"
                    strokeWidth="1"
                  />
                  <text
                    x="50"
                    y={125 - (index * 25)}
                    textAnchor="end"
                    className="text-sm fill-gray-500 font-medium"
                  >
                    {value}
                  </text>
                </g>
              ))}
              
              {/* Clean trend data */}
              {(() => {
                const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
                const resolvedData = [8, 12, 15, 13, 16, 13];
                const newData = [10, 8, 12, 6, 9, 6];
                const maxValue = 20;
                
                const resolvedPoints = resolvedData.map((value, index) => ({
                  x: 80 + (index / (months.length - 1)) * 320,
                  y: 115 - ((value / maxValue) * 100)
                }));
                
                const newPoints = newData.map((value, index) => ({
                  x: 80 + (index / (months.length - 1)) * 320,
                  y: 115 - ((value / maxValue) * 100)
                }));
                
                return (
                  <>
                    {/* Subtle area fills */}
                    <defs>
                      <linearGradient id="resolvedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.15"/>
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.02"/>
                      </linearGradient>
                      <linearGradient id="newGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15"/>
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Area fills */}
                    <path
                      d={`M ${resolvedPoints[0].x} 115 L ${resolvedPoints.map(p => `${p.x},${p.y}`).join(' ')} L ${resolvedPoints[resolvedPoints.length - 1].x} 115 Z`}
                      fill="url(#resolvedGradient)"
                    />
                    
                    <path
                      d={`M ${newPoints[0].x} 115 L ${newPoints.map(p => `${p.x},${p.y}`).join(' ')} L ${newPoints[newPoints.length - 1].x} 115 Z`}
                      fill="url(#newGradient)"
                    />
                    
                    {/* Clean lines */}
                    <polyline
                      points={resolvedPoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    <polyline
                      points={newPoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Simple data points */}
                    {resolvedPoints.map((point, index) => (
                      <circle
                        key={`resolved-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r="5"
                        fill="#10B981"
                        stroke="white"
                        strokeWidth="2"
                      />
                    ))}
                    
                    {newPoints.map((point, index) => (
                      <circle
                        key={`new-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r="5"
                        fill="#3B82F6"
                        stroke="white"
                        strokeWidth="2"
                      />
                    ))}
                    
                    {/* Clean month labels */}
                    {months.map((month, index) => (
                      <text
                        key={month}
                        x={80 + (index / (months.length - 1)) * 320}
                        y="135"
                        textAnchor="middle"
                        className="text-sm fill-gray-600 font-medium"
                      >
                        {month}
                      </text>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
          
          {/* Simple Summary Stats */}
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div className="bg-green-50 rounded-xl p-6 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Average Resolved</p>
                  <p className="text-3xl font-bold text-green-700 mt-1">12.8</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp size={24} className="text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Average New</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">8.5</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp size={24} className="text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Activity Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 hover:shadow-lg transition-shadow duration-300">
            <div className="text-4xl font-bold text-green-700 mb-3">
              {grievances.filter(g => g.status === 'Resolved').length}
            </div>
            <p className="text-sm text-green-600 font-medium mb-2">Cases Resolved This Month</p>
            <div className="flex items-center justify-center space-x-1">
              <TrendingUp size={14} className="text-green-500" />
              <span className="text-xs text-green-500 font-medium">15% from last month</span>
            </div>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100 hover:shadow-lg transition-shadow duration-300">
            <div className="text-4xl font-bold text-blue-700 mb-3">
              {grievances.filter(g => g.status === 'In Progress').length}
            </div>
            <p className="text-sm text-blue-600 font-medium mb-2">Active Cases</p>
            <div className="flex items-center justify-center space-x-1">
              <Clock size={14} className="text-blue-500" />
              <span className="text-xs text-blue-500 font-medium">Currently processing</span>
            </div>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100 hover:shadow-lg transition-shadow duration-300">
            <div className="text-4xl font-bold text-orange-700 mb-3">
              {grievances.filter(g => g.status === 'New').length}
            </div>
            <p className="text-sm text-orange-600 font-medium mb-2">New Submissions</p>
            <div className="flex items-center justify-center space-x-1">
              <AlertTriangle size={14} className="text-orange-500" />
              <span className="text-xs text-orange-500 font-medium">Awaiting assignment</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200/50 text-center">
        <p className="text-sm text-gray-500">Data updated in real-time • Last updated: {new Date().toLocaleString()}</p>
        <p className="text-sm text-gray-500 mt-1">© 2024 Grievance Redressal System - IGRS Portal</p>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">All Categories</h2>
                <button 
                  onClick={() => setShowCategoryModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(analytics.categoryStats || {})
                  .sort(([,a], [,b]) => b.total - a.total)
                  .map(([category, stats], index) => {
                    const colors = [
                      'from-blue-500 to-blue-600', 'from-green-500 to-green-600', 'from-purple-500 to-purple-600',
                      'from-orange-500 to-orange-600', 'from-red-500 to-red-600', 'from-teal-500 to-teal-600',
                      'from-pink-500 to-pink-600', 'from-indigo-500 to-indigo-600', 'from-yellow-500 to-yellow-600',
                      'from-cyan-500 to-cyan-600'
                    ];
                    const percentage = (stats.total / analytics.totalGrievances) * 100;
                    
                    return (
                      <div key={category} className="bg-gradient-to-r from-gray-50/80 to-white/80 rounded-xl p-6 border border-gray-100/50 hover:shadow-lg transition-all duration-300">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-lg font-semibold text-gray-700">{category}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
                            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-6 mb-4">
                          <div 
                            className={`bg-gradient-to-r ${colors[index % colors.length]} h-6 rounded-full transition-all duration-1000 ease-out shadow-lg relative overflow-hidden`}
                            style={{ width: `${percentage}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-bold text-green-700">{stats.resolved}</div>
                            <div className="text-xs text-green-600">Resolved</div>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <div className="text-lg font-bold text-orange-700">{stats.pending}</div>
                            <div className="text-xs text-orange-600">Pending</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ward Modal */}
      {showWardModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">All Wards</h2>
                <button 
                  onClick={() => setShowWardModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(analytics.wardStats || {})
                  .sort(([,a], [,b]) => b.total - a.total)
                  .map(([ward, stats], index) => {
                    const percentage = (stats.total / analytics.totalGrievances) * 100;
                    const resolvedPercentage = stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0;
                    
                    return (
                      <div key={ward} className="bg-gradient-to-r from-gray-50/80 to-white/80 rounded-xl p-6 border border-gray-100/50 hover:shadow-lg transition-all duration-300">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-lg font-semibold text-gray-700">{ward}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
                            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                              ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-4">
                              <div 
                                className="bg-gradient-to-r from-green-400 to-green-500 h-4 rounded-full transition-all duration-1000"
                                style={{ width: `${resolvedPercentage}%` }}
                              ></div>
                            </div>
                            <div className="flex-1 bg-gray-200 rounded-full h-4">
                              <div 
                                className="bg-gradient-to-r from-orange-400 to-red-500 h-4 rounded-full transition-all duration-1000"
                                style={{ width: `${100 - resolvedPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <div className="text-lg font-bold text-green-700">{stats.resolved}</div>
                              <div className="text-xs text-green-600">Resolved</div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                              <div className="text-lg font-bold text-orange-700">{stats.pending}</div>
                              <div className="text-xs text-orange-600">Pending</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Statistics;
