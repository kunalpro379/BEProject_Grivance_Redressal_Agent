import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Star } from 'lucide-react';

const ComparativeMetrics = ({ data = { averageResponseTime: {}, citizenSatisfaction: {} } }) => {
  return (
    <motion.div
      className="p-6 rounded-xl bg-white border border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.06)] ring-1 ring-gray-100"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Department Comparison
      </h3>
      
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Clock size={16} />
            Average Response Time (days)
          </h4>
          <div className="mt-2 space-y-2">
            {Object.entries(data.averageResponseTime || {}).map(([dept, time]) => (
              <div key={dept} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-sm text-gray-600">{dept}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full"
                      style={{ width: `${(time / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {time}d
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Star size={16} />
            Citizen Satisfaction Score
          </h4>
          <div className="mt-2 space-y-2">
            {Object.entries(data.citizenSatisfaction || {}).map(([dept, score]) => (
              <div key={dept} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-sm text-gray-600">{dept}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full"
                      style={{ width: `${(score / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ComparativeMetrics;
