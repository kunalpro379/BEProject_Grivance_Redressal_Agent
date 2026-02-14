import React from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle2 } from 'lucide-react';

const AssignedOfficers = () => {
  const officers = [
    {
      id: 1,
      name: 'John Doe',
      role: 'Water Department',
      activeTasks: 5,
      completedTasks: 12,
      efficiency: 92
    },
    {
      id: 2,
      name: 'Sarah Smith',
      role: 'Municipal Corporation',
      activeTasks: 3,
      completedTasks: 8,
      efficiency: 88
    },
    {
      id: 3,
      name: 'Mike Johnson',
      role: 'Electricity Department',
      activeTasks: 4,
      completedTasks: 15,
      efficiency: 95
    }
  ];

  return (
    <div className="bg-white dark:bg-black rounded-lg p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-6 ">
        <Users className="text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Assigned Officers
        </h2>
      </div>

      <div className="space-y-6">
        {officers.map((officer) => (
          <motion.div
            key={officer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {officer.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {officer.role}
                </p>
              </div>
              <div className="flex items-center gap-1 text-green-500">
                <CheckCircle2 size={16} />
                <span className="text-sm">{officer.efficiency}%</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Active Tasks</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {officer.activeTasks}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Completed</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {officer.completedTasks}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AssignedOfficers;
