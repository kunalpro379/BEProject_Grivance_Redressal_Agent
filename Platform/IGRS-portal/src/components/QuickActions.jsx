import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, AlertCircle, Clock, ListTodo } from 'lucide-react';

const QuickActions = () => {
  const actions = [
    {
      icon: PieChart,
      label: 'Analysis',
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => console.log('Analysis clicked')
    },
    {
      icon: AlertCircle,
      label: 'Alerts',
      color: 'bg-red-500 hover:bg-red-600',
      onClick: () => console.log('Alerts clicked')
    },
    {
      icon: Clock,
      label: 'Timeline',
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => console.log('Timeline clicked')
    },
    {
      icon: ListTodo,
      label: 'Tasks',
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => console.log('Tasks clicked')
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {actions.map((action) => (
        <motion.button
          key={action.label}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
          className={`${action.color} text-white p-4 rounded-lg flex items-center gap-3 
            shadow-lg transition-colors duration-200`}
        >
          <action.icon className="h-6 w-6" />
          <span className="font-medium">{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default QuickActions;
