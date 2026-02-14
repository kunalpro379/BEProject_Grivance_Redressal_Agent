import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell } from 'lucide-react';

const NotificationPanel = ({ notifications, onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: '100%' }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: '100%' }}
        className="fixed right-4 top-20 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
      >
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary-500" />
            <h3 className="font-semibold dark:text-gray-100">Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {notifications.map((notification, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                !notification.read ? 'bg-primary-50 dark:bg-primary-900/20' : ''
              }`}
            >
              <p className="text-sm dark:text-gray-200">{notification.message}</p>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(notification.timestamp).toLocaleString()}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black dark:bg-gray-900"
        onClick={onClose}
      />
    </AnimatePresence>
  );
};

export default NotificationPanel;
