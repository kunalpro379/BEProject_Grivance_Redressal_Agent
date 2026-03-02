import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, MoreHorizontal, Calendar, User, MapPin, 
  AlertTriangle, Clock, CheckCircle, Flag
} from 'lucide-react';

const TaskKanbanBoard = ({ tasks = [] }) => {
  const [draggedTask, setDraggedTask] = useState(null);

  const columns = [
    { id: 'Pending', title: 'Pending', color: 'bg-gray-100', count: 0 },
    { id: 'In Progress', title: 'In Progress', color: 'bg-blue-100', count: 0 },
    { id: 'Completed', title: 'Completed', color: 'bg-green-100', count: 0 }
  ];

  // Group tasks by status
  const groupedTasks = tasks.reduce((acc, task) => {
    const status = task.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {});

  // Update column counts
  columns.forEach(column => {
    column.count = groupedTasks[column.id]?.length || 0;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const TaskCard = ({ task }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-grab hover:shadow-md transition-shadow"
      draggable
      onDragStart={() => setDraggedTask(task)}
      onDragEnd={() => setDraggedTask(null)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {task.department}
          </span>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{task.title}</h3>
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>

      {task.progress !== undefined && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs font-medium text-gray-700">{task.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <User className="h-3 w-3" />
          <span className="truncate max-w-20">{task.assignedTo}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Calendar className="h-3 w-3" />
          <span>{new Date(task.dueDate).toLocaleDateString()}</span>
        </div>
      </div>

      {task.region && (
        <div className="flex items-center space-x-1 mt-2 text-xs text-gray-500">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{task.region}</span>
        </div>
      )}
    </motion.div>
  );

  const Column = ({ column }) => (
    <div className="flex-1 min-w-72 sm:min-w-80">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{column.title}</h3>
          <span className="bg-gray-200 text-gray-700 text-xs sm:text-sm px-2 py-1 rounded-full">
            {column.count}
          </span>
        </div>
        <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div 
        className={`${column.color} rounded-lg p-2 sm:p-3 min-h-80 sm:min-h-96 space-y-2 sm:space-y-3`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (draggedTask) {
            // Handle task status update here
            console.log(`Moving task ${draggedTask.id} to ${column.id}`);
          }
        }}
      >
        <AnimatePresence>
          {(groupedTasks[column.id] || []).map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </AnimatePresence>
        
        {column.count === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm font-medium">No tasks in {column.title.toLowerCase()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-6 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Task Board</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            <option>All Departments</option>
            <option>Water</option>
            <option>Roads</option>
            <option>Electricity</option>
            <option>Sanitation</option>
          </select>
          <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      <div className="flex space-x-3 sm:space-x-6 overflow-x-auto pb-4">
        {columns.map((column) => (
          <Column key={column.id} column={column} />
        ))}
      </div>
    </div>
  );
};

export default TaskKanbanBoard;
