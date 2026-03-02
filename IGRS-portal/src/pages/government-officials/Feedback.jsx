import React, { useState } from 'react';
import feedbackData from '../../data/officials/feedbacks.json';

function Feedback() {
  const [activeTab, setActiveTab] = useState('Drainage Issues');
  const [showMoreCategories, setShowMoreCategories] = useState(false);

  // Get unique categories from the feedback data
  const categories = [...new Set(feedbackData.grievances.map(item => item.category))];

  // Get feedbacks for the active category
  const getActiveCategoryData = () => {
    return feedbackData.grievances.find(item => item.category === activeTab);
  };

  const activeCategoryData = getActiveCategoryData();

  // Get rating color
  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get rating background color
  const getRatingBgColor = (rating) => {
    if (rating >= 4) return 'bg-green-50 border-green-200';
    if (rating >= 3) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  // Format language display
  const formatLanguage = (language) => {
    if (!language) return '';
    return language.charAt(0).toUpperCase() + language.slice(1);
  };

  // Category → count map (LeetCode-style chips)
  const getCategoryCounts = () => {
    const counts = {};
    for (const g of feedbackData.grievances) {
      counts[g.category] = g.feedbacks?.length || 0;
    }
    return counts;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Citizen Feedback & AI Insights
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Comprehensive feedback analysis across all grievance categories
          </p>
        </div>

        {/* Category Chips (LeetCode-style) */}
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">Grievance Categories</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">Click a chip to filter</span>
            </div>
            
            {/* Desktop: Show all categories */}
            <div className="hidden sm:flex flex-wrap gap-2">
              {categories.map((category) => {
                const count = getCategoryCounts()[category] || 0;
                const active = activeTab === category;
                return (
                  <button
                    type="button"
                    key={category}
                    onClick={() => setActiveTab(category)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {category}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      active ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Mobile: Show only 3 categories + dropdown */}
            <div className="sm:hidden">
              <div className="flex flex-wrap gap-2 mb-3">
                {categories.slice(0, 3).map((category) => {
                  const count = getCategoryCounts()[category] || 0;
                  const active = activeTab === category;
                  return (
                    <button
                      type="button"
                      key={category}
                      onClick={() => setActiveTab(category)}
                      className={`inline-flex items-center gap-2 px-2 py-1.5 rounded-full border text-xs transition-colors ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {category}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        active ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
                
                {/* Show More Dropdown */}
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setActiveTab(e.target.value);
                    }
                  }}
                  className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">More Categories</option>
                  {categories.slice(3).map((category) => (
                    <option key={category} value={category}>
                      {category} ({getCategoryCounts()[category] || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Active Tab Content */}
        {activeCategoryData && (
          <div className="space-y-6">
            {/* Category Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {activeTab} - Summary
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    AI Insight
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {activeCategoryData.summary.aiInsight}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Recommendation
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {activeCategoryData.summary.suggestion}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Total Feedbacks: {activeCategoryData.feedbacks.length}</span>
                  <span>
                    Average Rating: {' '}
                    <span className="font-medium">
                      {(activeCategoryData.feedbacks.reduce((sum, f) => sum + f.rating, 0) / activeCategoryData.feedbacks.length).toFixed(1)}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Feedbacks Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeCategoryData.feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-200"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        ID: {feedback.id}
                      </span>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getRatingBgColor(feedback.rating)}`}>
                        <div className="flex items-center space-x-1">
                          <span className={getRatingColor(feedback.rating)}>
                            {'★'.repeat(feedback.rating)}{'☆'.repeat(5 - feedback.rating)}
                          </span>
                          <span className={getRatingColor(feedback.rating)}>
                            {feedback.rating}/5
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {feedback.userName}
                      </span>
                      {feedback.language && (
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                          {formatLanguage(feedback.language)}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {feedback.region}
                    </p>
                  </div>

                  {/* Card Body */}
                  <div className="p-4">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Citizen Remark
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                        {feedback.remark}
                      </p>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">
                        AI Suggestion
                      </h4>
                      <p className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                        {feedback.aiSuggestion}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Received on: {new Date(feedback.receivedOn).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Statistics Footer */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {activeTab} - Statistics
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map(rating => {
                  const count = activeCategoryData.feedbacks.filter(f => f.rating === rating).length;
                  const percentage = ((count / activeCategoryData.feedbacks.length) * 100).toFixed(1);
                  
                  return (
                    <div key={rating} className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {count}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {rating} Star{rating !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {percentage}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Feedback;