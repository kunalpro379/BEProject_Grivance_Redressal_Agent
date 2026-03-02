import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Download, Clock, PieChartIcon, AlertTriangle } from 'lucide-react';
import RegionwiseTaskDensity from './RegionwiseTaskDensity';

const TaskAnalytics = () => {
  // Sample data for grievance analytics
  const departmentData = [
    { name: 'Water Supply', resolved: 156, pending: 89, total: 245 },
    { name: 'Electricity', resolved: 230, pending: 45, total: 275 },
    { name: 'Roads', resolved: 146, pending: 98, total: 244 },
    { name: 'Sanitation', resolved: 187, pending: 65, total: 252 },
    { name: 'Public Transport', resolved: 134, pending: 76, total: 210 },
  ];

  const monthlyTrends = [
    { month: 'Jan', complaints: 245 },
    { month: 'Feb', complaints: 312 },
    { month: 'Mar', complaints: 287 },
    { month: 'Apr', complaints: 356 },
    { month: 'May', complaints: 298 },
    { month: 'Jun', complaints: 267 },
  ];

  const statusDistribution = [
    { name: 'Resolved', value: 853, color: '#22c55e' },
    { name: 'In Progress', value: 234, color: '#eab308' },
    { name: 'Pending', value: 373, color: '#ef4444' },
  ];

  const resolutionTime = [
    { department: 'Water Supply', time: 72 },
    { department: 'Electricity', time: 48 },
    { department: 'Roads', time: 120 },
    { department: 'Sanitation', time: 96 },
    { department: 'Public Transport', time: 84 },
  ];

  const officerWorkload = [
    { name: 'Officer A', assigned: 45, completed: 38, pending: 7 },
    { name: 'Officer B', assigned: 52, completed: 41, pending: 11 },
    { name: 'Officer C', assigned: 38, completed: 35, pending: 3 },
    { name: 'Officer D', assigned: 61, completed: 48, pending: 13 },
    { name: 'Officer E', assigned: 43, completed: 39, pending: 4 },
  ];

  const regionDensity = [
    { region: 'Lucknow', complaints: 245, x: 80, y: 60 },
    { region: 'Kanpur', complaints: 198, x: 65, y: 55 },
    { region: 'Varanasi', complaints: 167, x: 90, y: 70 },
    { region: 'Agra', complaints: 212, x: 45, y: 40 },
    { region: 'Meerut', complaints: 156, x: 35, y: 30 },
  ];

  const aiSuggestions = [
    {
      id: 1,
      title: "High Priority Areas",
      description: "Concentrate resources in Lucknow and Agra where complaint volumes are 30% above average",
      impact: "Could reduce resolution time by 45%"
    },
    {
      id: 2,
      title: "Workload Balancing",
      description: "Redistribute 15 pending cases from Officer D to Officers C and E",
      impact: "Expected to improve resolution time by 25%"
    },
    {
      id: 3,
      title: "Resource Optimization",
      description: "Deploy 3 additional officers to water supply department during peak hours",
      impact: "Potential 40% reduction in pending cases"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Export Controls */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => {/* Export to Excel */}}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          <Download size={16} /> Export to Excel
        </button>
        <button
          onClick={() => {/* Export to PDF */}}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          <Download size={16} /> Export to PDF
        </button>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Officer Workload Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold mb-4">Officer Workload Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={officerWorkload}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#22c55e" name="Completed" />
              <Bar dataKey="pending" fill="#ef4444" name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Replace the ScatterChart with the new RegionwiseTaskDensity component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-lg lg:col-span-2"
        >
          <RegionwiseTaskDensity />
        </motion.div>

        {/* AI-Based Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-lg lg:col-span-2"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="text-yellow-500" />
            AI-Based Suggestions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-blue-600 mb-2">{suggestion.title}</h4>
                <p className="text-gray-600 mb-2">{suggestion.description}</p>
                <p className="text-sm text-green-600 font-medium">Impact: {suggestion.impact}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Department Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold mb-4">Department Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="resolved" fill="#22c55e" name="Resolved" />
              <Bar dataKey="pending" fill="#ef4444" name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Monthly Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold mb-4">Monthly Complaint Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="complaints" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Total Complaints" 
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold mb-4">Complaint Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Resolution Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold mb-4">Average Resolution Time (Hours)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={resolutionTime} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number"/>
              <YAxis dataKey="department" type="category" />
              <Tooltip />
              <Bar dataKey="time" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
};

export default TaskAnalytics;
