import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Users, AlertTriangle, BarChart3, DollarSign,
  MapPin, Activity, Clock, CheckCircle, ArrowUpRight
} from 'lucide-react';

const DistrictCollectorDashboard = ({ data }) => {
  const [selectedTab, setSelectedTab] = useState('overview');

  // Use API data
  const apiKpis = data?.dashboard?.kpis;
  const kpis = [
    { label: 'Active Complaints', value: apiKpis?.active_complaints || '0', icon: AlertTriangle, color: 'black' },
    { label: 'Total Resolved', value: apiKpis?.total_resolved || '0', icon: CheckCircle, color: 'golden' },
    { label: 'Escalated', value: apiKpis?.escalated || '0', icon: TrendingUp, color: 'cream' },
    { label: 'Avg Resolution', value: `${apiKpis?.avg_resolution_days || '0'} days`, icon: Clock, color: 'white' },
    { label: 'Cities Active', value: apiKpis?.cities_with_issues || '0', icon: MapPin, color: 'black' }
  ];

  const cityPerformance = data?.dashboard?.cityPerformance || [];
  const budgetUtilization = data?.dashboard?.budgetUtilization || [];
  const escalatedIssues = data?.dashboard?.escalatedIssues || [];
  const trendAnalysis = data?.dashboard?.trendAnalysis || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF5E8] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-black mb-2">District Collector Dashboard</h1>
          <p className="text-gray-600">Policy Level - District-Wide Oversight</p>
          <div className="mt-4 flex gap-4">
            <div className="bg-white px-4 py-2 rounded-lg border-2 border-[#D4AF37]">
              <p className="text-sm text-gray-600">Officer</p>
              <p className="font-bold text-black">{data?.user?.name}</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border-2 border-[#D4AF37]">
              <p className="text-sm text-gray-600">District</p>
              <p className="font-bold text-black">{data?.user?.district || 'N/A'}</p>
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
              <p className={`text-sm ${
                kpi.color === 'black' || kpi.color === 'golden' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {kpi.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          {['overview', 'budget', 'escalations'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                selectedTab === tab
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A028] text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content based on selected tab */}
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* City Performance */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
            >
              <h3 className="text-2xl font-bold text-black mb-6 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-[#D4AF37]" />
                City-wise Performance
              </h3>
              <div className="space-y-4">
                {cityPerformance.length > 0 ? cityPerformance.map((city, index) => (
                  <div key={index} className="p-4 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-xl border border-[#D4AF37]">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-black">{city.city_name}</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        city.resolution_rate >= 80 ? 'bg-green-500 text-white' :
                        city.resolution_rate >= 60 ? 'bg-yellow-500 text-white' :
                        'bg-red-500 text-white'
                      }`}>
                        {city.resolution_rate || 0}%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Total</p>
                        <p className="font-bold text-black">{city.total_grievances}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Resolved</p>
                        <p className="font-bold text-green-600">{city.resolved}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Pending</p>
                        <p className="font-bold text-orange-600">{city.pending}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-4">No city data available</p>
                )}
              </div>
            </motion.div>

            {/* Trend Analysis */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-black"
            >
              <h3 className="text-2xl font-bold text-black mb-6 flex items-center gap-2">
                <Activity className="w-6 h-6 text-[#D4AF37]" />
                30-Day Trend
              </h3>
              <div className="space-y-3">
                {trendAnalysis.length > 0 ? trendAnalysis.slice(0, 10).map((day, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Total</p>
                        <p className="font-bold text-black">{day.total}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Resolved</p>
                        <p className="font-bold text-green-600">{day.resolved}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-4">No trend data available</p>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {selectedTab === 'budget' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
          >
            <h3 className="text-2xl font-bold text-black mb-6 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-[#D4AF37]" />
              Budget Utilization by Department
            </h3>
            <div className="space-y-4">
              {budgetUtilization.length > 0 ? budgetUtilization.map((dept, index) => (
                <div key={index} className="p-4 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-xl border border-[#D4AF37]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-black">{dept.department}</h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      dept.utilization_percent >= 90 ? 'bg-red-500 text-white' :
                      dept.utilization_percent >= 70 ? 'bg-yellow-500 text-white' :
                      'bg-green-500 text-white'
                    }`}>
                      {dept.utilization_percent || 0}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Allocated</p>
                      <p className="font-bold text-black">₹{(dept.allocated || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Utilized</p>
                      <p className="font-bold text-[#D4AF37]">₹{(dept.utilized || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-[#D4AF37] to-[#C5A028] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${dept.utilization_percent || 0}%` }}
                    />
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">No budget data available</p>
              )}
            </div>
          </motion.div>
        )}

        {selectedTab === 'escalations' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
          >
            <h3 className="text-2xl font-bold text-black mb-6 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Escalated Issues
            </h3>
            <div className="space-y-4">
              {escalatedIssues.length > 0 ? escalatedIssues.map((issue, index) => (
                <div key={index} className="p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-300">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-bold text-black">{issue.grievance_id}</span>
                      <p className="text-sm text-gray-700 mt-1">{issue.title?.substring(0, 80)}...</p>
                    </div>
                    <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold">
                      {issue.escalation_level}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-gray-600">City</p>
                      <p className="font-semibold text-black">{issue.city_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Department</p>
                      <p className="font-semibold text-black">{issue.department || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-red-200">
                    <p className="text-xs text-gray-600 mb-1">Escalation Reason</p>
                    <p className="text-sm text-gray-800">{issue.reason}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Escalated: {new Date(issue.created_at).toLocaleString()}
                  </p>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">No escalated issues</p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DistrictCollectorDashboard;
