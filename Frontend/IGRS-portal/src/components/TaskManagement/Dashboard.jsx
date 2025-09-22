import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, Clock, Users, Target, AlertTriangle,
  BarChart2, Briefcase, TrendingUp, CheckCircle2
} from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
  >
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
      color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
      color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
      color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
      'bg-emerald-100 dark:bg-emerald-900/30'
    }`}>
      <Icon className={`w-6 h-6 ${
        color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
        color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
        color === 'green' ? 'text-green-600 dark:text-green-400' :
        'text-emerald-600 dark:text-emerald-400'
      }`} />
    </div>
    <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{label}</p>
  </motion.div>
);

const Dashboard = () => {
  const dashboardData = {
    totalGrievances: {
      total: 156,
      pending: 45,
      inProgress: 68,
      resolved: 43
    },
    urgentTasks: {
      high: 12,
      medium: 34,
      low: 22
    },
    departments: [
      { name: 'Water', tasks: 45, assigned: 38, efficiency: 84 },
      { name: 'Roads', tasks: 32, assigned: 28, efficiency: 78 },
      { name: 'Electricity', tasks: 28, assigned: 25, efficiency: 89 }
    ],
    resources: {
      employeesAssigned: 85,
      totalEmployees: 100,
      budgetAllocated: '₹45L',
      budgetUtilized: '₹32L'
    },
    aiSuggestions: [
      {
        id: 1,
        issue: "Water supply disruption in Sector 15",
        suggestion: "Based on historical data, similar issues were resolved by deploying emergency repair team within 4 hours",
        priority: "high",
        estimatedTime: "4-6 hours"
      },
      {
        id: 2,
        issue: "Road maintenance in Industrial Area",
        suggestion: "Previous successful resolutions involved coordinating with traffic department for alternative routes",
        priority: "medium",
        estimatedTime: "2-3 days"
      }
    ]
  };

  const stats = [
    { 
      label: 'Total Grievances',
      value: dashboardData.totalGrievances.total,
      icon: BarChart2,
      color: 'blue'
    },
    {
      label: 'Pending Tasks',
      value: dashboardData.totalGrievances.pending,
      icon: Clock,
      color: 'yellow'
    },
    {
      label: 'In Progress',
      value: dashboardData.totalGrievances.inProgress,
      icon: TrendingUp,
      color: 'green'
    },
    {
      label: 'Resolved',
      value: dashboardData.totalGrievances.resolved,
      icon: CheckCircle2,
      color: 'emerald'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority-Based Tasks */}
        <motion.div
          className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          whileHover={{ scale: 1.01 }}
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Urgency-Based Tasks
          </h2>
          <div className="space-y-4">
            {Object.entries(dashboardData.urgentTasks).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    priority === 'high' ? 'bg-red-500' :
                    priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <span className="text-gray-700 dark:text-gray-300 capitalize">{priority}</span>
                </div>
                <span className="text-gray-600 dark:text-gray-400">{count} tasks</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Resource Allocation */}
        <motion.div
          className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          whileHover={{ scale: 1.01 }}
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary-500" />
            Resource Allocation
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Staff Allocation</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {dashboardData.resources.employeesAssigned}/{dashboardData.resources.totalEmployees}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full"
                  style={{ width: `${(dashboardData.resources.employeesAssigned / dashboardData.resources.totalEmployees) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Budget Utilized</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {dashboardData.resources.budgetUtilized}/{dashboardData.resources.budgetAllocated}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: '71%' }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* AI Suggestions */}
        <motion.div
          className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          whileHover={{ scale: 1.01 }}
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            AI-Suggested Actions
          </h2>
          <div className="space-y-4">
            {dashboardData.aiSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {suggestion.issue}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    suggestion.priority === 'high'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                  }`}>
                    {suggestion.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {suggestion.suggestion}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <Clock size={12} />
                  {suggestion.estimatedTime}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Department Performance */}
      <motion.div
        className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        whileHover={{ scale: 1.01 }}
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary-500" />
          Department-Wise Task Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dashboardData.departments.map((dept) => (
            <div key={dept.name} className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-gray-700 dark:text-gray-300">{dept.name}</h3>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {dept.assigned}/{dept.tasks} tasks
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full"
                  style={{ width: `${(dept.assigned / dept.tasks) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Efficiency</span>
                <span className="text-gray-700 dark:text-gray-300">{dept.efficiency}%</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
