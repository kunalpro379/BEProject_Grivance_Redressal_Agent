import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Calendar, FolderKanban, BarChart3 } from 'lucide-react';
import TaskStats from './TaskStats';
import UrgentTasks from './UrgentTasks';
import AssignedOfficers from './AssignedOfficers';

const TabButton = ({ active, icon: Icon, label, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
      active
        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span className="hidden sm:inline">{label}</span>
  </motion.button>
);

const TaskOverview = () => {
  const [activeView, setActiveView] = useState('overview');
  
  const views = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'resources', label: 'Resources', icon: FolderKanban },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 grid grid-cols-1 gap-4"
            >
              <TaskStats />
              <div className="col-span-2">
                <UrgentTasks />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <AssignedOfficers />
            </motion.div>
          </div>
        );
      case 'calendar':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {/* Add your Calendar component here */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <h2 className="text-xl font-semibold">Calendar View</h2>
              {/* Calendar content */}
            </div>
          </motion.div>
        );
      case 'resources':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {/* Add your Resources component here */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <h2 className="text-xl font-semibold">Resources</h2>
              {/* Resources content */}
            </div>
          </motion.div>
        );
      case 'analytics':
        return (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {/* Add your Analytics component here */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <h2 className="text-xl font-semibold">Analytics</h2>
              <TaskStats />
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 p-2 rounded-lg shadow-sm">
        <div className="flex items-center justify-start gap-2 overflow-x-auto no-scrollbar">
          {views.map((view) => (
            <TabButton
              key={view.id}
              active={activeView === view.id}
              icon={view.icon}
              label={view.label}
              onClick={() => setActiveView(view.id)}
            />
          ))}
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TaskOverview;
