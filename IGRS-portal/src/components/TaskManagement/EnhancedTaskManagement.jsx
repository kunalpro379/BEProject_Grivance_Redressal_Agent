import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Users, BarChart3, Settings, Filter, Search, Plus, 
  AlertTriangle, Clock, CheckCircle, TrendingUp, MapPin, 
  Activity, Target, Zap, ChevronDown, Eye, Edit, Trash2,
  ArrowUpRight, ArrowDownRight, Minus, Grid3X3, List, Kanban
} from 'lucide-react';

// Import data
import dashboardData from '../../data/officials/TaskManagement/Dashboard.json';
import overviewData from '../../data/officials/TaskManagement/Overview.json';
import tasksData from '../../data/officials/TaskManagement/Tasks.json';
import officersData from '../../data/officials/TaskManagement/officers_workloads.json';

// Import new components
import TaskKanbanBoard from './TaskKanbanBoard';
import TaskAnalyticsChart from './TaskAnalyticsChart';
import TaskFilters from './TaskFilters';
import TaskDetailModal from './TaskDetailModal';

const EnhancedTaskManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid, list, kanban
  const [filters, setFilters] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState('pending');

  // Process data
  const { taskManagement } = dashboardData;
  const { dashboard } = overviewData;
  const { taskManagement: tasksInfo } = tasksData;
  const { officerWorkloadDistribution } = officersData;

  // Calculate statistics
  const stats = useMemo(() => {
    const totalTasks = dashboard.overview.totalTasks;
    const completedTasks = dashboard.overview.completedTasks;
    const inProgressTasks = dashboard.overview.inProgressTasks;
    const escalatedTasks = dashboard.overview.escalatedTasks;
    const pendingTasks = totalTasks - completedTasks - inProgressTasks;

    return {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      pending: pendingTasks,
      escalated: escalatedTasks,
      completionRate: ((completedTasks / totalTasks) * 100).toFixed(1)
    };
  }, [dashboard]);

  // Filter tasks based on search and filters
  const filteredTasks = useMemo(() => {
    let tasks = tasksInfo.tasks;
    
    if (filters.search) {
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.assignedTo.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    if (filters.department && filters.department !== 'all') {
      tasks = tasks.filter(task => task.department === filters.department);
    }
    
    if (filters.priority && filters.priority !== 'all') {
      tasks = tasks.filter(task => task.priority === filters.priority);
    }
    
    if (filters.status && filters.status !== 'all') {
      tasks = tasks.filter(task => task.status === filters.status);
    }
    
    if (filters.assignedTo && filters.assignedTo !== 'all') {
      tasks = tasks.filter(task => task.assignedTo === filters.assignedTo);
    }
    
    if (filters.region && filters.region !== 'all') {
      tasks = tasks.filter(task => task.region === filters.region);
    }
    
    return tasks;
  }, [tasksInfo.tasks, filters]);

  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    const departments = [...new Set(tasksInfo.tasks.map(task => task.department))];
    const officers = [...new Set(tasksInfo.tasks.map(task => task.assignedTo))];
    const regions = [...new Set(tasksInfo.tasks.map(task => task.region).filter(Boolean))];
    
    return { departments, officers, regions };
  }, [tasksInfo.tasks]);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const StatCard = ({ icon: Icon, title, value, change, color, trend }) => (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-lg border border-gray-100 dark:border-gray-700 min-h-[100px] sm:min-h-[120px]"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className={`p-2 sm:p-3 rounded-lg ${color}`}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
          </div>
          {change && (
            <div className={`flex items-center space-x-1 ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
              {trend === 'up' ? <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" /> : 
               trend === 'down' ? <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4" /> : 
               <Minus className="h-3 w-3 sm:h-4 sm:w-4" />}
              <span className="text-xs sm:text-sm font-medium">{change}</span>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
          <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 leading-tight">{title}</p>
        </div>
      </div>
    </motion.div>
  );

  const TaskCard = ({ task }) => {
    const priorityColors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };

    const statusColors = {
      'In Progress': 'bg-blue-100 text-blue-800',
      'Completed': 'bg-green-100 text-green-800',
      'Active': 'bg-orange-100 text-orange-800',
      'Pending': 'bg-gray-100 text-gray-800'
    };

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{task.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{task.description}</p>
          </div>
          <div className="flex space-x-1 ml-3">
            <button 
              onClick={() => handleTaskClick(task)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <Edit className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${priorityColors[task.priority]}`}>
            {task.priority.toUpperCase()}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[task.status]}`}>
            {task.status}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="font-medium text-gray-900 dark:text-white">{task.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">{task.assignedTo}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">{task.dueDate}</span>
            </div>
          </div>
          {task.region && (
            <div className="flex items-center space-x-2 mt-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{task.region}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const DepartmentPerformance = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Department Performance</h3>
      <div className="space-y-4">
        {taskManagement.departmentWiseBreakdown.map((dept, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white">{dept.department}</span>
                <span className="text-sm font-semibold text-green-600">{dept.efficiency}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{dept.tasksCompleted}/{dept.totalTasks} tasks</span>
                <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${(dept.tasksCompleted / dept.totalTasks) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const OfficerWorkload = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Officer Workload Distribution</h3>
      <div className="space-y-3">
        {officerWorkloadDistribution.map((officer, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {officer.officer.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{officer.officer}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {officer.completedTasks} completed, {officer.pendingTasks} pending
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {((officer.completedTasks / (officer.completedTasks + officer.pendingTasks)) * 100).toFixed(0)}%
              </div>
              <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-1">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ 
                    width: `${(officer.completedTasks / (officer.completedTasks + officer.pendingTasks)) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const UrgentTasksList = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Urgent Tasks</h3>
        <span className="bg-red-100 text-red-800 text-sm font-medium px-2 py-1 rounded-full">
          {taskManagement.urgencyBasedTasks.find(u => u.urgency === 'high')?.count || 0} High Priority
        </span>
      </div>
      <div className="space-y-3">
        {taskManagement.urgencyBasedTasks
          .find(u => u.urgency === 'high')
          ?.tasks.map((task, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{task.region} • {task.assignedTo}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-red-600">
                  {new Date(task.deadline).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  const AIInsights = () => (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-6 shadow-lg border border-purple-200 dark:border-purple-800">
      <div className="flex items-center space-x-2 mb-4">
        <Zap className="h-5 w-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Insights & Recommendations</h3>
      </div>
      <div className="space-y-3">
        {taskManagement.aiSuggestedActions.map((action, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-100 dark:border-purple-700">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-gray-900 dark:text-white">{action.task}</h4>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                action.urgency === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {action.urgency.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{action.recommendation}</p>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">ETA: {action.estimatedResolutionTime}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 dark:text-white leading-tight" style={{ 
                fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive, handwriting, serif',
                fontStyle: 'italic',
                letterSpacing: '0.5px'
              }}>
                Task Management Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed" style={{ 
                fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive, handwriting, serif',
                fontStyle: 'italic',
                letterSpacing: '0.3px'
              }}>
                Monitor, assign, and track all municipal tasks and grievances
              </p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <button className="flex items-center justify-center px-2 sm:px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm md:text-base">
                <Plus className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-2">New Task</span>
              </button>
              <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" title="Settings">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-4 sm:mb-6">
            <StatCard
              icon={Target}
              title="Total Tasks"
              value={stats.total}
              change={dashboard.overview.analytics.totalTasksChange}
              trend="up"
              color="bg-blue-500"
            />
            <StatCard
              icon={CheckCircle}
              title="Completed"
              value={stats.completed}
              change={dashboard.overview.analytics.completedTasksChange}
              trend="up"
              color="bg-green-500"
            />
            <StatCard
              icon={Activity}
              title="In Progress"
              value={stats.inProgress}
              change={dashboard.overview.analytics.inProgressTasksChange}
              trend="down"
              color="bg-orange-500"
            />
            <StatCard
              icon={Clock}
              title="Pending"
              value={stats.pending}
              change="+5%"
              trend="up"
              color="bg-gray-500"
            />
            <StatCard
              icon={AlertTriangle}
              title="Escalated"
              value={stats.escalated}
              change={dashboard.overview.analytics.escalatedTasksChange}
              trend="up"
              color="bg-red-500"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
          <div className="flex space-x-1 bg-white rounded-lg p-1 sm:p-2 shadow-sm border border-gray-200 w-full">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'tasks', label: 'All Tasks', icon: Target },
              { key: 'kanban', label: 'Kanban', icon: Grid3X3 },
              { key: 'analytics', label: 'Analytics', icon: TrendingUp },
              { key: 'calendar', label: 'Calendar', icon: Calendar },
              { key: 'officers', label: 'Officers', icon: Users }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center px-2 sm:px-3 md:px-4 py-2 sm:py-3 rounded-md transition-colors flex-1 ${
                  activeTab === tab.key
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title={tab.label}
              >
                <tab.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="hidden lg:inline text-xs sm:text-sm font-medium ml-2">{tab.label}</span>
              </button>
            ))}
          </div>

          {(activeTab === 'tasks' || activeTab === 'kanban') && (
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex items-center space-x-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-black text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  title="Grid View"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-black text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Task Status Tabs - Only show on kanban tab */}
        {activeTab === 'kanban' && (
          <div className="lg:hidden mb-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Task Board</h2>
              <p className="text-sm text-gray-600">Tap on any button below to view tasks by status</p>
            </div>
          {/* Tab Headers */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setMobileActiveTab('alldepartments')}
              className={`flex flex-col items-center p-4 rounded-lg border-2 transition-colors ${
                mobileActiveTab === 'alldepartments' 
                  ? 'bg-purple-50 border-purple-200 text-purple-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm font-medium">All Departments</div>
              <div className="text-xs text-gray-500">Total tasks</div>
            </button>
            
            <button
              onClick={() => setMobileActiveTab('pending')}
              className={`flex flex-col items-center p-4 rounded-lg border-2 transition-colors ${
                mobileActiveTab === 'pending' 
                  ? 'bg-red-50 border-red-200 text-red-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="text-2xl font-bold">{stats.pending}</div>
              <div className="text-sm font-medium">Pending</div>
              <div className="text-xs text-gray-500">No tasks in pending</div>
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setMobileActiveTab('inprogress')}
              className={`flex flex-col items-center p-4 rounded-lg border-2 transition-colors ${
                mobileActiveTab === 'inprogress' 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="text-2xl font-bold">{stats.inProgress}</div>
              <div className="text-sm font-medium">In Progress</div>
              <div className="text-xs text-gray-500">Active tasks</div>
            </button>
            
            <button
              onClick={() => setMobileActiveTab('completed')}
              className={`flex flex-col items-center p-4 rounded-lg border-2 transition-colors ${
                mobileActiveTab === 'completed' 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="text-2xl font-bold">{stats.completed}</div>
              <div className="text-sm font-medium">Completed</div>
              <div className="text-xs text-gray-500">Finished tasks</div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 min-h-[400px] max-h-[500px] overflow-y-auto">
            {mobileActiveTab === 'alldepartments' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">All Departments Overview</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
                    <div className="text-sm text-purple-700">Total Tasks</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                    <div className="text-sm text-blue-700">In Progress</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                    <div className="text-sm text-green-700">Completed</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600">{stats.escalated}</div>
                    <div className="text-sm text-red-700">Escalated</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {filteredTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          <p className="text-sm text-gray-600">{task.department} • {task.assignedTo}</p>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{task.progress}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredTasks.length > 5 && (
                    <div className="text-center text-sm text-gray-500">
                      +{filteredTasks.length - 5} more tasks
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {mobileActiveTab === 'pending' && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Tasks</h3>
                <p className="text-gray-600 text-sm">All tasks are either in progress or completed</p>
              </div>
            )}
            
            {mobileActiveTab === 'inprogress' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">In Progress Tasks ({stats.inProgress})</h3>
                <div className="space-y-3">
                  {filteredTasks.filter(task => task.status === 'In Progress').slice(0, 5).map((task) => (
                    <div key={task.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          <p className="text-sm text-gray-600">{task.department} • {task.assignedTo}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-20 bg-blue-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-blue-600 font-medium">{task.progress}%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">{task.dueDate}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredTasks.filter(task => task.status === 'In Progress').length > 5 && (
                    <div className="text-center text-sm text-gray-500">
                      +{filteredTasks.filter(task => task.status === 'In Progress').length - 5} more tasks
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {mobileActiveTab === 'completed' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Completed Tasks ({stats.completed})</h3>
                <div className="space-y-3">
                  {filteredTasks.filter(task => task.status === 'Completed').map((task) => (
                    <div key={task.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          <p className="text-sm text-gray-600">{task.department} • {task.assignedTo}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">100%</div>
                          <div className="text-xs text-gray-500">{task.dueDate}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Task Filters */}
        {(activeTab === 'tasks' || activeTab === 'kanban') && (
          <TaskFilters
            onFilterChange={setFilters}
            departments={filterOptions.departments}
            officers={filterOptions.officers}
            regions={filterOptions.regions}
          />
        )}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <div className="space-y-6">
                <UrgentTasksList />
                <AIInsights />
              </div>
              <div className="space-y-6">
                <DepartmentPerformance />
                <OfficerWorkload />
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {filteredTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
              
              {viewMode === 'list' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Task</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priority</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Assigned To</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Due Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Progress</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredTasks.map((task) => (
                          <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{task.description}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {task.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {task.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {task.assignedTo}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {new Date(task.dueDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${task.progress}%` }}></div>
                                </div>
                                <span className="text-sm text-gray-900 dark:text-white">{task.progress}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => handleTaskClick(task)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button className="text-green-600 hover:text-green-900">
                                  <Edit className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'kanban' && (
            <motion.div
              key="kanban"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TaskKanbanBoard tasks={filteredTasks} />
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TaskAnalyticsChart 
                departmentData={taskManagement.departmentWiseBreakdown}
                officerData={officerWorkloadDistribution}
              />
            </motion.div>
          )}

          {activeTab === 'calendar' && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Task Calendar</h3>
              <div className="space-y-4">
                {dashboard.calendar.events.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{event.event}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{event.assignedTo}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                      {event.region && (
                        <p className="text-xs text-gray-500">{event.region}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'officers' && (
            <motion.div
              key="officers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <OfficerWorkload />
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Officer Performance</h3>
                <div className="space-y-4">
                  {dashboard.assignedOfficers.map((officer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {officer.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{officer.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{officer.department}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">{officer.taskCompletionRate}</p>
                        <p className="text-xs text-gray-500">
                          {officer.activeTasks} active, {officer.completedTasks} completed
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task Detail Modal */}
        <TaskDetailModal
          task={selectedTask}
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTask(null);
          }}
        />
      </div>
    </div>
  );
};

export default EnhancedTaskManagement;
