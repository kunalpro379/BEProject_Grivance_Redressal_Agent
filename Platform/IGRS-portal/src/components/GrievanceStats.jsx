import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock, BarChart2 } from 'lucide-react';

const GrievanceStats = ({ data }) => {
  const cards = [
    {
      title: 'Total Cases',
      value: data.total,
      icon: BarChart2,
      color: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-500',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      title: 'Resolved',
      value: data.resolved,
      icon: CheckCircle2,
      color: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-500',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      title: 'Pending',
      value: data.pending,
      icon: Clock,
      color: 'bg-yellow-50 dark:bg-yellow-900/20',
      iconColor: 'text-yellow-500',
      borderColor: 'border-yellow-200 dark:border-yellow-800'
    },
    {
      title: 'Critical',
      value: data.critical,
      icon: AlertCircle,
      color: 'bg-red-50 dark:bg-red-900/20',
      iconColor: 'text-red-500',
      borderColor: 'border-red-200 dark:border-red-800'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <motion.div
          key={card.title}
          whileHover={{ scale: 1.02 }}
          className={`p-6 rounded-xl border ${card.color.replace(' dark:bg-*-900/20','')} ${card.borderColor.split(' ')[0]} backdrop-blur-sm 
            shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_15px_35px_rgba(0,0,0,0.08)] ring-1 ring-gray-100`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {card.title}
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {card.value}
              </p>
            </div>
            <card.icon className={`h-8 w-8 ${card.iconColor}`} />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default GrievanceStats;

