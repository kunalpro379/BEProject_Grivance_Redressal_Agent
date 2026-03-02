import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Clock, Users, Wrench, TrendingUp, MessageSquare,
  Bell, CheckCircle, MapPin, User, Phone, Calendar, Filter,
  ArrowUpRight, Activity, Zap, Package, UserCheck
} from 'lucide-react';

const WardOfficerDashboard = ({ data }) => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [activeChat, setActiveChat] = useState('citizens');

  // Use API data if available, otherwise use mock data
  const apiKpis = data?.dashboard?.kpis;
  const kpis = apiKpis ? [
    { label: 'Active Complaints', value: apiKpis.active_complaints || '0', icon: AlertTriangle, color: 'black' },
    { label: 'Due Today', value: apiKpis.due_today || '0', icon: Clock, color: 'golden' },
    { label: 'Overdue', value: apiKpis.overdue || '0', icon: TrendingUp, color: 'cream' },
    { label: 'High Priority', value: apiKpis.high_priority || '0', icon: Users, color: 'white' },
    { label: 'Resource Utilization', value: '78%', icon: Wrench, color: 'black' }
  ] : [
    { label: 'Active Complaints', value: '45', icon: AlertTriangle, color: 'black' },
    { label: 'Due Today', value: '12', icon: Clock, color: 'golden' },
    { label: 'Overdue', value: '5', icon: TrendingUp, color: 'cream' },
    { label: 'Assigned Staff', value: '8', icon: Users, color: 'white' },
    { label: 'Resource Utilization', value: '78%', icon: Wrench, color: 'black' }
  ];

  // Complaint Queue - use API data if available
  const apiComplaints = data?.dashboard?.complaints;
  const complaints = apiComplaints && apiComplaints.length > 0 ? apiComplaints.map(c => ({
    id: c.grievance_id,
    title: c.title?.substring(0, 50) || 'Complaint',
    location: c.location || 'Location not specified',
    priority: c.priority || 'medium',
    sla: c.sla_hours_remaining ? `${Math.abs(Math.round(c.sla_hours_remaining))}h ${c.sla_hours_remaining < 0 ? 'overdue' : 'remaining'}` : 'N/A',
    risk: c.priority === 'critical' || c.priority === 'high' ? 'high' : c.priority === 'medium' ? 'medium' : 'low',
    category: c.category || 'General',
    assignedTo: c.assigned_to || 'Unassigned'
  })) : [
    { id: 'C001', title: 'Water Leakage', location: 'Sector 15, Block A', priority: 'high', sla: '2h 30m', risk: 'high', category: 'Water', assignedTo: 'Ramesh Kumar' },
    { id: 'C002', title: 'Street Light Not Working', location: 'Main Road, Near Temple', priority: 'medium', sla: '5h 15m', risk: 'medium', category: 'Electricity', assignedTo: 'Suresh Patil' },
    { id: 'C003', title: 'Garbage Not Collected', location: 'Sector 12, Block C', priority: 'high', sla: '1h 45m', risk: 'high', category: 'Sanitation', assignedTo: 'Vijay Singh' },
    { id: 'C004', title: 'Road Pothole', location: 'Link Road, Near School', priority: 'low', sla: '8h 20m', risk: 'low', category: 'Roads', assignedTo: 'Amit Sharma' },
    { id: 'C005', title: 'Drainage Blockage', location: 'Sector 18, Block B', priority: 'high', sla: '3h 10m', risk: 'high', category: 'Drainage', assignedTo: 'Prakash Yadav' }
  ];

  // Resources - use API data if available
  const apiWorkers = data?.dashboard?.workers;
  const workers = apiWorkers && apiWorkers.length > 0 ? apiWorkers.map(w => ({
    name: w.name,
    role: w.role || w.specialization || 'Worker',
    status: w.status || 'available',
    location: w.zone || w.ward || 'Ward Office',
    tasks: w.workload || 0
  })) : [
    { name: 'Ramesh Kumar', role: 'Plumber', status: 'busy', location: 'Sector 15', tasks: 3 },
    { name: 'Suresh Patil', role: 'Electrician', status: 'available', location: 'Ward Office', tasks: 1 },
    { name: 'Vijay Singh', role: 'Sanitation Worker', status: 'busy', location: 'Sector 12', tasks: 2 },
    { name: 'Amit Sharma', role: 'Road Worker', status: 'available', location: 'Sector 10', tasks: 0 },
    { name: 'Prakash Yadav', role: 'Drainage Worker', status: 'busy', location: 'Sector 18', tasks: 2 }
  ];

  const apiEquipment = data?.dashboard?.equipment;
  const equipment = apiEquipment && apiEquipment.length > 0 ? apiEquipment.map(e => ({
    name: e.name,
    status: e.status || 'available',
    location: e.location || 'Ward Office'
  })) : [
    { name: 'Water Pump #1', status: 'in-use', location: 'Sector 15' },
    { name: 'Generator #2', status: 'available', location: 'Ward Office' },
    { name: 'Garbage Truck #3', status: 'in-use', location: 'Sector 12' },
    { name: 'Road Roller #1', status: 'maintenance', location: 'Workshop' }
  ];

  // Analytics - use API data if available
  const apiCategoryData = data?.dashboard?.categoryAnalytics;
  const categoryData = apiCategoryData && apiCategoryData.length > 0 ? apiCategoryData.map(c => {
    const total = apiCategoryData.reduce((sum, item) => sum + parseInt(item.count), 0);
    return {
      category: c.category || 'Other',
      count: parseInt(c.count) || 0,
      percentage: total > 0 ? Math.round((parseInt(c.count) / total) * 100) : 0
    };
  }) : [
    { category: 'Water', count: 15, percentage: 33 },
    { category: 'Electricity', count: 10, percentage: 22 },
    { category: 'Sanitation', count: 12, percentage: 27 },
    { category: 'Roads', count: 8, percentage: 18 }
  ];

  const resolutionRate = [
    { day: 'Mon', resolved: 8, total: 10 },
    { day: 'Tue', resolved: 12, total: 15 },
    { day: 'Wed', resolved: 10, total: 12 },
    { day: 'Thu', resolved: 15, total: 18 },
    { day: 'Fri', resolved: 14, total: 16 }
  ];

  // Alerts - use API data if available
  const apiAlerts = data?.dashboard?.alerts;
  const alerts = apiAlerts && apiAlerts.length > 0 ? apiAlerts.map(a => ({
    type: a.type || 'sla',
    message: a.message,
    severity: a.severity || 'medium'
  })) : [
    { type: 'sla', message: 'Water Leakage complaint (C001) SLA breach in 30 minutes', severity: 'high' },
    { type: 'budget', message: 'Ward maintenance budget 85% utilized', severity: 'medium' },
    { type: 'resource', message: 'Only 2 workers available for new assignments', severity: 'medium' }
  ];

  // Chat Messages
  const chatMessages = {
    citizens: [
      { from: 'Rajesh Mehta', message: 'When will the water issue be fixed?', time: '10:30 AM', unread: true },
      { from: 'Priya Sharma', message: 'Thank you for quick response!', time: '09:15 AM', unread: false }
    ],
    officers: [
      { from: 'Dept. Head - Water', message: 'Need status update on Sector 15', time: '11:00 AM', unread: true },
      { from: 'Municipal Commissioner', message: 'Good work on yesterday\'s resolution', time: 'Yesterday', unread: false }
    ],
    internal: [
      { from: 'Ramesh Kumar', message: 'Need additional equipment for C001', time: '10:45 AM', unread: true },
      { from: 'Suresh Patil', message: 'Completed street light repair', time: '09:30 AM', unread: false }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF5E8] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-black mb-2">Ward Officer Dashboard</h1>
          <p className="text-gray-600">Execution Level - Ground Operations Management</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Complaint Queue */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-black">Complaint Queue</h3>
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-black rounded-xl font-bold focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
              <div className="space-y-4">
                {complaints.map((complaint, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 hover:shadow-md transition-all ${
                      complaint.priority === 'high' ? 'bg-black text-white border-black' :
                      complaint.priority === 'medium' ? 'bg-gradient-to-br from-[#D4AF37] to-[#C5A028] text-white border-[#D4AF37]' :
                      'bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] text-black border-[#D4AF37]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold">{complaint.id}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            complaint.priority === 'high' ? 'bg-[#D4AF37] text-black' :
                            complaint.priority === 'medium' ? 'bg-white/20 text-white' :
                            'bg-white text-black border-2 border-[#D4AF37]'
                          }`}>
                            {complaint.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-lg">{complaint.title}</h4>
                        <p className={`text-sm ${
                          complaint.priority === 'high' || complaint.priority === 'medium' ? 'text-white/80' : 'text-gray-600'
                        }`}>
                          {complaint.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="font-bold">{complaint.sla}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          complaint.risk === 'high' ? 'bg-white text-black' :
                          complaint.risk === 'medium' ? 'bg-white/20 text-white' :
                          'bg-white text-black'
                        }`}>
                          {complaint.risk.toUpperCase()} RISK
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4" />
                      <span>Assigned: {complaint.assignedTo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Analytics */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-black"
            >
              <h3 className="text-2xl font-bold text-black mb-6">Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Distribution */}
                <div>
                  <h4 className="font-bold text-black mb-4">Category Distribution</h4>
                  <div className="space-y-3">
                    {categoryData.map((item, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">{item.category}</span>
                          <span className="font-bold text-[#D4AF37]">{item.count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-[#D4AF37] to-[#C5A028] h-2 rounded-full transition-all duration-500"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daily Resolution Rate */}
                <div>
                  <h4 className="font-bold text-black mb-4">Daily Resolution Rate</h4>
                  <div className="flex items-end justify-between h-40">
                    {resolutionRate.map((day, index) => (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div className="w-full flex flex-col items-center justify-end h-32 mb-2">
                          <div
                            className="w-8 bg-gradient-to-t from-[#D4AF37] to-[#C5A028] rounded-t-lg"
                            style={{ height: `${(day.resolved / day.total) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs font-bold text-black">{day.day}</p>
                        <p className="text-xs text-gray-600">{day.resolved}/{day.total}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Alerts */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-br from-black to-gray-900 rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
            >
              <div className="flex items-center gap-2 mb-6">
                <Bell className="w-6 h-6 text-[#D4AF37]" />
                <h3 className="text-xl font-bold text-white">Alerts</h3>
              </div>
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border ${
                      alert.severity === 'high' ? 'bg-[#D4AF37] text-black border-[#D4AF37]' :
                      'bg-white/10 backdrop-blur-sm text-white border-white/20'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-semibold">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Resource Management */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
            >
              <h3 className="text-xl font-bold text-black mb-6">Resource Management</h3>
              
              {/* Workers */}
              <div className="mb-6">
                <h4 className="font-bold text-black mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#D4AF37]" />
                  Workers
                </h4>
                <div className="space-y-2">
                  {workers.map((worker, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-lg border border-[#D4AF37]"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-black text-sm">{worker.name}</p>
                          <p className="text-xs text-gray-600">{worker.role}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            worker.status === 'available' ? 'bg-black text-[#D4AF37]' :
                            worker.status === 'busy' ? 'bg-[#D4AF37] text-black' :
                            'bg-gray-200 text-gray-700'
                          }`}>
                            {worker.status.toUpperCase()}
                          </span>
                          <p className="text-xs text-gray-600 mt-1">{worker.tasks} tasks</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div>
                <h4 className="font-bold text-black mb-3 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-[#D4AF37]" />
                  Equipment
                </h4>
                <div className="space-y-2">
                  {equipment.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-lg border border-[#D4AF37]"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-black text-sm">{item.name}</p>
                          <p className="text-xs text-gray-600">{item.location}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          item.status === 'available' ? 'bg-black text-[#D4AF37]' :
                          item.status === 'in-use' ? 'bg-[#D4AF37] text-black' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Chat & Communication */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-black"
            >
              <h3 className="text-xl font-bold text-black mb-4">Chat & Communication</h3>
              <div className="flex gap-2 mb-4">
                {['citizens', 'officers', 'internal'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveChat(tab)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                      activeChat === tab
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A028] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {chatMessages[activeChat].map((msg, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-2 ${
                      msg.unread ? 'bg-[#FFF8F0] border-[#D4AF37]' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-bold text-black text-sm">{msg.from}</p>
                      <span className="text-xs text-gray-500">{msg.time}</span>
                    </div>
                    <p className="text-sm text-gray-700">{msg.message}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WardOfficerDashboard;
