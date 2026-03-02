import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Sparkles,
  Loader2,
  FileText,
  Users,
  BarChart3,
  ChevronRight,
  X
} from 'lucide-react';
import { grievanceService } from '../../services/grievance.service';

const WardGrievances = () => {
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  useEffect(() => {
    fetchWardGrievanceStats();
  }, []);

  const fetchWardGrievanceStats = async () => {
    try {
      setLoading(true);
      // Fetch all grievances and group by ward
      const response = await grievanceService.getGrievances({ all: 'true', limit: 1000 });
      const grievances = response.grievances || [];
      
      // Group grievances by ward
      const wardMap = new Map();
      
      grievances.forEach(grievance => {
        const wardId = grievance.ward_id || 'unassigned';
        const wardName = grievance.ward_name || grievance.ward_number || 'Unassigned Ward';
        
        if (!wardMap.has(wardId)) {
          wardMap.set(wardId, {
            id: wardId,
            name: wardName,
            total: 0,
            resolved: 0,
            pending: 0,
            inProgress: 0,
            rejected: 0,
            grievances: []
          });
        }
        
        const ward = wardMap.get(wardId);
        ward.total++;
        ward.grievances.push(grievance);
        
        const status = String(grievance.status || '').toLowerCase();
        if (status === 'resolved') {
          ward.resolved++;
        } else if (status === 'rejected') {
          ward.rejected++;
        } else if (status === 'in_progress' || status === 'assigned') {
          ward.inProgress++;
        } else {
          ward.pending++;
        }
      });
      
      // Convert map to array and sort by total grievances
      const wardsArray = Array.from(wardMap.values())
        .sort((a, b) => b.total - a.total);
      
      setWards(wardsArray);
      setError(null);
    } catch (err) {
      console.error('Error fetching ward grievance stats:', err);
      setError(err.message || 'Failed to load ward statistics');
    } finally {
      setLoading(false);
    }
  };

  const generateAISummary = async (ward) => {
    setSelectedWard(ward);
    setAiSummaryLoading(true);
    setAiSummary(null);
    
    try {
      // Analyze grievances for this ward
      const categories = {};
      const priorities = { high: 0, medium: 0, low: 0 };
      const departments = {};
      let avgResolutionTime = 0;
      let resolvedCount = 0;
      
      ward.grievances.forEach(g => {
        // Count categories
        const category = g.category || 'Uncategorized';
        categories[category] = (categories[category] || 0) + 1;
        
        // Count priorities
        const priority = String(g.priority || 'medium').toLowerCase();
        if (priorities.hasOwnProperty(priority)) {
          priorities[priority]++;
        }
        
        // Count departments
        const dept = g.department_name || 'Unassigned';
        departments[dept] = (departments[dept] || 0) + 1;
        
        // Calculate resolution time
        if (g.status === 'resolved' && g.resolved_at && g.created_at) {
          const resolutionTime = new Date(g.resolved_at) - new Date(g.created_at);
          avgResolutionTime += resolutionTime;
          resolvedCount++;
        }
      });
      
      if (resolvedCount > 0) {
        avgResolutionTime = avgResolutionTime / resolvedCount / (1000 * 60 * 60 * 24); // Convert to days
      }
      
      // Get top categories and departments
      const topCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      const topDepartments = Object.entries(departments)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      // Calculate performance metrics
      const resolutionRate = ward.total > 0 ? ((ward.resolved / ward.total) * 100).toFixed(1) : 0;
      const pendingRate = ward.total > 0 ? ((ward.pending / ward.total) * 100).toFixed(1) : 0;
      
      // Generate summary
      const summary = {
        overview: `${ward.name} has received ${ward.total} grievances in total. The ward has successfully resolved ${ward.resolved} cases (${resolutionRate}% resolution rate) with ${ward.pending} cases still pending (${pendingRate}%).`,
        performance: resolutionRate >= 70 
          ? `The ward is performing well with a ${resolutionRate}% resolution rate, indicating efficient grievance handling.`
          : resolutionRate >= 50
          ? `The ward shows moderate performance with a ${resolutionRate}% resolution rate. There is room for improvement in grievance resolution.`
          : `The ward needs attention with only ${resolutionRate}% of grievances resolved. Immediate action is recommended to improve response times.`,
        topCategories: topCategories.map(([cat, count]) => ({
          category: cat,
          count: count,
          percentage: ((count / ward.total) * 100).toFixed(1)
        })),
        topDepartments: topDepartments.map(([dept, count]) => ({
          department: dept,
          count: count,
          percentage: ((count / ward.total) * 100).toFixed(1)
        })),
        priorities: priorities,
        avgResolutionTime: resolvedCount > 0 ? avgResolutionTime.toFixed(1) : 'N/A',
        recommendations: generateRecommendations(ward, resolutionRate, priorities, topCategories)
      };
      
      setAiSummary(summary);
    } catch (err) {
      console.error('Error generating AI summary:', err);
      setAiSummary({ error: 'Failed to generate summary' });
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const generateRecommendations = (ward, resolutionRate, priorities, topCategories) => {
    const recommendations = [];
    
    if (resolutionRate < 50) {
      recommendations.push('Increase staffing or resources to handle pending grievances more efficiently.');
    }
    
    if (priorities.high > ward.total * 0.3) {
      recommendations.push('High number of high-priority cases detected. Consider implementing a fast-track resolution process.');
    }
    
    if (ward.pending > ward.resolved) {
      recommendations.push('Pending cases exceed resolved cases. Review workflow and identify bottlenecks.');
    }
    
    if (topCategories.length > 0 && topCategories[0][1] > ward.total * 0.4) {
      recommendations.push(`Focus on ${topCategories[0][0]} category which represents the majority of grievances.`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Continue maintaining current performance standards and monitor for any emerging issues.');
    }
    
    return recommendations;
  };

  const getPerformanceColor = (resolved, total) => {
    if (total === 0) return 'text-gray-500';
    const rate = (resolved / total) * 100;
    if (rate >= 70) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (resolved, total) => {
    if (total === 0) return { label: 'No Data', color: 'bg-gray-100 text-gray-700' };
    const rate = (resolved / total) * 100;
    if (rate >= 70) return { label: 'Excellent', color: 'bg-green-100 text-green-700' };
    if (rate >= 50) return { label: 'Good', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Needs Attention', color: 'bg-red-100 text-red-700' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF5E8]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37] mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading ward statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF5E8]">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg border-2 border-[#D4AF37]">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-black mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchWardGrievanceStats}
            className="px-6 py-2 bg-gradient-to-r from-black to-gray-900 text-white rounded-lg hover:shadow-xl transition-all border-2 border-[#D4AF37]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF5E8] p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-black mb-2">Ward Grievances Dashboard</h1>
        <p className="text-gray-600">Monitor and analyze grievances across all wards</p>
      </div>

      {/* Ward Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {wards.map((ward, index) => {
          const performanceBadge = getPerformanceBadge(ward.resolved, ward.total);
          const resolutionRate = ward.total > 0 ? ((ward.resolved / ward.total) * 100).toFixed(1) : 0;
          
          return (
            <motion.div
              key={ward.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-[#D4AF37] hover:-translate-y-1"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-black to-gray-900 p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#D4AF37] rounded-lg">
                      <MapPin className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{ward.name}</h3>
                      <p className="text-gray-300 text-sm">Ward ID: {ward.id.substring(0, 8)}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${performanceBadge.color}`}>
                    {performanceBadge.label}
                  </span>
                </div>
                
                {/* Total Grievances */}
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{ward.total}</span>
                  <span className="text-gray-300">Total Grievances</span>
                </div>
              </div>

              {/* Card Body - Statistics */}
              <div className="p-6 bg-gradient-to-br from-[#FFF8F0] to-white">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Resolved */}
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-[#D4AF37] shadow-sm">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-black">{ward.resolved}</p>
                      <p className="text-xs text-gray-600">Resolved</p>
                    </div>
                  </div>

                  {/* Pending */}
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-[#D4AF37] shadow-sm">
                    <Clock className="w-8 h-8 text-yellow-600" />
                    <div>
                      <p className="text-2xl font-bold text-black">{ward.pending}</p>
                      <p className="text-xs text-gray-600">Pending</p>
                    </div>
                  </div>

                  {/* In Progress */}
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-[#D4AF37] shadow-sm">
                    <TrendingUp className="w-8 h-8 text-[#D4AF37]" />
                    <div>
                      <p className="text-2xl font-bold text-black">{ward.inProgress}</p>
                      <p className="text-xs text-gray-600">In Progress</p>
                    </div>
                  </div>

                  {/* Rejected */}
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-[#D4AF37] shadow-sm">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                    <div>
                      <p className="text-2xl font-bold text-black">{ward.rejected}</p>
                      <p className="text-xs text-gray-600">Rejected</p>
                    </div>
                  </div>
                </div>

                {/* Resolution Rate Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-black">Resolution Rate</span>
                    <span className={`text-sm font-bold ${getPerformanceColor(ward.resolved, ward.total)}`}>
                      {resolutionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 border border-gray-300">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        resolutionRate >= 70 ? 'bg-green-600' :
                        resolutionRate >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${resolutionRate}%` }}
                    />
                  </div>
                </div>

                {/* AI Summary Button */}
                <button
                  onClick={() => generateAISummary(ward)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-black to-gray-900 text-white rounded-lg font-semibold hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md border-2 border-[#D4AF37]"
                >
                  <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                  Generate AI Summary
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* AI Summary Modal */}
      {selectedWard && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedWard(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-black to-gray-900 text-white p-6 rounded-t-2xl border-b-2 border-[#D4AF37]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-[#D4AF37]" />
                  <div>
                    <h2 className="text-2xl font-bold">AI Performance Summary</h2>
                    <p className="text-gray-300">{selectedWard.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedWard(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 bg-gradient-to-br from-[#FFF8F0] to-white">
              {aiSummaryLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37] mb-4" />
                  <p className="text-gray-600 font-medium">Analyzing ward performance...</p>
                  <p className="text-gray-400 text-sm mt-2">This may take a few moments</p>
                </div>
              ) : aiSummary?.error ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-gray-600">{aiSummary.error}</p>
                </div>
              ) : aiSummary ? (
                <div className="space-y-6">
                  {/* Overview */}
                  <div className="bg-white border-2 border-[#D4AF37] rounded-xl p-6 shadow-md">
                    <h3 className="text-lg font-bold text-black mb-3 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
                      Overview
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{aiSummary.overview}</p>
                  </div>

                  {/* Performance Analysis */}
                  <div className="bg-white border-2 border-[#D4AF37] rounded-xl p-6 shadow-md">
                    <h3 className="text-lg font-bold text-black mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                      Performance Analysis
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{aiSummary.performance}</p>
                    {aiSummary.avgResolutionTime !== 'N/A' && (
                      <div className="mt-4 p-4 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-lg border border-[#D4AF37]">
                        <p className="text-sm text-gray-600">Average Resolution Time</p>
                        <p className="text-2xl font-bold text-black">{aiSummary.avgResolutionTime} days</p>
                      </div>
                    )}
                  </div>

                  {/* Top Categories */}
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Top Grievance Categories
                    </h3>
                    <div className="space-y-3">
                      {aiSummary.topCategories.map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full font-bold text-sm">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-gray-900">{cat.category}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-purple-700">{cat.count} cases</p>
                            <p className="text-xs text-gray-500">{cat.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Departments */}
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Most Engaged Departments
                    </h3>
                    <div className="space-y-3">
                      {aiSummary.topDepartments.map((dept, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 bg-orange-600 text-white rounded-full font-bold text-sm">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-gray-900">{dept.department}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-orange-700">{dept.count} cases</p>
                            <p className="text-xs text-gray-500">{dept.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Categories */}
                  <div className="bg-white border-2 border-[#D4AF37] rounded-xl p-6 shadow-md">
                    <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#D4AF37]" />
                      Top Grievance Categories
                    </h3>
                    <div className="space-y-3">
                      {aiSummary.topCategories.map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-lg border border-[#D4AF37]">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 bg-black text-[#D4AF37] rounded-full font-bold text-sm">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-black">{cat.category}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-black">{cat.count} cases</p>
                            <p className="text-xs text-gray-500">{cat.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Departments */}
                  <div className="bg-white border-2 border-[#D4AF37] rounded-xl p-6 shadow-md">
                    <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#D4AF37]" />
                      Most Engaged Departments
                    </h3>
                    <div className="space-y-3">
                      {aiSummary.topDepartments.map((dept, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gradient-to-br from-[#FFF8F0] to-[#FFF5E8] rounded-lg border border-[#D4AF37]">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 bg-black text-[#D4AF37] rounded-full font-bold text-sm">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-black">{dept.department}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-black">{dept.count} cases</p>
                            <p className="text-xs text-gray-500">{dept.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Priority Distribution */}
                  <div className="bg-white border-2 border-[#D4AF37] rounded-xl p-6 shadow-md">
                    <h3 className="text-lg font-bold text-black mb-4">Priority Distribution</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-300">
                        <p className="text-3xl font-bold text-red-700">{aiSummary.priorities.high}</p>
                        <p className="text-sm text-red-600 font-medium">High Priority</p>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
                        <p className="text-3xl font-bold text-yellow-700">{aiSummary.priorities.medium}</p>
                        <p className="text-sm text-yellow-600 font-medium">Medium Priority</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-300">
                        <p className="text-3xl font-bold text-green-700">{aiSummary.priorities.low}</p>
                        <p className="text-sm text-green-600 font-medium">Low Priority</p>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-gradient-to-br from-black to-gray-900 border-2 border-[#D4AF37] rounded-xl p-6 shadow-md">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                      AI Recommendations
                    </h3>
                    <ul className="space-y-3">
                      {aiSummary.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-[#D4AF37]/30">
                          <span className="flex-shrink-0 w-6 h-6 bg-[#D4AF37] text-black rounded-full flex items-center justify-center text-sm font-bold">
                            {idx + 1}
                          </span>
                          <p className="text-white leading-relaxed">{rec}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      )}

      {/* Empty State */}
      {wards.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg border-2 border-[#D4AF37]">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-black mb-2">No Ward Data Available</h3>
          <p className="text-gray-600">There are no grievances to display at this time.</p>
        </div>
      )}
    </div>
  );
};

export default WardGrievances;
