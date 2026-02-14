import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Users, Brain, MapPin } from 'lucide-react';

const ResourceAllocation = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Workload Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-lg"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users size={20} />
          Officer Workload Distribution
        </h3>
        <div className="h-[300px]">
          <BarChart width={400} height={300} data={[]} >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="tasks" fill="#3B82F6" />
          </BarChart>
        </div>
      </motion.div>

      {/* AI Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-lg"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Brain size={20} />
          AI-Based Suggestions
        </h3>
        {/* Add AI suggestions content */}
      </motion.div>

      {/* Region-wise Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-2 bg-white dark:bg-dark-card rounded-lg p-6 shadow-lg"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin size={20} />
          Region-Wise Task Density
        </h3>
        {/* Add map visualization */}
      </motion.div>
    </div>
  );
};

export default ResourceAllocation;
