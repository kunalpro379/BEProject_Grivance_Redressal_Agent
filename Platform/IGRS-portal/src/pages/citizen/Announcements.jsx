import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Calendar, MapPin, User, Clock, Eye, Star,
  ChevronRight, ChevronDown, TrendingUp, AlertCircle, CheckCircle,
  Globe, Zap, Shield, Award, Building, Heart, Users, FileText,
  ArrowRight, ExternalLink, Tag, Bookmark, Share, Bell, Home,
  GraduationCap, Stethoscope, Briefcase, Landmark, Wrench,
  Smartphone, Car, School, CreditCard, Utensils, Sparkles, X
} from 'lucide-react';
import announcementsData from '../../data/announcement_page.json';
import govSchemesData from '../../data/gov.json';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Government Schemes State
  const [govSchemes, setGovSchemes] = useState([]);
  const [filteredGovSchemes, setFilteredGovSchemes] = useState([]);
  const [activeTab, setActiveTab] = useState('announcements');
  const [govSearchTerm, setGovSearchTerm] = useState('');
  const [selectedGovCategory, setSelectedGovCategory] = useState('all');

  useEffect(() => {
    setAnnouncements(announcementsData);
    setFilteredAnnouncements(announcementsData);
    setGovSchemes(govSchemesData.government_schemes || []);
    setFilteredGovSchemes(govSchemesData.government_schemes || []);
  }, []);

  useEffect(() => {
    let filtered = announcements;

    if (searchTerm) {
      filtered = filtered.filter(item => 
        (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => 
        item.category && item.category.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => 
        item.status && item.status.toLowerCase().includes(selectedStatus.toLowerCase())
      );
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(item => 
        item.type && item.type.toLowerCase().includes(selectedType.toLowerCase())
      );
    }

    setFilteredAnnouncements(filtered);
  }, [searchTerm, selectedCategory, selectedStatus, selectedType, announcements]);

  // Government Schemes Filtering
  useEffect(() => {
    let filtered = govSchemes;

    if (govSearchTerm) {
      filtered = filtered.filter(item => 
        (item.name && item.name.toLowerCase().includes(govSearchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(govSearchTerm.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(govSearchTerm.toLowerCase()))
      );
    }

    if (selectedGovCategory !== 'all') {
      filtered = filtered.filter(item => 
        item.category && item.category.toLowerCase().includes(selectedGovCategory.toLowerCase())
      );
    }

    setFilteredGovSchemes(filtered);
  }, [govSearchTerm, selectedGovCategory, govSchemes]);

  const getUniqueCategories = () => {
    const categories = announcements.map(item => item.category).filter(Boolean);
    return [...new Set(categories)];
  };

  const getUniqueStatuses = () => {
    const statuses = announcements.map(item => item.status).filter(Boolean);
    return [...new Set(statuses)];
  };

  const getUniqueTypes = () => {
    const types = announcements.map(item => item.type).filter(Boolean);
    return [...new Set(types)];
  };

  // Government Schemes Helper Functions
  const getUniqueGovCategories = () => {
    const categories = govSchemes.map(item => item.category).filter(Boolean);
    return [...new Set(categories)];
  };

  const getGovCategoryIcon = (category) => {
    if (!category) return <Bell className="w-5 h-5" />;
    const cat = category.toLowerCase();
    if (cat.includes('housing') || cat.includes('गृह') || cat.includes('घर')) return <Home className="w-5 h-5" />;
    if (cat.includes('health') || cat.includes('आरोग्य') || cat.includes('स्वास्थ्य')) return <Stethoscope className="w-5 h-5" />;
    if (cat.includes('skill') || cat.includes('कौशल') || cat.includes('शिक्षा')) return <GraduationCap className="w-5 h-5" />;
    if (cat.includes('employment') || cat.includes('रोजगार') || cat.includes('नौकरी')) return <Briefcase className="w-5 h-5" />;
    if (cat.includes('agriculture') || cat.includes('कृषि') || cat.includes('शेती')) return <Wrench className="w-5 h-5" />;
    if (cat.includes('financial') || cat.includes('वित्त') || cat.includes('बैंक')) return <CreditCard className="w-5 h-5" />;
    if (cat.includes('women') || cat.includes('महिला') || cat.includes('स्त्री')) return <Heart className="w-5 h-5" />;
    if (cat.includes('pension') || cat.includes('पेंशन')) return <Shield className="w-5 h-5" />;
    if (cat.includes('energy') || cat.includes('ऊर्जा')) return <Zap className="w-5 h-5" />;
    if (cat.includes('food') || cat.includes('खाद्य') || cat.includes('अन्न')) return <Utensils className="w-5 h-5" />;
    return <Building className="w-5 h-5" />;
  };

  const getGovCategoryColor = (category) => {
    if (!category) return 'bg-gray-100 text-gray-800 border-gray-200';
    const cat = category.toLowerCase();
    if (cat.includes('housing') || cat.includes('गृह')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (cat.includes('health') || cat.includes('आरोग्य')) return 'bg-red-100 text-red-800 border-red-200';
    if (cat.includes('skill') || cat.includes('कौशल')) return 'bg-green-100 text-green-800 border-green-200';
    if (cat.includes('employment') || cat.includes('रोजगार')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (cat.includes('agriculture') || cat.includes('कृषि')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (cat.includes('financial') || cat.includes('वित्त')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (cat.includes('women') || cat.includes('महिला')) return 'bg-pink-100 text-pink-800 border-pink-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getCategoryIcon = (category) => {
    if (!category) return <Bell className="w-5 h-5" />;
    const cat = category.toLowerCase();
    if (cat.includes('transport')) return <Globe className="w-5 h-5" />;
    if (cat.includes('health')) return <Heart className="w-5 h-5" />;
    if (cat.includes('education')) return <FileText className="w-5 h-5" />;
    if (cat.includes('policy')) return <Shield className="w-5 h-5" />;
    if (cat.includes('housing')) return <Building className="w-5 h-5" />;
    if (cat.includes('environment')) return <Zap className="w-5 h-5" />;
    return <Bell className="w-5 h-5" />;
  };

  // Color for announcement category chips (used in modal)
  const getCategoryColor = (category) => {
    if (!category) return 'bg-gray-100 text-gray-800 border-gray-200';
    const cat = category.toLowerCase();
    if (cat.includes('transport')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (cat.includes('health')) return 'bg-red-100 text-red-800 border-red-200';
    if (cat.includes('education')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (cat.includes('policy')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (cat.includes('housing')) return 'bg-green-100 text-green-800 border-green-200';
    if (cat.includes('environment')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
    const stat = status.toLowerCase();
    if (stat.includes('completed')) return 'bg-green-100 text-green-800 border-green-200';
    if (stat.includes('active')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (stat.includes('planning')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (stat.includes('pending')) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityLevel = (status, type) => {
    const stat = status ? status.toLowerCase() : '';
    const typ = type ? type.toLowerCase() : '';
    if (stat.includes('urgent') || typ.includes('urgent')) return 'high';
    if (stat.includes('active') || stat.includes('ongoing')) return 'medium';
    return 'low';
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

  const handleAnnouncementClick = (announcement) => {
    console.log('Announcement clicked:', announcement);
    setSelectedAnnouncement(announcement);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAnnouncement(null);
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === '2025-09-??' || dateString.includes('??')) {
      return 'Recent';
    }
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Recent';
    }
  };

  const AnnouncementCard = ({ announcement, index }) => {
    const isExpanded = expandedItems.has(announcement.id);
    const priorityLevel = getPriorityLevel(announcement.status, announcement.type);
    
    return (
      <div 
        className={`group relative bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer
          ${priorityLevel === 'high' ? 'border-l-4 border-l-red-500' : 
            priorityLevel === 'medium' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-green-500'}
          transform hover:-translate-y-1`}
        onClick={(e) => {
          e.stopPropagation();
          handleAnnouncementClick(announcement);
        }}
      >
        
        <div className={`absolute top-4 right-4 w-3 h-3 rounded-full animate-pulse
          ${priorityLevel === 'high' ? 'bg-red-500' : 
            priorityLevel === 'medium' ? 'bg-blue-500' : 'bg-green-500'}`} />

        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
              <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${
                priorityLevel === 'high' ? 'bg-red-50' : 
                priorityLevel === 'medium' ? 'bg-blue-50' : 'bg-green-50'
              }`}>
                {getCategoryIcon(announcement.category)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300 line-clamp-2">
                  {announcement.title}
                </h3>
                
                {/* Metadata: responsive layout for mobile */}
                <div className="mt-2 space-y-1 text-xs sm:text-sm">
                  {(announcement.author) && (
                    <div className="inline-flex items-center gap-1 sm:gap-2 max-w-full whitespace-nowrap overflow-hidden text-ellipsis px-2 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700">
                      <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{announcement.author}</span>
                    </div>
                  )}
                  {(announcement.department) && (
                    <div className="inline-flex items-center gap-1 sm:gap-2 max-w-full whitespace-nowrap overflow-hidden text-ellipsis px-2 py-1 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700">
                      <Building className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{announcement.department}</span>
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1 sm:gap-2 max-w-full whitespace-nowrap overflow-hidden text-ellipsis px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-gray-700">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{formatDate(announcement.date)}</span>
                    {announcement.expires && (
                      <span className="ml-1 sm:ml-2 inline-flex items-center gap-1 text-xs px-1 sm:px-2 py-0.5 rounded-md border border-orange-200 bg-orange-50 text-orange-700 whitespace-nowrap">
                        <Clock className="w-2 h-2 sm:w-3 sm:h-3" />
                        <span className="hidden sm:inline">Expires: </span>
                        <span className="sm:hidden">Exp: </span>
                        {formatDate(announcement.expires)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
      </div>

          <div className="mb-4">
            <p className={`text-gray-700 leading-relaxed text-sm sm:text-base ${
              isExpanded ? '' : 'line-clamp-3'
            }`}>
              {announcement.description}
            </p>
            
            <button
              onClick={(e) => { e.stopPropagation(); handleAnnouncementClick(announcement); }}
              className="mt-2 text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium inline-flex items-center gap-1 transition-colors"
            >
              Read More <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
      </div>

          <div className="flex flex-wrap gap-1 sm:gap-2 mb-4">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-medium">
              <Tag className="w-3 h-3" />
              <span className="truncate max-w-20 sm:max-w-none">{announcement.category}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-lg text-xs font-medium">
              <FileText className="w-3 h-3" />
              <span className="truncate max-w-20 sm:max-w-none">{announcement.type}</span>
            </span>
      </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-100 gap-3">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              {/* Views and Likes */}
              {(announcement.views || announcement.likes) && (
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500">
                  {announcement.views && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{announcement.views}</span>
                      <span className="sm:hidden">{announcement.views}</span>
                    </span>
                  )}
                  {announcement.likes && (
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{announcement.likes}</span>
                      <span className="sm:hidden">{announcement.likes}</span>
                    </span>
                  )}
                </div>
              )}
              
              <button className="flex items-center gap-1 sm:gap-2 text-gray-500 hover:text-red-500 transition-colors">
                <Bookmark className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm hidden sm:inline">Save</span>
              </button>
              <button className="flex items-center gap-1 sm:gap-2 text-gray-500 hover:text-blue-500 transition-colors">
                <Share className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm hidden sm:inline">Share</span>
              </button>
        </div>

            <div className="flex items-center gap-2 flex-wrap">
              {announcement.attachments && announcement.attachments.length > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  <FileText className="w-3 h-3" />
                  {announcement.attachments.length} file{announcement.attachments.length !== 1 ? 's' : ''}
                </span>
              )}
              
              <button className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs sm:text-sm">
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">View Details</span>
                <span className="sm:hidden">View</span>
              </button>
            </div>
        </div>
      </div>

        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    );
  };

  const ListView = () => (
    <div className="space-y-3 sm:space-y-4">
      {filteredAnnouncements.map((announcement, index) => (
        <div
          key={announcement.id}
          className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200 cursor-pointer"
          onClick={() => handleAnnouncementClick(announcement)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAnnouncementClick(announcement); } }}
        >
          <div className="p-3 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className={`p-2 rounded-lg flex-shrink-0 ${
                getPriorityLevel(announcement.status, announcement.type) === 'high' ? 'bg-red-50' : 
                getPriorityLevel(announcement.status, announcement.type) === 'medium' ? 'bg-blue-50' : 'bg-green-50'
              }`}>
                {getCategoryIcon(announcement.category)}
              </div>
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  className="font-semibold text-left text-gray-900 line-clamp-1 hover:text-blue-600 focus:outline-none text-sm sm:text-base"
                  onClick={(e) => { e.stopPropagation(); handleAnnouncementClick(announcement); }}
                >
                  {announcement.title}
                </button>
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-1 mt-1">{announcement.description}</p>
                
                {/* Author and Department in ListView */}
                {(announcement.author || announcement.department) && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {announcement.author}{announcement.author && announcement.department && ' • '}{announcement.department}
                  </p>
                )}
                
                <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(announcement.status)}`}>
                    {announcement.status}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(announcement.date)}</span>
                  
                  {/* Views and Likes in ListView */}
                  {(announcement.views || announcement.likes) && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {announcement.views && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span className="hidden sm:inline">{announcement.views}</span>
                          <span className="sm:hidden">{announcement.views}</span>
                        </span>
                      )}
                      {announcement.likes > 0 && (
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span className="hidden sm:inline">{announcement.likes}</span>
                          <span className="sm:hidden">{announcement.likes}</span>
                        </span>
                      )}
                    </div>
                  )}
                  
                  {announcement.attachments && announcement.attachments.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-blue-600">
                      <FileText className="w-3 h-3" />
                      {announcement.attachments.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
          </div>
        </div>
      ))}
      </div>
  );

  // Government Schemes Components
  const GovernmentSchemeCard = ({ scheme, index }) => {
    const isExpanded = expandedItems.has(scheme.id);
    
    return (
      <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 border border-gray-200 overflow-hidden transform hover:-translate-y-1">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50">
                {getGovCategoryIcon(scheme.category)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300 line-clamp-2">
                  {scheme.name}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getGovCategoryColor(scheme.category)}`}>
                    {scheme.category}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {scheme.launch_year}
                  </span>
                </div>
              </div>
        </div>
      </div>

          <div className="mb-4">
            <p className={`text-gray-700 leading-relaxed ${
              isExpanded ? '' : 'line-clamp-3'
            }`}>
              {scheme.description}
            </p>
            
            {scheme.description && scheme.description.length > 150 && (
              <button
                onClick={() => toggleExpanded(scheme.id)}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 transition-colors"
              >
                {isExpanded ? (
                  <>Show Less <ChevronDown className="w-4 h-4" /></>
                ) : (
                  <>Read More <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            )}
        </div>

          {scheme.features && scheme.features.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Key Features:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {scheme.features.slice(0, isExpanded ? scheme.features.length : 4).map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="line-clamp-1">{feature}</span>
              </div>
            ))}
          </div>
              {scheme.features.length > 4 && !isExpanded && (
                <button
                  onClick={() => toggleExpanded(scheme.id)}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  +{scheme.features.length - 4} more features
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {scheme.beneficiaries && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-medium">
                <Users className="w-3 h-3" />
                {scheme.beneficiaries}
              </span>
            )}
            {scheme.english_name && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                <Globe className="w-3 h-3" />
                {scheme.english_name}
              </span>
        )}
      </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
      <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors">
                <Heart className="w-4 h-4" />
                <span className="text-sm">Save</span>
              </button>
              <button className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors">
                <Share className="w-4 h-4" />
                <span className="text-sm">Share</span>
              </button>
            </div>

            {scheme.official_website && (
              <a
                href={scheme.official_website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 text-sm font-medium shadow-md hover:shadow-lg"
              >
                <ExternalLink className="w-4 h-4" />
                Apply Now
              </a>
            )}
      </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
  };

  const GovernmentSchemesView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {filteredGovSchemes.map((scheme, index) => (
        <GovernmentSchemeCard key={scheme.id} scheme={scheme} index={index} />
      ))}
    </div>
  );

  return (
    <div className="">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-10">
            <p className="text-lg font-normal text-gray-800 max-w-2xl mx-auto leading-relaxed italic tracking-wide" style={{ fontFamily: 'Brush Script MT, cursive, serif' }}>
              Access comprehensive information about government announcements, policies, and welfare schemes designed to serve citizens better.
            </p>
          </div>
          
          {/* Professional Tab System */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200/60 p-1 flex gap-1">
              <button 
                onClick={() => setActiveTab('announcements')}
                className={`px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center gap-2 text-sm ${
                  activeTab === 'announcements'
                    ? 'bg-black text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Bell className="w-4 h-4" />
                Announcements
              </button>
              <button 
                onClick={() => setActiveTab('schemes')}
                className={`px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center gap-2 text-sm ${
                  activeTab === 'schemes'
                    ? 'bg-black text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Government Schemes
              </button>
            </div>
          </div>

          {/* Dynamic Statistics Based on Active Tab */}
          {activeTab === 'announcements' && (
            <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{announcements.length}</p>
                    <p className="text-sm font-medium text-gray-600 mt-1">Total Announcements</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {announcements.filter(a => a.status && a.status.toLowerCase().includes('active')).length}
                    </p>
                    <p className="text-sm font-medium text-gray-600 mt-1">Active Initiatives</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
        </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{getUniqueCategories().length}</p>
                    <p className="text-sm font-medium text-gray-600 mt-1">Categories</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {announcements.filter(a => a.date && a.date.includes('2025')).length}
                    </p>
                    <p className="text-sm font-medium text-gray-600 mt-1">This Year</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                </div>
            </div>
          )}

          {activeTab === 'schemes' && (
            <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{govSchemes.length}</p>
                    <p className="text-sm font-medium text-gray-600 mt-1">Total Schemes</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Sparkles className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {govSchemes.filter(s => s.category && s.category.toLowerCase().includes('housing')).length}
                    </p>
                    <p className="text-sm font-medium text-gray-600 mt-1">Housing Schemes</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <Home className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {govSchemes.filter(s => s.category && s.category.toLowerCase().includes('health')).length}
                    </p>
                    <p className="text-sm font-medium text-gray-600 mt-1">Health Schemes</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <Stethoscope className="w-6 h-6 text-red-600" />
                  </div>
                </div>
        </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {govSchemes.filter(s => s.category && (s.category.toLowerCase().includes('skill') || s.category.toLowerCase().includes('education'))).length}
                    </p>
                    <p className="text-sm font-medium text-gray-600 mt-1">Skill/Education</p>
          </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <GraduationCap className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
          )}

          {/* Dynamic Filter Section Based on Active Tab */}
          {activeTab === 'announcements' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Announcements</h3>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                <div className="lg:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search announcements..."
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    {getUniqueCategories().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    {getUniqueStatuses().map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
          </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    {getUniqueTypes().map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
          </div>

                <div className="lg:col-span-2">
          <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                      setSelectedStatus('all');
                      setSelectedType('all');
                    }}
                    className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                  >
                    Clear All
          </button>
        </div>
              </div>
            </div>
          )}

          {activeTab === 'schemes' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Government Schemes</h3>
              <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-end">
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search schemes, benefits, categories..."
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={govSearchTerm}
                      onChange={(e) => setGovSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={selectedGovCategory}
                    onChange={(e) => setSelectedGovCategory(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    {getUniqueGovCategories().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
      </div>

                <div className="lg:col-span-1">
            <button
                    onClick={() => {
                      setGovSearchTerm('');
                      setSelectedGovCategory('all');
                    }}
                    className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                  >
                    Clear
            </button>
                </div>
        </div>
      </div>
          )}

        {/* Dynamic Content Based on Active Tab */}
        {activeTab === 'announcements' && (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                Showing <span className="font-semibold">{filteredAnnouncements.length}</span> of{' '}
                <span className="font-semibold">{announcements.length}</span> announcements
              </p>
            </div>

            {filteredAnnouncements.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements found</h3>
                <p className="text-gray-600">Try adjusting your search criteria</p>
              </div>
            ) : (
              <ListView />
            )}
          </>
        )}

        {activeTab === 'schemes' && (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                Showing <span className="font-semibold">{filteredGovSchemes.length}</span> of{' '}
                <span className="font-semibold">{govSchemes.length}</span> government schemes
              </p>
            </div>

            {filteredGovSchemes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No schemes found</h3>
                <p className="text-gray-600">Try adjusting your search criteria</p>
              </div>
            ) : (
              <GovernmentSchemesView />
            )}
          </>
        )}

      </div>

      {/* Modal for Announcement Details */}
      {isModalOpen && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-900">Announcement Details</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50">
                  {getCategoryIcon(selectedAnnouncement.category)}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {selectedAnnouncement.title}
                  </h3>
                  
                  {/* Author and Department in Modal */}
                  {(selectedAnnouncement.author || selectedAnnouncement.department) && (
                    <div className="flex items-center gap-2 mb-3 text-gray-600">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{selectedAnnouncement.author}</span>
                      {selectedAnnouncement.author && selectedAnnouncement.department && <span>•</span>}
                      <span className="text-sm">{selectedAnnouncement.department}</span>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedAnnouncement.status)}`}>
                      {selectedAnnouncement.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(selectedAnnouncement.category)}`}>
                      {selectedAnnouncement.category}
                    </span>
                    {selectedAnnouncement.type && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium border border-gray-200 text-gray-700">
                        {selectedAnnouncement.type}
                      </span>
                    )}
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border border-gray-200 text-gray-700">
                      <Calendar className="w-4 h-4" />
                      {formatDate(selectedAnnouncement.date)}
                    </span>
                    {selectedAnnouncement.expires && (
                      <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border border-orange-200 text-orange-700 bg-orange-50">
                        <Clock className="w-4 h-4" />
                        Expires: {formatDate(selectedAnnouncement.expires)}
                      </span>
                    )}
                  </div>
                  
                  {/* Views and Likes in Modal */}
                  {(selectedAnnouncement.views || selectedAnnouncement.likes) && (
                    <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                      {selectedAnnouncement.views && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {selectedAnnouncement.views} views
                        </span>
                      )}
                      {selectedAnnouncement.likes > 0 && (
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {selectedAnnouncement.likes} likes
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedAnnouncement.description && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Description</h4>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedAnnouncement.description}
                  </p>
                </div>
              )}

              {selectedAnnouncement.content && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Content</h4>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedAnnouncement.content}
                  </div>
                </div>
              )}

              {selectedAnnouncement.attachments && selectedAnnouncement.attachments.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Attachments</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedAnnouncement.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="text-sm text-gray-700 flex-1">{attachment}</span>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedAnnouncement.contact && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">{selectedAnnouncement.contact}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors">
                    <Heart className="w-4 h-4" />
                    <span className="text-sm">Save</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors">
                    <Share className="w-4 h-4" />
                    <span className="text-sm">Share</span>
                  </button>
                </div>
              <button
                  onClick={closeModal}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                  Close
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Announcements;

