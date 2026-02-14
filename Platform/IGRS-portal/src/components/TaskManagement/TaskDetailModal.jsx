import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, MapPin, User, Clock, AlertTriangle, 
  CheckCircle, Activity, MessageSquare, Paperclip,
  Phone, Mail, Building, TrendingUp, Flag
} from 'lucide-react';

const TaskDetailModal = ({ task, isOpen, onClose }) => {
  if (!task) return null;

  const priorityColors = {
    high: 'bg-red-500 text-white',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-green-500 text-white'
  };

  const statusColors = {
    'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
    'Completed': 'bg-green-100 text-green-800 border-green-200',
    'Active': 'bg-orange-100 text-orange-800 border-orange-200',
    'Pending': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const mockComments = [
    {
      id: 1,
      author: 'System',
      message: 'Task assigned to ' + task.assignedTo,
      timestamp: '2 hours ago',
      type: 'system'
    },
    {
      id: 2,
      author: task.assignedTo,
      message: 'Started working on this task. Initial assessment completed.',
      timestamp: '1 hour ago',
      type: 'update'
    }
  ];

  const mockAttachments = [
    {
      id: 1,
      name: 'site_inspection.jpg',
      size: '2.4 MB',
      type: 'image'
    },
    {
      id: 2,
      name: 'progress_report.pdf',
      size: '1.1 MB',
      type: 'document'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={onClose}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="inline-block w-full max-w-4xl my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${priorityColors[task.priority]}`}>
                    <Flag className="h-4 w-4 inline mr-1" />
                    {task.priority.toUpperCase()}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[task.status]}`}>
                    {task.status}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex flex-col lg:flex-row">
                {/* Main Content */}
                <div className="flex-1 p-6">
                  <div className="space-y-6">
                    {/* Task Title & Description */}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {task.title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        {task.description}
                      </p>
                    </div>

                    {/* Task Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <User className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned To</p>
                            <p className="text-gray-900 dark:text-white">{task.assignedTo}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <Building className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Department</p>
                            <p className="text-gray-900 dark:text-white">{task.department}</p>
                          </div>
                        </div>

                        {task.region && (
                          <div className="flex items-center space-x-3">
                            <MapPin className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Region</p>
                              <p className="text-gray-900 dark:text-white">{task.region}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</p>
                            <p className="text-gray-900 dark:text-white">
                              {new Date(task.dueDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Clock className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</p>
                            <p className="text-gray-900 dark:text-white">2 days ago</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Section */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Progress</h3>
                        <span className="text-2xl font-bold text-blue-600">{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
                        />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Task is {task.progress}% complete
                      </p>
                    </div>

                    {/* Attachments */}
                    {mockAttachments.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                          <Paperclip className="h-5 w-5 inline mr-2" />
                          Attachments ({mockAttachments.length})
                        </h3>
                        <div className="space-y-2">
                          {mockAttachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                  <Paperclip className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {attachment.name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {attachment.size}
                                  </p>
                                </div>
                              </div>
                              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="w-full lg:w-80 bg-gray-50 dark:bg-gray-700 p-6 space-y-6">
                  {/* Quick Actions */}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h3>
                    <div className="space-y-2">
                      <button className="w-full flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Activity className="h-4 w-4" />
                        <span>Update Status</span>
                      </button>
                      <button className="w-full flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <CheckCircle className="h-4 w-4" />
                        <span>Mark Complete</span>
                      </button>
                      <button className="w-full flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Escalate</span>
                      </button>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Contact Officer</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {task.assignedTo.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{task.assignedTo}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{task.department}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                          <Phone className="h-4 w-4" />
                          <span>Call</span>
                        </button>
                        <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          <Mail className="h-4 w-4" />
                          <span>Email</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      <MessageSquare className="h-5 w-5 inline mr-2" />
                      Recent Activity
                    </h3>
                    <div className="space-y-3">
                      {mockComments.map((comment) => (
                        <div key={comment.id} className="bg-white dark:bg-gray-800 rounded-lg p-3">
                          <div className="flex items-start space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                              comment.type === 'system' ? 'bg-gray-500 text-white' : 'bg-blue-500 text-white'
                            }`}>
                              {comment.author.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {comment.author}
                                </p>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {comment.timestamp}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {comment.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add Comment */}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Add Comment</h3>
                    <div className="space-y-3">
                      <textarea
                        placeholder="Add a comment or update..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={3}
                      />
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Post Comment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskDetailModal;
