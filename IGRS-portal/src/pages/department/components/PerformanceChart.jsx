import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowRight } from 'lucide-react';
import graphData from '../../../data/graph.json';

const PerformanceChart = ({ data, onShowMore }) => {
  // Normalize data source: prioritize graph.json data
  const chartData = useMemo(() => {
    if (graphData?.monthlyProgress) {
      return graphData.monthlyProgress.map(item => ({
        month: item.month,
        grievances: item.totalGrievances,
        resolved: item.resolved
      }));
    }
    if (data?.monthlyTrend) {
      return data.monthlyTrend;
    }
    return [];
  }, [data]);
  return (
    <motion.div
      className="p-4 sm:p-6 rounded-xl bg-white border border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.06)] ring-1 ring-gray-100 h-[350px] sm:h-[400px] w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800">
          Monthly Progress
        </h3>
        <motion.button
          whileHover={{ scale: 1.05, x: 5 }}
          whileTap={{ scale: 0.95 }}
          onClick={onShowMore}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 mt-2 sm:mt-0"
        >
          Show Analysis <ArrowRight size={16} />
        </motion.button>
      </div>

      {/* Responsive Chart Container */}
      <div className="w-full h-[250px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #E5E7EB',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 20px rgba(0,0,0,0.08)'
              }}
            />
            <Legend />
            <Bar dataKey="grievances" fill="#3B82F6" name="Total Grievances" />
            <Bar dataKey="resolved" fill="#10B981" name="Resolved" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default PerformanceChart;
