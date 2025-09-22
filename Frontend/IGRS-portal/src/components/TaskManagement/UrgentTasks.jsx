import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, User } from 'lucide-react';

const UrgentTasks = () => {
  const urgentTasks = [
    {
      id: 1,
      title: 'Water Supply Emergency',
      description: 'Critical water shortage in Sector 15',
      deadline: '2h remaining',
      assignee: 'John Doe'
    },
    {
      id: 2,
      title: 'Power Outage',
      description: 'Multiple areas affected in Gomti Nagar',
      deadline: '4h remaining',
      assignee: 'Sarah Smith'
    }
  ];

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="text-red-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Urgent Tasks
        </h2>
      </div>

      <div className="space-y-4">
        {urgentTasks.map((task) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg"
          >
            <h3 className="font-medium text-red-900 dark:text-red-100">
              {task.title}
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {task.description}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-red-600 dark:text-red-400">
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{task.deadline}</span>
              </div>
              <div className="flex items-center gap-1">
                <User size={14} />
                <span>{task.assignee}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default UrgentTasks;
