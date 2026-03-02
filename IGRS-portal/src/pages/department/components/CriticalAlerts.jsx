import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight } from 'lucide-react';

const CriticalAlerts = ({ alerts, onShowMore }) => {
  return (
    <motion.div
      className="p-6 rounded-xl bg-white border border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all duration-200 backdrop-blur-sm ring-1 ring-gray-100"
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <AlertCircle className="text-red-500" size={20} />
          Critical Alerts
        </h2>
        <motion.button
          whileHover={{ scale: 1.05, x: 5 }}
          whileTap={{ scale: 0.95 }}
          onClick={onShowMore}
          className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
        >
          Show Alerts <ArrowRight size={16} />
        </motion.button>
      </div>
      <div className="space-y-4">
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            className="p-4 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-colors duration-200 cursor-pointer"
            whileHover={{ x: 4 }}
          >
            <h3 className="font-medium text-red-800">
              {alert.title}
            </h3>
            <p className="text-sm text-red-600 mt-1">
              {alert.description}
            </p>
            <span className="text-xs text-red-500 mt-2 block">
              {alert.timeAgo}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default CriticalAlerts;
