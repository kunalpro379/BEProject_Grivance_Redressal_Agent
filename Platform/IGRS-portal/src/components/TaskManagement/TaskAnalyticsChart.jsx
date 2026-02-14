import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, TrendingUp, TrendingDown, Activity, 
  Users, Clock, Target, AlertTriangle 
} from 'lucide-react';

const TaskAnalyticsChart = ({ departmentData = [], officerData = [] }) => {
  const chartVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const DepartmentChart = () => (
    <motion.div 
      variants={chartVariants}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Department Performance</h3>
        <BarChart3 className="h-5 w-5 text-gray-500" />
      </div>
      
      <div className="space-y-4">
        {departmentData.map((dept, index) => {
          const completionRate = (dept.tasksCompleted / dept.totalTasks) * 100;
          const isHighPerforming = completionRate >= 85;
          
          return (
            <div key={index} className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900 dark:text-white">{dept.department}</span>
                  {isHighPerforming && (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-green-600">{dept.efficiency}</span>
                  <div className="text-xs text-gray-500">
                    {dept.tasksCompleted}/{dept.totalTasks}
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    className={`h-3 rounded-full ${
                      completionRate >= 90 ? 'bg-green-500' :
                      completionRate >= 80 ? 'bg-blue-500' :
                      completionRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-white mix-blend-difference">
                    {completionRate.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  const OfficerWorkloadChart = () => (
    <motion.div 
      variants={chartVariants}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Officer Workload</h3>
        <Users className="h-5 w-5 text-gray-500" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {officerData.map((officer, index) => {
          const totalTasks = officer.completedTasks + officer.pendingTasks;
          const completionRate = (officer.completedTasks / totalTasks) * 100;
          const workloadLevel = totalTasks > 60 ? 'high' : totalTasks > 40 ? 'medium' : 'low';
          
          return (
            <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {officer.officer.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    {officer.officer}
                  </h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{totalTasks} total tasks</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      workloadLevel === 'high' ? 'bg-red-100 text-red-700' :
                      workloadLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {workloadLevel} load
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Completed</span>
                  <span className="font-medium text-green-600">{officer.completedTasks}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Pending</span>
                  <span className="font-medium text-orange-600">{officer.pendingTasks}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    className="bg-blue-500 h-2 rounded-full"
                  />
                </div>
                <div className="text-center text-xs text-gray-500">
                  {completionRate.toFixed(0)}% completion rate
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  const TaskMetrics = () => {
    const totalCompleted = departmentData.reduce((sum, dept) => sum + dept.tasksCompleted, 0);
    const totalTasks = departmentData.reduce((sum, dept) => sum + dept.totalTasks, 0);
    const averageEfficiency = departmentData.reduce((sum, dept) => 
      sum + parseFloat(dept.efficiency.replace('%', '')), 0
    ) / departmentData.length;

    const metrics = [
      {
        icon: Target,
        label: 'Total Tasks',
        value: totalTasks,
        color: 'bg-blue-500',
        change: '+12%'
      },
      {
        icon: Activity,
        label: 'Completed',
        value: totalCompleted,
        color: 'bg-green-500',
        change: '+8%'
      },
      {
        icon: Clock,
        label: 'Pending',
        value: totalTasks - totalCompleted,
        color: 'bg-orange-500',
        change: '-3%'
      },
      {
        icon: TrendingUp,
        label: 'Avg Efficiency',
        value: `${averageEfficiency.toFixed(1)}%`,
        color: 'bg-purple-500',
        change: '+5%'
      }
    ];

    return (
      <motion.div 
        variants={chartVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-lg ${metric.color}`}>
                  <metric.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {metric.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metric.value}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">{metric.change}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    );
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <TaskMetrics />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DepartmentChart />
        <OfficerWorkloadChart />
      </div>
    </motion.div>
  );
};

export default TaskAnalyticsChart;
