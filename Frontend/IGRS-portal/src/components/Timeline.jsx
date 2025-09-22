import React from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  FileText,
  MessageCircle,
  Send,
  Settings,
  RefreshCw
} from 'lucide-react';

const Timeline = ({ data, onShowMore }) => {
  const timelineSteps = [
    {
      id: 1,
      title: 'Grievance Filed',
      description: 'Citizen submitted complaint regarding water supply',
      date: '2024-02-20',
      status: 'completed',
      icon: FileText,
      color: 'text-blue-500',
      dotColor: 'bg-blue-500',
      department: 'Water Department',
      assignedTo: 'John Doe'
    },
    {
      id: 2,
      title: 'Initial Assessment',
      description: 'Complaint categorized and priority assigned',
      date: '2024-02-21',
      status: 'completed',
      icon: Settings,
      color: 'text-green-500',
      dotColor: 'bg-green-500',
      department: 'Assessment Team',
      assignedTo: 'Sarah Smith'
    },
    {
      id: 3,
      title: 'Investigation',
      description: 'Field team dispatched for on-site inspection',
      date: '2024-02-22',
      status: 'in-progress',
      icon: User,
      color: 'text-yellow-500',
      dotColor: 'bg-yellow-500',
      department: 'Field Operations',
      assignedTo: 'Mike Johnson'
    },
    {
      id: 4,
      title: 'Resolution in Progress',
      description: 'Repair work scheduled',
      date: '2024-02-23',
      status: 'pending',
      icon: RefreshCw,
      color: 'text-purple-500',
      dotColor: 'bg-purple-500',
      department: 'Maintenance Team',
      assignedTo: 'Technical Team A'
    }
  ];

  return (
    <motion.div className="p-3 sm:p-6 rounded-xl bg-white border border-gray-200 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Clock size={18} className="sm:w-5 sm:h-5" />
          Resolution Timeline
        </h2>
        {onShowMore && (
          <motion.button
            whileHover={{ scale: 1.05, x: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={onShowMore}
            className="flex items-center gap-2 text-xs sm:text-sm text-blue-600 hover:text-blue-700 self-start sm:self-auto"
          >
            View All <ArrowRight size={14} className="sm:w-4 sm:h-4" />
          </motion.button>
        )}
      </div>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-[18px] sm:left-[21px] top-4 h-full w-[2px] bg-gradient-to-b from-blue-200 via-green-200 to-purple-200" />

        {/* Timeline Items */}
        <div className="space-y-4 sm:space-y-8">
          {timelineSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex gap-2 sm:gap-4"
            >
              {/* Timeline Dot */}
              <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full border-2 sm:border-4 border-white ${step.dotColor} 
                flex items-center justify-center shrink-0 z-10 shadow-lg`}>
                <step.icon size={16} className="sm:w-5 sm:h-5 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{step.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">{step.description}</p>
                    </div>
                    <span className={`px-2 sm:px-3 py-1 text-xs rounded-full font-medium self-start ${
                      step.status === 'completed' ? 'bg-green-100 text-green-800 border border-green-200' :
                      step.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                      'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      {step.status}
                    </span>
                  </div>

                  <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User size={12} className="sm:w-3.5 sm:h-3.5 text-blue-500" />
                      <span className="font-medium truncate">{step.assignedTo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle size={12} className="sm:w-3.5 sm:h-3.5 text-green-500" />
                      <span className="font-medium truncate">{step.department}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="sm:w-3.5 sm:h-3.5 text-purple-500" />
                      <span className="font-medium">{step.date}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-xs flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    <MessageCircle size={10} className="sm:w-3 sm:h-3" />
                    <span className="hidden sm:inline">Add Comment</span>
                    <span className="sm:hidden">Comment</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-xs flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
                  >
                    <Send size={10} className="sm:w-3 sm:h-3" />
                    <span className="hidden sm:inline">Forward</span>
                    <span className="sm:hidden">Forward</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Timeline;
