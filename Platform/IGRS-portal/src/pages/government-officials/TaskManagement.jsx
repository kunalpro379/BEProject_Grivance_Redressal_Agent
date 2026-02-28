import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Clock, CheckCircle, AlertTriangle,
  Calendar, Search, Download, Eye,
  MapPin, User, ArrowUpRight, ArrowDownRight, Zap, Target
} from 'lucide-react';

const TaskManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const stats = [
    {
      label: 'Total Tasks',
      value: '248',
      change: '+12%',
      trend: 'up',
      icon: Target,
      color: 'black'
    },
    {
      label: 'Completed',
      value: '156',
      change: '+8%',
      trend: 'up',
      icon: CheckCircle,
      color: 'golden'
    },
    {
      label: 'In Progress',
      value: '64',
      change: '-5%',
      trend: 'down',
      icon: Clock,
      color: 'cream'
    },
    {
      label: 'Pending',
      value: '28',
      change: '+5%',
      trend: 'up',
      icon: AlertTriangle,
      color: 'white'
    },
    {
      label: 'Escalated',
      value: '28',
      change: '+2%',
      trend: 'up',
      icon: Zap,
      color: 'black'
    }
  ];

  const urgentTasks = [
    {
      title: 'Water Supply Disruption',
      location: 'Andheri West',
      officer: 'Rohit Deshmukh',
      date: '9/23/2025',
      time: '07:30 PM',
      priority: 'high'
    },
    {
      title: 'Power Outage',
      location: 'Bandra East',
      officer: 'Sneha Kulkarni',
      date: '9/23/2025',
      time: '09:30 PM',
      priority: 'high'
    }
  ];

  const allTasks = [
    { id: 1, title: 'Water Supply Disruption', location: 'Andheri West', officer: 'Rohit Deshmukh', status: 'In Progress', priority: 'High', date: '9/23/2025' },
    { id: 2, title: 'Power Outage', location: 'Bandra East', officer: 'Sneha Kulkarni', status: 'Pending', priority: 'High', date: '9/23/2025' },
    { id: 3, title: 'Road Repair', location: 'Kurla', officer: 'Manish Sharma', status: 'Completed', priority: 'Medium', date: '9/22/2025' },
    { id: 4, title: 'Street Light Issue', location: 'Dadar', officer: 'Anjali Mehta', status: 'In Progress', priority: 'Low', date: '9/21/2025' },
    { id: 5, title: 'Garbage Collection', location: 'Malad', officer: 'Vikram Patil', status: 'Pending', priority: 'Medium', date: '9/20/2025' },
    { id: 6, title: 'Drainage Blockage', location: 'Goregaon', officer: 'Rina Joshi', status: 'Completed', priority: 'High', date: '9/19/2025' },
    { id: 7, title: 'Park Maintenance', location: 'Juhu', officer: 'Rajesh Gupta', status: 'In Progress', priority: 'Low', date: '9/18/2025' },
    { id: 8, title: 'Traffic Signal Repair', location: 'Andheri', officer: 'Sanjay Rane', status: 'Pending', priority: 'High', date: '9/17/2025' }
  ];

  const kanbanColumns = {
    pending: allTasks.filter(t => t.status === 'Pending'),
    inProgress: allTasks.filter(t => t.status === 'In Progress'),
    completed: allTasks.filter(t => t.status === 'Completed')
  };

  const aiInsights = [
    {
      title: 'Water supply disruption in Sector 15',
      priority: 'HIGH',
      recommendation: 'Based on historical data, similar issues were resolved by deploying emergency repair team within 4 hours',
      eta: '4-6 hours'
    },
    {
      title: 'Road maintenance in Industrial Area',
      priority: 'MEDIUM',
      recommendation: 'Previous successful resolutions involved coordinating with traffic department for alternative routes',
      eta: '2-3 days'
    },
    {
      title: 'Street light malfunction in Kurla',
      priority: 'MEDIUM',
      recommendation: 'Assign electricians and monitor completion via mobile app updates',
      eta: '1-2 days'
    }
  ];

  const departments = [
    { name: 'Water', completed: 38, total: 45, percentage: 84 },
    { name: 'Roads', completed: 28, total: 32, percentage: 78 },
    { name: 'Electricity', completed: 25, total: 28, percentage: 89 },
    { name: 'Sanitation', completed: 20, total: 24, percentage: 83 },
    { name: 'Transport', completed: 15, total: 18, percentage: 83 }
  ];

  const officers = [
    { initials: 'RD', name: 'Rohit Deshmukh', completed: 45, pending: 15, percentage: 75 },
    { initials: 'SK', name: 'Sneha Kulkarni', completed: 38, pending: 12, percentage: 76 },
    { initials: 'MS', name: 'Manish Sharma', completed: 50, pending: 20, percentage: 71 },
    { initials: 'AM', name: 'Anjali Mehta', completed: 42, pending: 18, percentage: 70 },
    { initials: 'VP', name: 'Vikram Patil', completed: 35, pending: 10, percentage: 78 },
    { initials: 'RJ', name: 'Rina Joshi', completed: 40, pending: 12, percentage: 77 },
    { initials: 'RG', name: 'Rajesh Gupta', completed: 30, pending: 8, percentage: 79 },
    { initials: 'SR', name: 'Sanjay Rane', completed: 28, pending: 15, percentage: 65 },
    { initials: 'MN', name: 'Meera Nair', completed: 33, pending: 9, percentage: 79 },
    { initials: 'KD', name: 'Kunal Desai', completed: 25, pending: 5, percentage: 83 }
  ];

  const analyticsData = {
    tasksByMonth: [
      { month: 'Jan', total: 45, completed: 38, pending: 7 },
      { month: 'Feb', total: 52, completed: 45, pending: 7 },
      { month: 'Mar', total: 48, completed: 42, pending: 6 },
      { month: 'Apr', total: 55, completed: 48, pending: 7 },
      { month: 'May', total: 60, completed: 52, pending: 8 },
      { month: 'Jun', total: 58, completed: 50, pending: 8 }
    ],
    tasksByPriority: [
      { priority: 'High', count: 85, percentage: 34 },
      { priority: 'Medium', count: 102, percentage: 41 },
      { priority: 'Low', count: 61, percentage: 25 }
    ]
  };

  const calendarEvents = [
    { date: '2025-09-23', title: 'Water Supply Disruption', time: '07:30 PM', priority: 'high' },
    { date: '2025-09-23', title: 'Power Outage', time: '09:30 PM', priority: 'high' },
    { date: '2025-09-24', title: 'Road Repair Inspection', time: '10:00 AM', priority: 'medium' },
    { date: '2025-09-25', title: 'Department Meeting', time: '02:00 PM', priority: 'low' },
    { date: '2025-09-26', title: 'Drainage Maintenance', time: '08:00 AM', priority: 'high' }
  ];

  const filteredTasks = allTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || task.status.toLowerCase() === selectedFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF5E8] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-black mb-2">Task Management Dashboard</h1>
              <p className="text-gray-600">Monitor, assign, and track all municipal tasks and grievances</p>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#C5A028] text-white rounded-xl font-bold hover:shadow-xl transition-all duration-300">
              <Plus className="w-5 h-5" />
              New Task
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-2xl p-6 shadow-lg border-2 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${
                stat.color === 'black' ? 'bg-black text-white border-black' :
                stat.color === 'golden' ? 'bg-gradient-to-br from-[#D4AF37] to-[#C5A028] text-white border-[#D4AF37]' :
                stat.color === 'cream' ? 'bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] text-black border-[#D4AF37]' :
                'bg-white text-black border-black'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`w-8 h-8 ${
                  stat.color === 'black' || stat.color === 'golden' ? 'text-white' : 'text-[#D4AF37]'
                }`} />
                <span className={`flex items-center gap-1 text-sm font-bold ${
                  stat.trend === 'up' ? 'text-[#D4AF37]' : 'text-gray-500'
                }`}>
                  {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {stat.change}
                </span>
              </div>
              <p className={`text-3xl font-bold mb-1 ${
                stat.color === 'black' || stat.color === 'golden' ? 'text-white' : 'text-black'
              }`}>
                {stat.value}
              </p>
              <p className={`text-sm ${
                stat.color === 'black' || stat.color === 'golden' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl p-2 shadow-lg border-2 border-[#D4AF37] mb-8">
          <div className="flex flex-wrap gap-2">
            {['Overview', 'All Tasks', 'Kanban', 'Analytics', 'Calendar', 'Officers'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                  activeTab === tab.toLowerCase()
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A028] text-white shadow-md'
                    : 'text-gray-700 hover:bg-[#FFF8F0]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Left Column - Urgent Tasks */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-lg border-2 border-black mb-8"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-black">Urgent Tasks</h3>
                    <span className="px-3 py-1 bg-black text-[#D4AF37] rounded-full text-sm font-bold">
                      12 High Priority
                    </span>
                  </div>
                  <div className="space-y-4">
                    {urgentTasks.map((task, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-xl border-2 border-[#D4AF37] hover:shadow-md transition-all"
                      >
                        <h4 className="font-bold text-black mb-2">{task.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <MapPin className="w-4 h-4 text-[#D4AF37]" />
                          <span>{task.location}</span>
                          <span>•</span>
                          <User className="w-4 h-4 text-[#D4AF37]" />
                          <span>{task.officer}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-[#D4AF37]" />
                          <span>{task.date}</span>
                          <Clock className="w-4 h-4 text-[#D4AF37]" />
                          <span>{task.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* AI Insights */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-black to-gray-900 rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
                >
                  <h3 className="text-xl font-bold text-white mb-6">AI Insights & Recommendations</h3>
                  <div className="space-y-4">
                    {aiInsights.map((insight, index) => (
                      <div
                        key={index}
                        className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-[#D4AF37]/30"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-white text-sm">{insight.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            insight.priority === 'HIGH' ? 'bg-[#D4AF37] text-black' : 'bg-white/20 text-white'
                          }`}>
                            {insight.priority}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{insight.recommendation}</p>
                        <p className="text-[#D4AF37] text-sm font-bold">ETA: {insight.eta}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Right Column - Performance */}
              <div className="lg:col-span-2">
                {/* Department Performance */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37] mb-8"
                >
                  <h3 className="text-xl font-bold text-black mb-6">Department Performance</h3>
                  <div className="space-y-4">
                    {departments.map((dept, index) => (
                      <div key={index} className="p-4 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-xl border border-[#D4AF37]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-black">{dept.name}</span>
                          <span className="text-2xl font-bold text-[#D4AF37]">{dept.percentage}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <span>{dept.completed}/{dept.total} tasks</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-[#D4AF37] to-[#C5A028] h-2 rounded-full transition-all duration-500"
                            style={{ width: `${dept.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Officer Workload */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-2xl p-6 shadow-lg border-2 border-black"
                >
                  <h3 className="text-xl font-bold text-black mb-6">Officer Workload Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {officers.map((officer, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-xl border-2 border-[#D4AF37] hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#C5A028] rounded-full flex items-center justify-center text-white font-bold">
                            {officer.initials}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-black text-sm">{officer.name}</p>
                            <p className="text-xs text-gray-600">
                              {officer.completed} completed, {officer.pending} pending
                            </p>
                          </div>
                          <span className="text-2xl font-bold text-[#D4AF37]">{officer.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-[#D4AF37] to-[#C5A028] h-2 rounded-full transition-all duration-500"
                            style={{ width: `${officer.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </>
          )}

          {/* All Tasks Tab */}
          {activeTab === 'all tasks' && (
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
              >
                <h3 className="text-2xl font-bold text-black mb-6">All Tasks</h3>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="px-6 py-3 border-2 border-black rounded-xl font-bold focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button className="flex items-center gap-2 px-6 py-3 border-2 border-black rounded-xl font-bold hover:bg-black hover:text-white transition-all">
                    <Download className="w-5 h-5" />
                    Export
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-[#D4AF37] to-[#C5A028] text-white">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold">ID</th>
                        <th className="px-4 py-3 text-left font-bold">Task</th>
                        <th className="px-4 py-3 text-left font-bold">Location</th>
                        <th className="px-4 py-3 text-left font-bold">Officer</th>
                        <th className="px-4 py-3 text-left font-bold">Status</th>
                        <th className="px-4 py-3 text-left font-bold">Priority</th>
                        <th className="px-4 py-3 text-left font-bold">Date</th>
                        <th className="px-4 py-3 text-left font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.map((task, index) => (
                        <tr key={task.id} className={`border-b border-gray-200 hover:bg-[#FFF8F0] transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-4 py-3 font-bold text-gray-700">#{task.id}</td>
                          <td className="px-4 py-3 font-semibold text-black">{task.title}</td>
                          <td className="px-4 py-3 text-gray-600">{task.location}</td>
                          <td className="px-4 py-3 text-gray-600">{task.officer}</td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              task.status === 'Completed' ? 'bg-black text-[#D4AF37]' :
                              task.status === 'In Progress' ? 'bg-[#D4AF37] text-white' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              task.priority === 'High' ? 'bg-black text-white' :
                              task.priority === 'Medium' ? 'bg-[#FFF8F0] text-black border-2 border-[#D4AF37]' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{task.date}</td>
                          <td className="px-4 py-3">
                            <button className="p-2 hover:bg-[#D4AF37] hover:text-white rounded-lg transition-all">
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          )}

          {/* Kanban Tab */}
          {activeTab === 'kanban' && (
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h3 className="text-2xl font-bold text-black">Kanban Board</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Pending Column */}
                  <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-300">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-black">Pending</h4>
                      <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-bold">
                        {kanbanColumns.pending.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {kanbanColumns.pending.map((task) => (
                        <div key={task.id} className="p-4 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-xl border-2 border-[#D4AF37] hover:shadow-md transition-all cursor-move">
                          <h5 className="font-bold text-black mb-2">{task.title}</h5>
                          <p className="text-sm text-gray-600 mb-2">{task.location}</p>
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              task.priority === 'High' ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
                            }`}>
                              {task.priority}
                            </span>
                            <span className="text-xs text-gray-500">{task.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* In Progress Column */}
                  <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-black">In Progress</h4>
                      <span className="px-3 py-1 bg-[#D4AF37] text-white rounded-full text-sm font-bold">
                        {kanbanColumns.inProgress.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {kanbanColumns.inProgress.map((task) => (
                        <div key={task.id} className="p-4 bg-gradient-to-br from-[#D4AF37] to-[#C5A028] rounded-xl text-white hover:shadow-md transition-all cursor-move">
                          <h5 className="font-bold mb-2">{task.title}</h5>
                          <p className="text-sm mb-2 text-white/90">{task.location}</p>
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              task.priority === 'High' ? 'bg-black text-white' : 'bg-white/20 text-white'
                            }`}>
                              {task.priority}
                            </span>
                            <span className="text-xs text-white/80">{task.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Completed Column */}
                  <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-black">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-black">Completed</h4>
                      <span className="px-3 py-1 bg-black text-[#D4AF37] rounded-full text-sm font-bold">
                        {kanbanColumns.completed.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {kanbanColumns.completed.map((task) => (
                        <div key={task.id} className="p-4 bg-gradient-to-br from-black to-gray-900 rounded-xl text-white hover:shadow-md transition-all cursor-move">
                          <h5 className="font-bold mb-2">{task.title}</h5>
                          <p className="text-sm text-gray-300 mb-2">{task.location}</p>
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-1 bg-[#D4AF37] text-black rounded-full text-xs font-bold">
                              {task.priority}
                            </span>
                            <span className="text-xs text-gray-400">{task.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h3 className="text-2xl font-bold text-black mb-6">Analytics Dashboard</h3>
                
                {/* Monthly Trends */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]">
                  <h4 className="text-xl font-bold text-black mb-6">Tasks by Month</h4>
                  <div className="grid grid-cols-6 gap-4">
                    {analyticsData.tasksByMonth.map((month, index) => (
                      <div key={index} className="text-center">
                        <div className="mb-2">
                          <div className="h-32 flex flex-col justify-end">
                            <div 
                              className="bg-gradient-to-t from-[#D4AF37] to-[#C5A028] rounded-t-lg transition-all duration-500"
                              style={{ height: `${(month.completed / month.total) * 100}%` }}
                            />
                            <div 
                              className="bg-gray-200 rounded-t-lg"
                              style={{ height: `${(month.pending / month.total) * 100}%` }}
                            />
                          </div>
                        </div>
                        <p className="font-bold text-black">{month.month}</p>
                        <p className="text-sm text-gray-600">{month.total}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Priority Distribution */}
                <div className="bg-gradient-to-br from-black to-gray-900 rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]">
                  <h4 className="text-xl font-bold text-white mb-6">Tasks by Priority</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {analyticsData.tasksByPriority.map((item, index) => (
                      <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#D4AF37]/30">
                        <div className="text-center mb-4">
                          <p className="text-4xl font-bold text-white mb-2">{item.count}</p>
                          <p className="text-gray-300">{item.priority} Priority</p>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-[#D4AF37] to-[#C5A028] h-3 rounded-full transition-all duration-500"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <p className="text-center text-[#D4AF37] font-bold mt-2">{item.percentage}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#D4AF37]"
              >
                <h3 className="text-2xl font-bold text-black mb-6">Calendar View</h3>
                <div className="space-y-4">
                  {calendarEvents.map((event, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border-2 hover:shadow-md transition-all ${
                        event.priority === 'high' ? 'bg-black text-white border-black' :
                        event.priority === 'medium' ? 'bg-gradient-to-br from-[#D4AF37] to-[#C5A028] text-white border-[#D4AF37]' :
                        'bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] text-black border-[#D4AF37]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold">{event.title}</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          event.priority === 'high' ? 'bg-[#D4AF37] text-black' :
                          event.priority === 'medium' ? 'bg-white/20 text-white' :
                          'bg-white text-black border-2 border-[#D4AF37]'
                        }`}>
                          {event.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{event.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{event.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}

          {/* Officers Tab */}
          {activeTab === 'officers' && (
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-lg border-2 border-black"
              >
                <h3 className="text-2xl font-bold text-black mb-6">Officer Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {officers.map((officer, index) => (
                    <div
                      key={index}
                      className="p-6 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-xl border-2 border-[#D4AF37] hover:shadow-lg transition-all"
                    >
                      <div className="flex flex-col items-center text-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#C5A028] rounded-full flex items-center justify-center text-white font-bold text-xl mb-3">
                          {officer.initials}
                        </div>
                        <p className="font-bold text-black">{officer.name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {officer.completed} completed • {officer.pending} pending
                        </p>
                      </div>
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">Completion Rate</span>
                          <span className="text-lg font-bold text-[#D4AF37]">{officer.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-[#D4AF37] to-[#C5A028] h-2 rounded-full transition-all duration-500"
                            style={{ width: `${officer.percentage}%` }}
                          />
                        </div>
                      </div>
                      <button className="w-full mt-4 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskManagement;
