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
import statisticsData from "../../data/statistics.json";

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
      color: "gold",
      description: "Filed this month"
    },
    {
      id: 2,
      title: "Resolved Cases",
      value: analytics.resolvedGrievances || 0,
      change: "+8%",
      icon: CheckCircle,
      color: "gold",
      description: "Successfully resolved"
    },
    {
      id: 3,
      title: "Pending Cases",
      value: analytics.pendingGrievances || 0,
      change: "-5%",
      icon: Clock,
      color: "amber",
      description: "Awaiting resolution"
    },
    {
      id: 4,
      title: "Resolution Rate",
      value: `${analytics.resolutionRate}%`,
      change: "+3%",
      icon: Target,
      color: "amber",
      description: "Success rate"
    },
    {
      id: 5,
      title: "Avg Resolution Time",
      value: `${analytics.avgResolutionTime}h`,
      change: "-15%",
      icon: Award,
      color: "gold",
      description: "Hours to resolve"
    },
    {
      id: 6,
      title: "Active Wards",
      value: Object.keys(analytics.wardStats || {}).length,
      change: "Stable",
      icon: MapPin,
      color: "amber",
      description: "Wards with complaints"
    }
  ];

  const getColorClass = () => "bg-[var(--dark)]";
  const getStatusColor = (status) => {
    switch (status) {
      case "Resolved": return "bg-[var(--gold-bg)] text-[var(--gold)]";
      case "In Progress": return "bg-[var(--cream-200)] text-[var(--stats-muted)]";
      case "New": return "bg-[var(--cream-200)] text-[var(--stats-muted)]";
      default: return "bg-[var(--brown-100)] text-[var(--stats-text)]";
    }
  };

  return (
    <main className="flex-1 p-3 md:p-6 relative z-10 overflow-y-auto min-h-full" style={{ background: "var(--stats-bg)" }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--stats-text)] mb-2">Analytics & Statistics</h2>
          <p className="text-[var(--stats-muted)]">Comprehensive overview of grievance data and trends</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
          <select 
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2 bg-white border border-[var(--stats-border)] rounded-xl text-sm text-[var(--stats-text)] focus:ring-2 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
          >
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Last 3 Months</option>
            <option>Last Year</option>
          </select>
          
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-white border border-[var(--stats-border)] rounded-xl text-sm text-[var(--stats-text)] focus:ring-2 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
          >
            <option>All Categories</option>
            {Object.keys(analytics.categoryStats || {}).map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <select 
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="px-4 py-2 bg-white border border-[var(--stats-border)] rounded-xl text-sm text-[var(--stats-text)] focus:ring-2 focus:ring-[var(--gold)] focus:border-[var(--gold)]"
          >
            <option>All Wards</option>
            {Object.keys(analytics.wardStats || {}).map(ward => (
              <option key={ward} value={ward}>{ward}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards - black golden dark white cream */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {kpiData.map((kpi) => (
          <div key={kpi.id} className="bg-white rounded-xl p-6 shadow-md border border-[var(--stats-border)] hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 bg-gradient-to-r ${getColorClass()} rounded-lg shadow-md`}>
                <kpi.icon size={24} className="text-white" />
              </div>
              <span className="text-xs font-medium text-[var(--gold)] bg-[var(--gold-bg)] px-2 py-1 rounded-full">
                {kpi.change}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-[var(--stats-text)]">{kpi.value}</p>
              <p className="text-sm font-medium text-[var(--stats-muted)]">{kpi.title}</p>
              <p className="text-xs text-[var(--stats-muted)]">{kpi.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section - premium */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md border border-[var(--stats-border)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--stats-text)]">Grievances by Category</h3>
            <BarChart3 size={20} className="text-[var(--stats-muted)]" />
          </div>
          <div className="space-y-4 mb-6">
            {Object.entries(analytics.categoryStats || {})
              .sort(([,a], [,b]) => b.total - a.total)
              .slice(0, 3)
              .map(([category, stats], index) => {
                const shades = ['from-amber-600 to-amber-700', 'from-amber-500 to-amber-600', 'from-yellow-500 to-amber-500'];
                const percentage = (stats.total / analytics.totalGrievances) * 100;
                return (
                  <div key={category} className="space-y-3 p-4 bg-[var(--cream-50)] rounded-xl border border-[var(--stats-border)] hover:shadow-md transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[var(--stats-text)] truncate flex-1">{category}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-[var(--stats-text)]">{stats.total}</span>
                        <span className="text-xs text-[var(--stats-muted)] bg-white px-2 py-1 rounded-full border border-[var(--stats-border)]">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-[var(--brown-100)] rounded-full h-5">
                        <div className={`bg-gradient-to-r ${shades[index]} h-5 rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--gold)] font-medium flex items-center space-x-1">
                        <CheckCircle size={14} />
                        <span>Resolved: {stats.resolved}</span>
                      </span>
                      <span className="text-[var(--stats-muted)] font-medium flex items-center space-x-1">
                        <Clock size={14} />
                        <span>Pending: {stats.pending}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
          <button onClick={() => setShowCategoryModal(true)} className="w-full py-3 bg-[var(--dark)] hover:bg-[var(--gold)] text-white text-white rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-2">
            <Eye size={16} />
            <span>Show All Categories</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-[var(--stats-border)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--stats-text)]">Grievances by Ward</h3>
            <MapPin size={20} className="text-[var(--stats-muted)]" />
          </div>
          <div className="space-y-3 mb-6">
            {Object.entries(analytics.wardStats || {})
              .sort(([,a], [,b]) => b.total - a.total)
              .slice(0, 3)
              .map(([ward, stats]) => {
                const percentage = (stats.total / analytics.totalGrievances) * 100;
                const resolvedPercentage = stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0;
                return (
                  <div key={ward} className="bg-[var(--cream-50)] rounded-xl p-4 border border-[var(--stats-border)] hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-[var(--stats-text)]">{ward}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-[var(--stats-text)]">{stats.total}</span>
                        <span className="text-xs text-[var(--stats-muted)] bg-white px-2 py-1 rounded-full border border-[var(--stats-border)]">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="flex space-x-2 mb-3">
                      <div className="flex-1 bg-[var(--brown-100)] rounded-full h-3">
                        <div className="bg-[var(--gold)] h-3 rounded-full transition-all duration-1000" style={{ width: `${resolvedPercentage}%` }} />
                      </div>
                      <div className="flex-1 bg-[var(--brown-100)] rounded-full h-3">
                        <div className="bg-[var(--brown-300)] h-3 rounded-full" style={{ width: `${100 - resolvedPercentage}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--gold)] font-medium flex items-center gap-1"><CheckCircle size={14} />{stats.resolved} Resolved</span>
                      <span className="text-[var(--stats-muted)] font-medium flex items-center gap-1"><Clock size={14} />{stats.pending} Pending</span>
                    </div>
                  </div>
                );
              })}
          </div>
          <button onClick={() => setShowWardModal(true)} className="w-full py-3 bg-[var(--dark)] hover:bg-[var(--gold)] text-white text-white rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-2">
            <Eye size={16} />
            <span>Show All Wards</span>
          </button>
        </div>
      </div>

      {/* Status Distribution & Performance Metrics - premium */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md border border-[var(--stats-border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--stats-text)] mb-6">Status Distribution</h3>
          <div className="space-y-3">
            {Object.entries(analytics.statusStats || {}).map(([status, count]) => {
              const dotClass = status === 'Resolved' ? 'bg-[var(--gold)]' : status === 'In Progress' ? 'bg-[var(--gold-light)]' : 'bg-[var(--brown-400)]';
              const percentage = ((count / analytics.totalGrievances) * 100).toFixed(1);
              return (
                <div key={status} className="flex items-center justify-between p-3 bg-[var(--cream-50)] rounded-lg border border-[var(--stats-border)]">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${dotClass}`} />
                    <span className="font-medium text-[var(--stats-text)]">{status}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[var(--stats-text)]">{count}</div>
                    <div className="text-xs text-[var(--stats-muted)]">{percentage}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-[var(--stats-border)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--stats-text)]">Performance Metrics</h3>
            <TrendingUp size={20} className="text-[var(--stats-muted)]" />
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--stats-text)]">Resolution Rate</span>
                <span className="text-lg font-bold text-[var(--gold)]">{analytics.resolutionRate}%</span>
              </div>
              <div className="w-full bg-[var(--brown-100)] rounded-full h-3">
                <div className="bg-[var(--gold)] h-3 rounded-full transition-all duration-1000" style={{ width: `${analytics.resolutionRate}%` }} />
              </div>
            </div>
            <div className="p-4 bg-[var(--gold-bg)] rounded-lg border border-[var(--gold-border)]">
              <div className="flex items-center gap-3">
                <Clock size={24} className="text-[var(--gold)]" />
                <div>
                  <p className="text-sm text-[var(--stats-muted)]">Average Resolution Time</p>
                  <p className="text-2xl font-bold text-[var(--dark)]">{analytics.avgResolutionTime} hours</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-[var(--cream-50)] rounded-lg border border-[var(--stats-border)]">
              <div className="flex items-center gap-3">
                <TrendingUp size={24} className="text-[var(--gold)]" />
                <div>
                  <p className="text-sm text-[var(--stats-muted)]">Monthly Growth</p>
                  <p className="text-2xl font-bold text-[var(--stats-text)]">+12%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trends - premium */}
      <div className="bg-white rounded-xl shadow-md border border-[var(--stats-border)] p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[var(--stats-text)]">Recent Activity & Trends</h3>
          <Calendar size={20} className="text-[var(--stats-muted)]" />
        </div>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-semibold text-[var(--stats-text)]">Monthly Grievance Trends</h4>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-[var(--gold)] rounded-full" />
                <span className="text-[var(--stats-text)] font-medium">Resolved</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-amber-500 rounded-full" />
                <span className="text-[var(--stats-text)] font-medium">New</span>
              </div>
            </div>
          </div>
          <div className="h-64 bg-[var(--cream-50)] rounded-2xl p-8 border border-[var(--stats-border)] relative">
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
                        <stop offset="0%" stopColor="#B45309" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#B45309" stopOpacity="0.02"/>
                      </linearGradient>
                      <linearGradient id="newGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#D97706" stopOpacity="0.15"/>
                        <stop offset="100%" stopColor="#D97706" stopOpacity="0.02"/>
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
                      stroke="var(--gold)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points={newPoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#D97706"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {resolvedPoints.map((point, index) => (
                      <circle key={`resolved-${index}`} cx={point.x} cy={point.y} r="5" fill="var(--gold)" stroke="white" strokeWidth="2" />
                    ))}
                    {newPoints.map((point, index) => (
                      <circle key={`new-${index}`} cx={point.x} cy={point.y} r="5" fill="#D97706" stroke="white" strokeWidth="2" />
                    ))}
                    
                    {months.map((month, index) => (
                      <text key={month} x={80 + (index / (months.length - 1)) * 320} y="135" textAnchor="middle" fill="var(--stats-muted)" fontSize="14">
                        {month}
                      </text>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div className="bg-[var(--gold-bg)] rounded-xl p-6 border border-[var(--gold-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--gold)] font-medium">Average Resolved</p>
                  <p className="text-3xl font-bold text-[var(--dark)] mt-1">12.8</p>
                </div>
                <div className="w-12 h-12 bg-[var(--gold-bg)] rounded-xl flex items-center justify-center">
                  <TrendingUp size={24} className="text-[var(--gold)]" />
                </div>
              </div>
            </div>
            <div className="bg-[var(--cream-50)] rounded-xl p-6 border border-[var(--stats-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--stats-muted)] font-medium">Average New</p>
                  <p className="text-3xl font-bold text-[var(--stats-text)] mt-1">8.5</p>
                </div>
                <div className="w-12 h-12 bg-[var(--brown-100)] rounded-xl flex items-center justify-center">
                  <TrendingUp size={24} className="text-[var(--stats-muted)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="text-center p-6 bg-[var(--gold-bg)] rounded-xl border border-[var(--gold-border)] hover:shadow-lg transition-shadow">
            <div className="text-4xl font-bold text-[var(--dark)] mb-3">{grievances.filter(g => g.status === 'Resolved').length}</div>
            <p className="text-sm text-[var(--gold)] font-medium mb-2">Cases Resolved This Month</p>
            <div className="flex items-center justify-center gap-1">
              <TrendingUp size={14} className="text-[var(--gold)]" />
              <span className="text-xs text-[var(--gold)] font-medium">15% from last month</span>
            </div>
          </div>
          <div className="text-center p-6 bg-white rounded-xl border border-[var(--stats-border)] hover:shadow-lg transition-shadow">
            <div className="text-4xl font-bold text-[var(--stats-text)] mb-3">{grievances.filter(g => g.status === 'In Progress').length}</div>
            <p className="text-sm text-[var(--stats-muted)] font-medium mb-2">Active Cases</p>
            <div className="flex items-center justify-center gap-1">
              <Clock size={14} className="text-[var(--stats-muted)]" />
              <span className="text-xs text-[var(--stats-muted)] font-medium">Currently processing</span>
            </div>
          </div>
          <div className="text-center p-6 bg-[var(--cream-50)] rounded-xl border border-[var(--stats-border)] hover:shadow-lg transition-shadow">
            <div className="text-4xl font-bold text-[var(--stats-text)] mb-3">{grievances.filter(g => g.status === 'New').length}</div>
            <p className="text-sm text-[var(--stats-muted)] font-medium mb-2">New Submissions</p>
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle size={14} className="text-[var(--stats-muted)]" />
              <span className="text-xs text-[var(--stats-muted)] font-medium">Awaiting assignment</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-md border border-[var(--stats-border)] text-center">
        <p className="text-sm text-[var(--stats-muted)]">Data updated in real-time • Last updated: {new Date().toLocaleString()}</p>
        <p className="text-sm text-[var(--stats-muted)] mt-1">© 2024 Grievance Redressal System - IGRS Portal</p>
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[var(--stats-border)] max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-[var(--stats-border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[var(--stats-text)]">All Categories</h2>
                <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-[var(--cream-50)] rounded-lg">
                  <X size={24} className="text-[var(--stats-muted)]" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(analytics.categoryStats || {}).sort(([,a], [,b]) => b.total - a.total).map(([category, stats], index) => {
                  const percentage = (stats.total / analytics.totalGrievances) * 100;
                  const shades = ['from-amber-600 to-amber-700', 'from-amber-500 to-amber-600', 'from-yellow-500 to-amber-500'];
                  return (
                    <div key={category} className="bg-[var(--cream-50)] rounded-xl p-6 border border-[var(--stats-border)] hover:shadow-lg transition-all">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold text-[var(--stats-text)]">{category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-[var(--stats-text)]">{stats.total}</span>
                          <span className="text-sm text-[var(--stats-muted)] bg-white px-3 py-1 rounded-full border border-[var(--stats-border)]">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-[var(--brown-100)] rounded-full h-6 mb-4">
                        <div className={`bg-gradient-to-r ${shades[index % 3]} h-6 rounded-full`} style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-[var(--gold-bg)] rounded-lg"><div className="text-lg font-bold text-[var(--dark)]">{stats.resolved}</div><div className="text-xs text-[var(--gold)]">Resolved</div></div>
                        <div className="text-center p-3 bg-[var(--cream-100)] rounded-lg border border-[var(--stats-border)]"><div className="text-lg font-bold text-[var(--stats-text)]">{stats.pending}</div><div className="text-xs text-[var(--stats-muted)]">Pending</div></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {showWardModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[var(--stats-border)] max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-[var(--stats-border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[var(--stats-text)]">All Wards</h2>
                <button onClick={() => setShowWardModal(false)} className="p-2 hover:bg-[var(--cream-50)] rounded-lg">
                  <X size={24} className="text-[var(--stats-muted)]" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(analytics.wardStats || {}).sort(([,a], [,b]) => b.total - a.total).map(([ward, stats]) => {
                  const percentage = (stats.total / analytics.totalGrievances) * 100;
                  const resolvedPercentage = stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0;
                  return (
                    <div key={ward} className="bg-[var(--cream-50)] rounded-xl p-6 border border-[var(--stats-border)] hover:shadow-lg transition-all">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold text-[var(--stats-text)]">{ward}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-[var(--stats-text)]">{stats.total}</span>
                          <span className="text-sm text-[var(--stats-muted)] bg-white px-3 py-1 rounded-full border border-[var(--stats-border)]">({percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="flex space-x-2 mb-4">
                        <div className="flex-1 bg-[var(--brown-100)] rounded-full h-4">
                          <div className="bg-[var(--gold)] h-4 rounded-full" style={{ width: `${resolvedPercentage}%` }} />
                        </div>
                        <div className="flex-1 bg-[var(--brown-100)] rounded-full h-4">
                          <div className="bg-[var(--brown-300)] h-4 rounded-full" style={{ width: `${100 - resolvedPercentage}%` }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-[var(--gold-bg)] rounded-lg"><div className="text-lg font-bold text-[var(--dark)]">{stats.resolved}</div><div className="text-xs text-[var(--gold)]">Resolved</div></div>
                        <div className="text-center p-3 bg-[var(--cream-100)] rounded-lg border border-[var(--stats-border)]"><div className="text-lg font-bold text-[var(--stats-text)]">{stats.pending}</div><div className="text-xs text-[var(--stats-muted)]">Pending</div></div>
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
