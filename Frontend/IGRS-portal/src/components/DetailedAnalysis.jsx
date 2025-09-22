import React from 'react';
import { motion } from 'framer-motion';

const DetailedAnalysis = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-lg"
    >
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
        Detailed Analysis
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Add your detailed analysis content here */}
        <div className="h-[400px] bg-gray-100 dark:bg-dark-bg-secondary rounded-lg animate-pulse"></div>
        <div className="h-[400px] bg-gray-100 dark:bg-dark-bg-secondary rounded-lg animate-pulse"></div>
      </div>
    </motion.div>
  );
};

export default DetailedAnalysis;
