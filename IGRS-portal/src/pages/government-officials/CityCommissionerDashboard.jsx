import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Users, Clock, CheckCircle, CheckCircle2, AlertTriangle, 
  MapPin, DollarSign, BarChart3, Activity
} from 'lucide-react';

const CityCommissionerDashboard = ({ data }) => {
  const [selectedView, setSelectedView] = useState('overview');

  // Use API data
  const apiKpis = data?.dashboard?.kpis;
  const kpis = [
    { label: 'Active Complaints', value: apiKpis?.active_complaints || '0', icon: AlertTriangle, color: 'black', trend: '+5%' },
    { label: 'Resolved This Month', value: apiKpis?.resolved_this_month || '0', icon: CheckCircle, color: 'golden', trend: '+12%' },
    { label: 'Overdue', value: apiKpis?.overdue || '0', icon: Clock, color: 'cream', trend: '-3%' },
    { label: 'Avg Resolution Time', value: `${apiKpis?.avg_resolution_time || '0'} days`, icon: Activity, color: 'white', trend: '-8%' },
    { label: 'Critical Issues', value: apiKpis?.critical_issues || '0', icon: TrendingUp, color: 'black', trend: '+2%' }
  ];

  const wardPerformance = data?.dashboard?.wardPerformance || [];
  const departmentPerformance = data?.dashboard?.departmentPerformance || [];
  const budget = data?.dashboard?.budget || {};
  const highPriorityIssues = data?.dashboard?.highPriorityIssues || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF5E8] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-black mb-2">City Commissioner Dashboard</h1>
          <p className="text-gray-600">Strategic Level - City-Wide Operations</p>
          <div className="mt-4 flex gap-4">
            <div className="bg-white px-4 py-2 rounded-lg border-2 border-[#D4AF37]">
              <p className="text-sm text-gray-600">Officer</p>
              <p className="font-bold text-black">{data?.user?.name}</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border-2 border-[#D4AF37]">
              <p className="text-sm text-gray-600">City</p>
              <p className="font-bold text-black">{data?.user?.city || 'N/A'}</p>
            </div>
          </div>
        </motion.div>

        {/* KPIs */}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Ward Performance */}
          <div className="lg:col-span-2 space-y-8">
            {/* Ward Performance - Grid of Cards */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h3 className="text-2xl font-bold text-black mb-6 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-[#D4AF37]" />
                Ward Performance
              </h3>
              
              {/* Ward Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-[#D4AF37] hover:-translate-y-1"
                    >
                      {/* Card Header */}
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
                        
                        {/* Total Grievances */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold">{ward.total_grievances}</span>
                          <span className="text-gray-300">Total Grievances</span>
                        </div>
                      </div>

                      {/* Card Body - Statistics */}
                      <div className="p-6 bg-gradient-to-br from-[#FFF8F0] to-white">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          {/* Resolved */}
                          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-[#D4AF37] shadow-sm">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                            <div>
                              <p className="text-2xl font-bold text-black">{ward.resolved}</p>
                              <p className="text-xs text-gray-600">Resolved</p>
                            </div>
                          </div>

                          {/* Pending */}
                          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-[#D4AF37] shadow-sm">
                            <Clock className="w-8 h-8 text-yellow-600" />
                            <div>
                              <p className="text-2xl font-bold text-black">{ward.total_grievances - ward.resolved}</p>
                              <p className="text-xs text-gray-600">Pending</p>
                            </div>
                          </div>

                          {/* Overdue */}
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

                        {/* Resolution Rate Bar */}
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

                        {/* Avg Resolution Time */}
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
                  <div className="col-span-2 text-center py-12 bg-white rounded-xl shadow-lg border-2 border-[#D4AF37]">
                    <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-black mb-2">No Ward Data Available</h3>
                    <p className="text-gray-600">There are no ward performance metrics to display at this time.</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Department Performance */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-black"
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
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Budget Overview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-br from-black to-gray-900 rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
            >
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-[#D4AF37]" />
                Budget Overview
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <p className="text-sm text-gray-300 mb-1">Total Allocated</p>
                  <p className="text-2xl font-bold text-white">₹{(budget.total_allocated || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <p className="text-sm text-gray-300 mb-1">Remaining</p>
                  <p className="text-2xl font-bold text-[#D4AF37]">₹{(budget.remaining || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <p className="text-sm text-gray-300 mb-1">Active Allocations</p>
                  <p className="text-2xl font-bold text-white">{budget.active_allocations || 0}</p>
                </div>
              </div>
            </motion.div>

            {/* High Priority Issues */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
            >
              <h3 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                High Priority Issues
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {highPriorityIssues.length > 0 ? highPriorityIssues.map((issue, index) => (
                  <div key={index} className="p-3 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-lg border border-[#D4AF37]">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-bold text-sm text-black">{issue.grievance_id}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        issue.priority === 'critical' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                      }`}>
                        {issue.priority?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{issue.title?.substring(0, 60)}...</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <MapPin className="w-3 h-3" />
                      <span>{issue.ward_name || issue.location}</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-4">No high priority issues</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CityCommissionerDashboard;
