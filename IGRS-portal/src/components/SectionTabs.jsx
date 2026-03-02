import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, AlertTriangle, Clock, CheckSquare } from 'lucide-react';

const SectionTabs = ({ activeSection, onSectionChange }) => {
  const sections = [
    { id: 'analysis', label: 'Detailed Analysis', icon: PieChart },
    { id: 'alerts', label: 'Critical Alerts', icon: AlertTriangle },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'tasks', label: 'Task Management', icon: CheckSquare },
  ];

  return (
    <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
      {sections.map((section) => (
        <motion.button
          key={section.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSectionChange(section.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            activeSection === section.id
              ? 'bg-primary-500 text-white'
              : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-300'
          }`}
        >
          <section.icon size={18} />
          <span className="whitespace-nowrap">{section.label}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default SectionTabs;
