import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Clock, AlertCircle, Download, Send, Plus, Map, Camera,
  MessageCircle, CheckCircle, UserPlus, Upload, AlertOctagon,
  ChevronDown, ChevronUp, X, Eye, Calendar, Loader
} from 'lucide-react';
import Timeline from '../../../components/Timeline';
import GrievanceFilterBar from './GrievanceFilterBar';
import { useAuth } from '../../../context/AuthContext';
import departmentDashboardService from '../../../services/departmentDashboard.service';

const mapApiGrievanceToUi = (g) => {
  const statusDisplay = { submitted: 'Pending', pending: 'Pending', in_progress: 'In Progress', resolved: 'Completed', rejected: 'Rejected' };
  const progressByStatus = { submitted: 10, pending: 20, in_progress: 60, resolved: 100, rejected: 0 };
  const categoryStr = typeof g.category === 'object' && g.category?.primary
    ? g.category.primary
    : (typeof g.category === 'string' && g.category.startsWith('{') ? (JSON.parse(g.category)?.primary || 'General') : g.category || 'General');
  return {
    id: g.id,
    title: g.title || g.grievance_text || 'No title',
    description: g.description || g.title || g.grievance_text || '',
    status: statusDisplay[g.status] || g.status,
    statusRaw: g.status,
    priority: g.priority || 'Medium',
    department: categoryStr,
    dateSubmitted: g.created_at ? new Date(g.created_at).toISOString().slice(0, 10) : '',
    citizenName: g.citizen_name || '—',
    location: g.location || g.extracted_address || '—',
    contactNumber: g.citizen_phone || '',
    attachments: [],
    progress: progressByStatus[g.status] ?? 0,
    timeline: Array.isArray(g.workflow?.history) ? g.workflow.history.map((h) => ({ date: h.timestamp, action: h.action, details: h.details || '', by: h.by || 'System' })) : [],
    comments: Array.isArray(g.comments) ? g.comments.map((c) => ({ id: c.id, author: c.author_name || 'Officer', text: c.comment || c.text, timestamp: c.created_at, avatar: 'O' })) : []
  };
};

const GrievanceList = () => {
  const { user } = useAuth();
  const departmentId = user?.department_id;
  const [grievancesFromApi, setGrievancesFromApi] = useState([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [filters, setFilters] = useState({
    status: 'All',
    priority: 'All',
    department: 'All',
    dateFrom: '',
    dateTo: ''
  });
  const [showChat, setShowChat] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showFloatingTimeline, setShowFloatingTimeline] = useState(false);
  const [selectedTimelineGrievance, setSelectedTimelineGrievance] = useState(null);
  const [showFloatingComments, setShowFloatingComments] = useState(false);
  const [selectedCommentsGrievance, setSelectedCommentsGrievance] = useState(null);

  useEffect(() => {
    if (!depId) {
      setApiLoading(false);
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setApiLoading(false);
      return;
    }
    let cancelled = false;
    setApiLoading(true);
    departmentDashboardService.getGrievances(depId, token, {})
      .then((res) => {
        if (!cancelled && res.success) {
          setGrievancesFromApi((res.data || []).map(mapApiGrievanceToUi));
        }
      })
      .catch(() => {
        if (!cancelled) setGrievancesFromApi([]);
      })
      .finally(() => {
        if (!cancelled) setApiLoading(false);
      });
    return () => { cancelled = true; };
  }, [departmentId]);

  const grievances = grievancesFromApi;

  // Filter grievances based on selected filters
  const filteredGrievances = useMemo(() => {
    return grievances.filter(grievance => {
      const matchesStatus = filters.status === 'All' || grievance.status === filters.status;
      const matchesPriority = filters.priority === 'All' || grievance.priority === filters.priority;
      const matchesDepartment = filters.department === 'All' || grievance.department === filters.department;
      
      const grievanceDate = new Date(grievance.dateSubmitted);
      const matchesDateRange = (!filters.dateFrom || grievanceDate >= new Date(filters.dateFrom)) &&
                              (!filters.dateTo || grievanceDate <= new Date(filters.dateTo));

      return matchesStatus && matchesPriority && matchesDepartment && matchesDateRange;
    });
  }, [grievances, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredGrievances.length;
    const pending = filteredGrievances.filter(g => g.status === 'Pending').length;
    const inProgress = filteredGrievances.filter(g => g.status === 'In Progress').length;
    const resolved = filteredGrievances.filter(g => g.status === 'Completed').length;

    return { total, pending, inProgress, resolved };
  }, [filteredGrievances]);

  if (!departmentId && !apiLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-amber-900 mb-2">No department assigned</h3>
          <p className="text-amber-800">Grievances are loaded by department. Please use the Department Dashboard from your portal.</p>
        </div>
      </div>
    );
  }

  const handleAddProgress = (grievanceId) => {
    // Add progress update logic
    console.log('Adding progress for grievance:', grievanceId);
  };

  const handleViewPDF = (file) => {
    // PDF viewer logic
    console.log('Viewing PDF:', file);
  };

  const handleMarkResolved = (id) => {
    // Implementation
  };

  const handleReassign = (id) => {
    // Implementation
  };

  const handleUploadProof = (id) => {
    // Implementation
  };

  const handleEscalate = (id) => {
    // Implementation
  };

  const handleAddComment = (id) => {
    // Implementation
    console.log('Adding comment for grievance:', id);
    setNewComment(''); // Clear the comment after adding
  };


  return (
    <div className="space-y-6">
      {apiLoading && (
        <div className="flex items-center justify-center py-12 bg-white rounded-2xl border border-gray-200">
          <Loader className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-gray-600 font-medium">Loading grievances from database...</span>
        </div>
      )}
      {!apiLoading && (
        <>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
          <div className="relative z-10">
            <div className="text-sm text-slate-300 font-medium mb-1">Total Grievances</div>
            <div className="text-3xl font-bold text-white mb-2">{stats.total}</div>
            <div className="text-xs text-slate-400">All registered cases</div>
        </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300 border border-amber-200/50"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200/20 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-orange-200/20 rounded-full translate-y-8 -translate-x-8"></div>
          <div className="relative z-10">
            <div className="text-sm text-amber-700 font-medium mb-1">Pending Review</div>
            <div className="text-3xl font-bold text-amber-800 mb-2">{stats.pending}</div>
            <div className="text-xs text-amber-600">Awaiting action</div>
        </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300 border border-blue-200/50"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/20 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-indigo-200/20 rounded-full translate-y-8 -translate-x-8"></div>
          <div className="relative z-10">
            <div className="text-sm text-blue-700 font-medium mb-1">In Progress</div>
            <div className="text-3xl font-bold text-blue-800 mb-2">{stats.inProgress}</div>
            <div className="text-xs text-blue-600">Active resolution</div>
        </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300 border border-emerald-200/50"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-200/20 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-green-200/20 rounded-full translate-y-8 -translate-x-8"></div>
          <div className="relative z-10">
            <div className="text-sm text-emerald-700 font-medium mb-1">Resolved</div>
            <div className="text-3xl font-bold text-emerald-800 mb-2">{stats.resolved}</div>
            <div className="text-xs text-emerald-600">Successfully closed</div>
        </div>
        </motion.div>
      </div>

      {/* Filter Bar */}
      <GrievanceFilterBar filters={filters} setFilters={setFilters} />

      {/* Grievance List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredGrievances.map((grievance) => (
            <motion.div
              key={grievance.id}
            className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300"
            whileHover={{ scale: 1.02, y: -4 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {grievance.title}
                  </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-3">
                    {grievance.description}
                  </p>
                
                {/* Complaint Summary */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className="text-blue-600" />
                    <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Complaint Summary</span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{grievance.fullDescription || grievance.description}</p>
                </div>

                {/* Location */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Map size={14} className="text-green-600" />
                    <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Location</span>
                  </div>
                  <p className="text-gray-700 text-sm font-medium">{grievance.location}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                grievance.priority === 'High' ? 'bg-red-100 text-red-800 border border-red-200' : 
                grievance.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                'bg-green-100 text-green-800 border border-green-200'
                }`}>
                  {grievance.priority}
                </span>
              </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Citizen</p>
                <p className="font-semibold text-gray-900">{grievance.citizenName}</p>
                </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Location</p>
                <p className="font-semibold text-gray-900">{grievance.location}</p>
                </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Department</p>
                <p className="font-semibold text-gray-900">{grievance.department}</p>
                </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Submitted</p>
                <p className="font-semibold text-gray-900">{grievance.dateSubmitted}</p>
              </div>
              </div>

              {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">Progress</span>
                <span className="text-gray-900 font-bold">{grievance.progress}%</span>
                </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${grievance.progress}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                />
              </div>
              </div>

              {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleMarkResolved(grievance.id)}
                className="group flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 rounded-xl hover:from-emerald-100 hover:to-green-100 transition-all duration-300 border border-emerald-200/50 shadow-sm hover:shadow-md"
              >
                <CheckCircle size={16} className="group-hover:scale-110 transition-transform" />
                Mark as Resolved
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleReassign(grievance.id)}
                className="group flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 border border-blue-200/50 shadow-sm hover:shadow-md"
              >
                <UserPlus size={16} className="group-hover:scale-110 transition-transform" />
                Reassign Task
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleUploadProof(grievance.id)}
                className="group flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 rounded-xl hover:from-purple-100 hover:to-pink-100 transition-all duration-300 border border-purple-200/50 shadow-sm hover:shadow-md"
              >
                <Upload size={16} className="group-hover:scale-110 transition-transform" />
                Upload Proof
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleEscalate(grievance.id)}
                className="group flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-50 to-rose-50 text-red-700 rounded-xl hover:from-red-100 hover:to-rose-100 transition-all duration-300 border border-red-200/50 shadow-sm hover:shadow-md"
              >
                <AlertOctagon size={16} className="group-hover:scale-110 transition-transform" />
                Escalate
              </motion.button>
            </div>

            {/* Additional Actions */}
            <div className="flex flex-wrap gap-3 mb-4">
              {grievance.attachments?.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleViewPDF(grievance.attachments[0])}
                className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 border border-blue-200/50 shadow-sm hover:shadow-md"
              >
                <Download size={16} className="group-hover:scale-110 transition-transform" />
                View PDF
              </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedTimelineGrievance(grievance);
                  setShowFloatingTimeline(true);
                }}
                className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 rounded-xl hover:from-purple-100 hover:to-pink-100 transition-all duration-300 border border-purple-200/50 shadow-sm hover:shadow-md"
              >
                <Eye size={16} className="group-hover:scale-110 transition-transform" />
                Show Resolution Timeline
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                  onClick={() => handleAddProgress(grievance.id)}
                className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-xl hover:from-green-100 hover:to-emerald-100 transition-all duration-300 border border-green-200/50 shadow-sm hover:shadow-md"
              >
                <Plus size={16} className="group-hover:scale-110 transition-transform" />
                Add Progress
              </motion.button>
            </div>

            {/* Comment Actions - Text Buttons */}
            <div className="flex gap-4 pt-2 border-t border-gray-200">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedCommentsGrievance(grievance);
                  setShowFloatingComments(true);
                }}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors"
              >
                <MessageCircle size={16} />
                View Comments ({grievance.comments?.length || 0})
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedCommentsGrievance(grievance);
                  setShowFloatingComments(true);
                }}
                className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium text-sm transition-colors"
                >
                  <Plus size={16} />
                Add Comment
              </motion.button>
              </div>

            </motion.div>
          ))}
        </div>

      {/* Floating Timeline Modal */}
      <AnimatePresence>
        {showFloatingTimeline && selectedTimelineGrievance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowFloatingTimeline(false);
                setSelectedTimelineGrievance(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Resolution Timeline</h2>
                    <p className="text-purple-100">{selectedTimelineGrievance.title}</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setShowFloatingTimeline(false);
                      setSelectedTimelineGrievance(null);
                    }}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <X size={24} />
                  </motion.button>
                </div>
              </div>
              
              {/* Timeline Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <Timeline data={selectedTimelineGrievance.timeline || []} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Comments Modal */}
      <AnimatePresence>
        {showFloatingComments && selectedCommentsGrievance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowFloatingComments(false);
                setSelectedCommentsGrievance(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Comments & Discussion</h2>
                    <p className="text-indigo-100">{selectedCommentsGrievance.title}</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setShowFloatingComments(false);
                      setSelectedCommentsGrievance(null);
                    }}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <X size={24} />
                  </motion.button>
                </div>
        </div>

              {/* Comments Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
                {/* Comments List */}
                <div className="space-y-4 mb-6">
                  {selectedCommentsGrievance.comments?.map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-gray-50 p-4 rounded-xl border border-gray-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {comment.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{comment.author}</span>
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                              {comment.timestamp}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm leading-relaxed">{comment.text}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {(!selectedCommentsGrievance.comments || selectedCommentsGrievance.comments.length === 0) && (
                    <div className="text-center py-8">
                      <MessageCircle size={48} className="text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No comments yet. Be the first to add one!</p>
                    </div>
                  )}
                </div>

                {/* Add Comment Form */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      You
                    </div>
                    <div className="flex-1">
                      <textarea
                        placeholder="Add a comment..."
                        className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm resize-none"
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(selectedCommentsGrievance.id);
                          }
                        }}
                      />
                      <div className="flex justify-end mt-2">
                        <motion.button
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAddComment(selectedCommentsGrievance.id)}
                          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-sm hover:shadow-md"
                        >
                          Post Comment
                        </motion.button>
                      </div>
                    </div>
                  </div>
        </div>
      </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default GrievanceList;

