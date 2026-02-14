import React from 'react';
import { motion } from 'framer-motion';

const DepartmentPerformance = ({ data = [] }) => {
  if (!Array.isArray(data)) {
    console.error('DepartmentPerformance: data prop must be an array');
    return null;
  }

  return (
    <motion.div
      className="p-6 rounded-xl bg-white dark:bg-dark-card border border-gray-200 
        dark:border-dark-border shadow-lg transition-all duration-200 backdrop-blur-sm"
      whileHover={{ scale: 1.01 }}
    >
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
        Department Performance
      </h2>
      <div className="space-y-4">
        {data.map((dept) => (
          <div key={dept.name} className="relative">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {dept.name}
              </span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {dept.efficiency}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-dark-bg-secondary rounded-full h-2.5">
              <div
                className="bg-primary-600 dark:bg-primary-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${dept.efficiency}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default DepartmentPerformance;
