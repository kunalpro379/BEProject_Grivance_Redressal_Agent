import React from 'react';
import { Filter, Calendar } from 'lucide-react';

const GrievanceFilterBar = ({ filters, setFilters }) => {
  const departments = ['All', 'Water Department', 'Electricity', 'Roads', 'Sanitation'];
  const statuses = ['All', 'Pending', 'In Progress', 'Completed'];
  const priorities = ['All', 'High', 'Medium', 'Low'];

  return (
    <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Filter Icon */}
        <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-2 border border-blue-200">
          <Filter className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Filters</span>
        </div>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-300 
            bg-white text-gray-700
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            hover:border-gray-400 transition-colors"
        >
          {statuses.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-300 
            bg-white text-gray-700
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            hover:border-gray-400 transition-colors"
        >
          {priorities.map(priority => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>

        {/* Department Filter */}
        <select
          value={filters.department}
          onChange={(e) => setFilters({ ...filters, department: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-300 
            bg-white text-gray-700
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            hover:border-gray-400 transition-colors"
        >
          {departments.map(dept => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        {/* Date Range Filters */}
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="px-3 py-2 rounded-lg border border-gray-300 
              bg-white text-gray-700
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              hover:border-gray-400 transition-colors"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="px-3 py-2 rounded-lg border border-gray-300 
              bg-white text-gray-700
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              hover:border-gray-400 transition-colors"
          />
        </div>
      </div>
    </div>
  );
};

export default GrievanceFilterBar;
