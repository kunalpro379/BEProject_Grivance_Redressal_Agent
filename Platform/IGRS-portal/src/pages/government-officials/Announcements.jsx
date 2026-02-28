import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Calendar, User, Clock, Eye, Plus, X,
  ChevronRight, ChevronDown, Bell, FileText, BarChart3, 
  History, MessageSquare, Users, ExternalLink, Edit3,
  MapPin, Building, CheckCircle, AlertCircle, Info
} from 'lucide-react';

// Import the official datasets
import announcementsData from '../../data/officials/announcements.json';
import historyData from '../../data/officials/history.json';
import pollsData from '../../data/officials/polls.json';
import postsData from '../../data/officials/posts.json';

const OfficialAnnouncements = ({ userRole = "official" }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState('announcements');
  
  // Data states
  const [announcements, setAnnouncements] = useState([]);
  const [history, setHistory] = useState([]);
  const [polls, setPolls] = useState([]);
  const [posts, setPosts] = useState([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showMoreDepartments, setShowMoreDepartments] = useState(false);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState('');
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Load data on component mount
  useEffect(() => {
    setAnnouncements(announcementsData.announcements || []);
    setHistory(historyData.history || []);
    setPolls(pollsData.polls || []);
    setPosts(postsData.posts || []);
  }, []);

  // Reset filters when switching tabs to avoid cross-tab leakage
  useEffect(() => {
    setSearchTerm('');
    setSelectedDepartment('all');
    setExpandedItems(new Set());
  }, [activeTab]);

  // Get unique departments for the currently active tab
  const getDepartmentsForActiveTab = () => {
    let source = [];
    if (activeTab === 'announcements') source = announcements;
    else if (activeTab === 'posts') source = posts;
    else if (activeTab === 'polls') source = polls;
    else source = [];
    const departments = source.map(item => item.department).filter(Boolean);
    return [...new Set(departments)];
  };

  // Department → count map for active tab (LeetCode style chips)
  const getDepartmentCounts = () => {
    let source = [];
    if (activeTab === 'announcements') source = announcements;
    else if (activeTab === 'posts') source = posts;
    else if (activeTab === 'polls') source = polls;
    else source = [];
    const counts = {};
    for (const item of source) {
      if (!item?.department) continue;
      counts[item.department] = (counts[item.department] || 0) + 1;
    }
    return counts;
  };

  // Filter data based on active tab and search criteria
  const getFilteredData = () => {
    let data = [];
    switch (activeTab) {
      case 'announcements':
        data = announcements;
        break;
      case 'posts':
        data = posts;
        break;
      case 'polls':
        data = polls;
        break;
      case 'history':
        data = history;
        break;
      default:
        data = announcements;
    }

    // Apply search filter
    if (searchTerm) {
      data = data.filter(item => {
        const searchableText = [
          item.title,
          item.author,
          item.department,
          item.content?.en,
          item.content?.hi,
          item.content?.mr,
          item.question?.en,
          item.name
        ].join(' ').toLowerCase();
        return searchableText.includes(searchTerm.toLowerCase());
      });
    }

    // Apply department filter
    if (selectedDepartment !== 'all' && activeTab !== 'history') {
      data = data.filter(item => item.department === selectedDepartment);
    }

    return data;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recent';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Recent';
    }
  };

  const getContent = (content) => {
    if (typeof content === 'string') return content;
    if (typeof content === 'object' && content !== null) {
      return content[selectedLanguage] || content.en || '';
    }
    return '';
  };

  const toggleExpanded = (id) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Tab configuration
  const tabs = [
    { id: 'announcements', label: 'Announcements', icon: Bell, color: 'blue' },
    { id: 'posts', label: 'Posts', icon: FileText, color: 'green' },
    { id: 'polls', label: 'Polls', icon: BarChart3, color: 'purple' },
    { id: 'history', label: 'History', icon: History, color: 'orange' }
  ];

  const getTabStats = (tabId) => {
    switch (tabId) {
      case 'announcements':
        return announcements.length;
      case 'posts':
        return posts.length;
      case 'polls':
        return polls.length;
      case 'history':
        return history.length;
      default:
        return 0;
    }
  };

  const openCreateModal = (type) => {
    setCreateModalType(type);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateModalType('');
  };

  // Render individual items based on type
  const renderAnnouncementCard = (item) => {
    const isExpanded = expandedItems.has(item.id);
    const content = getContent(item.content);
    
    return (
      <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">{item.title}</h3>
                {/* Highlighted chips for metadata */}
                <div className="mt-1 space-y-1 text-xs sm:text-sm">
                  <div className="inline-flex items-center gap-1 sm:gap-2 max-w-full whitespace-nowrap overflow-hidden text-ellipsis px-2 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{item.author}</span>
                  </div>
                  <div className="inline-flex items-center gap-1 sm:gap-2 max-w-full whitespace-nowrap overflow-hidden text-ellipsis px-2 py-1 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700">
                    <Building className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{item.department}</span>
                  </div>
                  <div className="inline-flex items-center gap-1 sm:gap-2 max-w-full whitespace-nowrap overflow-hidden text-ellipsis px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-gray-700">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{formatDate(item.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{item.views || 0}</span>
                <span className="sm:hidden">{item.views || 0}</span>
              </span>
              <span className="flex items-center gap-1 text-xs sm:text-sm text-green-600">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{item.acknowledged || 0}</span>
                <span className="sm:hidden">{item.acknowledged || 0}</span>
              </span>
            </div>
          </div>
          
          <div className="mb-3 sm:mb-4">
            <p className={`text-gray-700 leading-relaxed text-xs sm:text-sm md:text-base ${isExpanded ? '' : 'line-clamp-3'}`}>
              {content}
            </p>
            {content.length > 200 && (
              <button
                onClick={() => toggleExpanded(item.id)}
                className="mt-2 text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium flex items-center gap-1"
              >
                {isExpanded ? (
                  <>Show Less <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" /></>
                ) : (
                  <>Read More <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" /></>
                )}
              </button>
            )}
          </div>

          {item.attachments && item.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
              {item.attachments.map((attachment, idx) => (
                <a
                  key={idx}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs sm:text-sm text-gray-700 transition-colors"
                >
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate max-w-20 sm:max-w-none">{attachment.name}</span>
                  <ExternalLink className="w-2 h-2 sm:w-3 sm:h-3 flex-shrink-0" />
                </a>
              ))}
            </div>
          )}

          {item.expires && (
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-orange-600 bg-orange-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Expires: </span>
              <span className="sm:hidden">Exp: </span>
              {formatDate(item.expires)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPostCard = (item) => {
    const content = getContent(item.content);
    
    return (
      <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {item.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building className="w-4 h-4" />
                    {item.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(item.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Eye className="w-4 h-4" />
              {item.views || 0}
            </span>
          </div>
          
          <p className="text-gray-700 leading-relaxed mb-4">{content}</p>

          {item.attachments && item.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.attachments.map((attachment, idx) => (
                <a
                  key={idx}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  {attachment.name}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPollCard = (item) => {
    const question = getContent(item.question);
    const options = item.options?.[selectedLanguage] || item.options?.en || [];
    const totalVotes = item.total_votes || 0;
    
    return (
      <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{question}</h3>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {item.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building className="w-4 h-4" />
                    {item.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(item.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{totalVotes}</div>
              <div className="text-xs text-gray-500">Total Votes</div>
            </div>
          </div>
          
          <div className="space-y-3">
            {options.map((option, idx) => {
              const votes = item.votes?.[idx] || 0;
              const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
              
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">{option}</span>
                    <span className="text-gray-600">{votes} votes ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {item.expires && (
            <div className="mt-4 flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              Expires: {formatDate(item.expires)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHistoryCard = (item) => {
    return (
      <div key={item.announcement_id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-orange-50 rounded-lg">
              <History className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Announcement ID: {item.announcement_id}</h3>
              <div className="text-sm text-gray-600">Activity Timeline</div>
            </div>
          </div>
          
          <div className="space-y-3">
            {item.activity?.map((activity, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{activity.action}</span>
                    <span className="text-xs text-gray-500">{formatDate(activity.timestamp)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    by {activity.user}
                  </div>
                  {activity.notes && (
                    <div className="text-sm text-gray-700 mt-1 italic">{activity.notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    const filteredData = getFilteredData();
    
    if (filteredData.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or create new content</p>
        </div>
      );
    }

    return (
      <div key={activeTab} className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {filteredData.map(item => {
          switch (activeTab) {
            case 'announcements':
              return renderAnnouncementCard(item);
            case 'posts':
              return renderPostCard(item);
            case 'polls':
              return renderPollCard(item);
            case 'history':
              return renderHistoryCard(item);
            default:
              return null;
          }
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Official Portal - Announcements</h1>
          <p className="text-gray-600">Manage announcements, posts, polls, and track activity history</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-wrap gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const stats = getTabStats(tab.id);
                
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    title={tab.label}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className={`text-xs px-1 sm:px-2 py-1 rounded-full ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {stats}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Create Button */}
            {activeTab !== 'history' && (
              <button
                type="button"
                onClick={() => openCreateModal(activeTab)}
                className="flex items-center gap-2 px-2 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                title={`Create ${activeTab === 'announcements' ? 'Announcement' : activeTab === 'posts' ? 'Post' : activeTab === 'polls' ? 'Poll' : ''}`}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">
                  {`Create ${activeTab === 'announcements' ? 'Announcement' : activeTab === 'posts' ? 'Post' : activeTab === 'polls' ? 'Poll' : ''}`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Department dropdown removed; replaced with LeetCode-style chips below */}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="mr">मराठी</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDepartment('all');
                }}
                className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>

        {/* LeetCode-style department chips */}
        {activeTab !== 'history' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Departments</h3>
              <div className="text-xs text-gray-500">Click to filter</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedDepartment('all')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  selectedDepartment === 'all'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                All Departments
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedDepartment === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {Object.values(getDepartmentCounts()).reduce((a,b)=>a+b,0)}
                </span>
              </button>

              {/* Show first 3 departments */}
              {Object.entries(getDepartmentCounts()).slice(0, 3).map(([dept, count]) => (
                <button
                  type="button"
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    selectedDepartment === dept
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                  title={dept}
                >
                  <span className="truncate max-w-32">{dept}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedDepartment === dept ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {count}
                  </span>
                </button>
              ))}

              {/* Show More Button - only if there are more than 3 departments */}
              {Object.entries(getDepartmentCounts()).length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowMoreDepartments(!showMoreDepartments)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                >
                  {showMoreDepartments ? 'Show Less' : 'Show More'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showMoreDepartments ? 'rotate-180' : ''}`} />
                </button>
              )}

              {/* Show remaining departments when expanded */}
              {showMoreDepartments && Object.entries(getDepartmentCounts()).slice(3).map(([dept, count]) => (
                <button
                  type="button"
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    selectedDepartment === dept
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                  title={dept}
                >
                  <span className="truncate max-w-32">{dept}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedDepartment === dept ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing <span className="font-semibold">{getFilteredData().length}</span> items in {activeTab}
          </p>
        </div>

        {renderContent()}

        {/* Create Modal */}
        {isCreateModalOpen && (
          <CreateModal
            type={createModalType}
            onClose={closeCreateModal}
            language={selectedLanguage}
          />
        )}
      </div>
    </div>
  );
};

// Create Modal Component
const CreateModal = ({ type, onClose, language }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    department: '',
    author: 'Current User',
    expires: '',
    attachments: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the data to your backend
    console.log('Creating new', type, formData);
    onClose();
  };

  const getModalTitle = () => {
    switch (type) {
      case 'announcements':
        return 'Create New Announcement';
      case 'posts':
        return 'Create New Post';
      case 'polls':
        return 'Create New Poll';
      default:
        return 'Create New Item';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">{getModalTitle()}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {type === 'polls' ? 'Question' : 'Title'}
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {type === 'polls' ? 'Description' : 'Content'}
            </label>
            <textarea
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
            />
          </div>

          {type !== 'posts' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expires (Optional)</label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.expires}
                onChange={(e) => setFormData({...formData, expires: e.target.value})}
              />
            </div>
          )}

          {type === 'polls' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Poll Options</label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Option 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Option 2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Add Another Option
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create {type.slice(0, -1).charAt(0).toUpperCase() + type.slice(1, -1)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfficialAnnouncements;
