import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, TrendingUp, DollarSign, CheckCircle, ArrowUpRight,
  MapPin, BarChart3, Award, AlertCircle, Megaphone, RefreshCw, Send
} from 'lucide-react';

const MunicipalCommissionerDashboard = () => {
  const [selectedWard, setSelectedWard] = useState(null);

  // KPIs
  const kpis = [
    { label: 'Total Complaints (City)', value: '450', change: '+12%', icon: AlertTriangle, color: 'black' },
    { label: 'Ward Breakdown', value: '12 Wards', change: '3 Critical', icon: MapPin, color: 'golden' },
    { label: 'Budget Utilization', value: '65%', change: '₹45L/₹70L', icon: DollarSign, color: 'cream' },
    { label: 'SLA Compliance', value: '82%', change: '+5%', icon: CheckCircle, color: 'white' },
    { label: 'Escalated Cases', value: '23', change: '-8%', icon: ArrowUpRight, color: 'black' },
    { label: 'Avg Resolution Time', value: '2.8 days', change: '-0.5 days', icon: TrendingUp, color: 'golden' }
  ];

  // Ward Data
  const wards = [
    { id: 1, name: 'Ward 1 - Central', complaints: 45, resolved: 38, pending: 7, sla: 85, budget: 75, status: 'good' },
    { id: 2, name: 'Ward 2 - North', complaints: 52, resolved: 40, pending: 12, sla: 77, budget: 82, status: 'warning' },
    { id: 3, name: 'Ward 3 - South', complaints: 38, resolved: 35, pending: 3, sla: 92, budget: 68, status: 'good' },
    { id: 4, name: 'Ward 4 - East', complaints: 48, resolved: 32, pending: 16, sla: 67, budget: 88, status: 'critical' },
    { id: 5, name: 'Ward 5 - West', complaints: 42, resolved: 36, pending: 6, sla: 86, budget: 72, status: 'good' },
    { id: 6, name: 'Ward 6 - Industrial', complaints: 55, resolved: 38, pending: 17, sla: 69, budget: 92, status: 'critical' },
    { id: 7, name: 'Ward 7 - Residential', complaints: 35, resolved: 30, pending: 5, sla: 86, budget: 65, status: 'good' },
    { id: 8, name: 'Ward 8 - Commercial', complaints: 50, resolved: 42, pending: 8, sla: 84, budget: 78, status: 'good' },
    { id: 9, name: 'Ward 9 - Suburban', complaints: 28, resolved: 25, pending: 3, sla: 89, budget: 58, status: 'good' },
    { id: 10, name: 'Ward 10 - Rural', complaints: 22, resolved: 20, pending: 2, sla: 91, budget: 52, status: 'good' },
    { id: 11, name: 'Ward 11 - Market', complaints: 40, resolved: 28, pending: 12, sla: 70, budget: 85, status: 'warning' },
    { id: 12, name: 'Ward 12 - Tech Park', complaints: 45, resolved: 38, pending: 7, sla: 84, budget: 75, status: 'good' }
  ];

  // Department Performance
  const departments = [
    { rank: 1, name: 'Electricity', score: 92, complaints: 85, resolved: 78, sla: 92, trend: 'up' },
    { rank: 2, name: 'Water Supply', score: 88, complaints: 120, resolved: 105, sla: 88, trend: 'up' },
    { rank: 3, name: 'Sanitation', score: 85, complaints: 95, resolved: 80, sla: 84, trend: 'stable' },
    { rank: 4, name: 'Roads', score: 78, complaints: 110, resolved: 85, sla: 77, trend: 'down' },
    { rank: 5, name: 'Drainage', score: 75, complaints: 40, resolved: 30, sla: 75, trend: 'down' }
  ];

  // Underperforming Wards
  const underperformingWards = [
    { name: 'Ward 4 - East', issue: 'Low SLA Compliance (67%)', action: 'Resource Reallocation Needed', severity: 'high' },
    { name: 'Ward 6 - Industrial', issue: 'High Pending Cases (17)', action: 'Additional Staff Required', severity: 'high' },
    { name: 'Ward 2 - North', issue: 'Budget Overrun (82%)', action: 'Budget Review Required', severity: 'medium' },
    { name: 'Ward 11 - Market', issue: 'SLA Compliance Below Target (70%)', action: 'Process Optimization Needed', severity: 'medium' }
  ];

  // Ward Heatmap Data (simplified for display)
  const heatmapData = wards.map(ward => ({
    ...ward,
    intensity: ward.status === 'critical' ? 'high' : ward.status === 'warning' ? 'medium' : 'low'
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF5E8] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-black mb-2">Municipal Commissioner Dashboard</h1>
          <p className="text-gray-600">City Level - Ward Monitoring & Resource Allocation</p>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
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
              <p className={`text-xs ${
                kpi.color === 'black' || kpi.color === 'golden' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {kpi.label}
              </p>
              <p className={`text-xs font-bold mt-1 ${
                kpi.color === 'black' || kpi.color === 'golden' ? 'text-[#D4AF37]' : 'text-[#D4AF37]'
              }`}>
                {kpi.change}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Ward Heatmap */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
            >
              <h3 className="text-2xl font-bold text-black mb-6">Ward Heatmap</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                {heatmapData.map((ward) => (
                  <div
                    key={ward.id}
                    onClick={() => setSelectedWard(ward)}
                    className={`p-4 rounded-xl cursor-pointer transition-all hover:scale-105 ${
                      ward.intensity === 'high' ? 'bg-black text-white border-2 border-black' :
                      ward.intensity === 'medium' ? 'bg-gradient-to-br from-[#D4AF37] to-[#C5A028] text-white border-2 border-[#D4AF37]' :
                      'bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] text-black border-2 border-[#D4AF37]'
                    }`}
                  >
                    <div className="text-center">
                      <p className="font-bold text-lg mb-1">W{ward.id}</p>
                      <p className="text-xs mb-2">{ward.complaints} cases</p>
                      <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                        ward.intensity === 'high' ? 'bg-[#D4AF37] text-black' :
                        ward.intensity === 'medium' ? 'bg-white/20 text-white' :
                        'bg-white text-black border border-[#D4AF37]'
                      }`}>
                        {ward.sla}% SLA
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {selectedWard && (
                <div className="mt-6 p-4 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-xl border-2 border-[#D4AF37]">
                  <h4 className="font-bold text-black mb-2">{selectedWard.name}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Complaints</p>
                      <p className="font-bold text-black">{selectedWard.complaints}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Resolved</p>
                      <p className="font-bold text-black">{selectedWard.resolved}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Pending</p>
                      <p className="font-bold text-black">{selectedWard.pending}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Budget Used</p>
                      <p className="font-bold text-black">{selectedWard.budget}%</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Ward Comparison Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-black"
            >
              <h3 className="text-2xl font-bold text-black mb-6">Ward Comparison</h3>
              <div className="space-y-4">
                {wards.slice(0, 6).map((ward, index) => (
                  <div key={index} className="p-4 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-xl border border-[#D4AF37]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-black">{ward.name}</span>
                      <span className="text-2xl font-bold text-[#D4AF37]">{ward.sla}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-2">
                      <span>Total: {ward.complaints}</span>
                      <span>Resolved: {ward.resolved}</span>
                      <span>Pending: {ward.pending}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          ward.sla >= 85 ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A028]' :
                          ward.sla >= 75 ? 'bg-gradient-to-r from-[#C5A028] to-[#B8941F]' :
                          'bg-gradient-to-r from-gray-600 to-gray-800'
                        }`}
                        style={{ width: `${ward.sla}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Department Performance Ranking */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-black to-gray-900 rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Department Performance Ranking</h3>
              <div className="space-y-4">
                {departments.map((dept, index) => (
                  <div
                    key={index}
                    className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-[#D4AF37]/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                        dept.rank === 1 ? 'bg-[#D4AF37] text-black' :
                        dept.rank === 2 ? 'bg-white/20 text-white' :
                        'bg-white/10 text-white'
                      }`}>
                        {dept.rank}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-white">{dept.name}</h4>
                          <span className="text-2xl font-bold text-[#D4AF37]">{dept.score}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-300">
                          <span>Cases: {dept.complaints}</span>
                          <span>Resolved: {dept.resolved}</span>
                          <span>SLA: {dept.sla}%</span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        dept.trend === 'up' ? 'bg-[#D4AF37] text-black' :
                        dept.trend === 'down' ? 'bg-white/20 text-white' :
                        'bg-white/10 text-white'
                      }`}>
                        {dept.trend === 'up' ? '↑' : dept.trend === 'down' ? '↓' : '→'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Underperforming Ward List */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-black"
            >
              <div className="flex items-center gap-2 mb-6">
                <AlertCircle className="w-6 h-6 text-[#D4AF37]" />
                <h3 className="text-xl font-bold text-black">Underperforming Wards</h3>
              </div>
              <div className="space-y-4">
                {underperformingWards.map((ward, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 ${
                      ward.severity === 'high' ? 'bg-black text-white border-black' :
                      'bg-gradient-to-br from-[#D4AF37] to-[#C5A028] text-white border-[#D4AF37]'
                    }`}
                  >
                    <h4 className="font-bold mb-2">{ward.name}</h4>
                    <p className="text-sm mb-2">{ward.issue}</p>
                    <div className={`text-xs font-bold px-3 py-1 rounded-full inline-block ${
                      ward.severity === 'high' ? 'bg-[#D4AF37] text-black' : 'bg-white/20 text-white'
                    }`}>
                      {ward.action}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Control Features */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-[#D4AF37] to-[#C5A028] rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
            >
              <h3 className="text-xl font-bold text-white mb-6">Control Panel</h3>
              <div className="space-y-3">
                <button className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Reallocate Budget
                </button>
                <button className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Transfer Resources
                </button>
                <button className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  Issue Announcement
                </button>
                <button className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                  <ArrowUpRight className="w-5 h-5" />
                  Override Escalation
                </button>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
            >
              <h3 className="text-xl font-bold text-black mb-6">Quick Stats</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-xl border border-[#D4AF37]">
                  <p className="text-sm text-gray-600 mb-1">Best Performing Ward</p>
                  <p className="font-bold text-black">Ward 3 - South</p>
                  <p className="text-xs text-[#D4AF37] font-bold">92% SLA Compliance</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-xl border border-[#D4AF37]">
                  <p className="text-sm text-gray-600 mb-1">Most Active Department</p>
                  <p className="font-bold text-black">Water Supply</p>
                  <p className="text-xs text-[#D4AF37] font-bold">120 Cases Handled</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-xl border border-[#D4AF37]">
                  <p className="text-sm text-gray-600 mb-1">City-wide Resolution Rate</p>
                  <p className="font-bold text-black">84.2%</p>
                  <p className="text-xs text-[#D4AF37] font-bold">+3.5% from last month</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MunicipalCommissionerDashboard;
