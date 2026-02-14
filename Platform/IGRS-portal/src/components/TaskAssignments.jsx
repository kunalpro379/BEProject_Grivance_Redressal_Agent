import React from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Clock, AlertCircle, User } from 'lucide-react';

const TaskAssignments = ({ tasks = [] }) => {
  return (
    <motion.div
      className="p-6 rounded-xl bg-white dark:bg-dark-card border border-gray-200 
        dark:border-dark-border shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text">
          Assigned Tasks
        </h3>
        <button className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-500">
          View All
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <motion.div
              key={task?.id || Math.random()}
              className="bg-gray-50 dark:bg-dark-hover p-4 rounded-lg border border-gray-200 dark:border-dark-border"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  task?.priority === 'high' 
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {task?.priority || 'Normal'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {task?.dueDate || 'No due date'}
                </span>
              </div>
              <h4 className="font-medium text-gray-700 dark:text-gray-200">
                {task?.title || 'Untitled Task'}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {task?.description || 'No description available'}
              </p>
              <div className="mt-3 flex items-center gap-2">
                {task?.assignee?.avatar ? (
                  <img 
                    src={task.assignee.avatar} 
                    alt={task.assignee.name}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <User className="w-6 h-6 text-gray-400" />
                )}
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {task?.assignee?.name || 'Unassigned'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default TaskAssignments;
