import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, FileText, TrendingUp, Users, AlertTriangle, Activity,
  Clock, CheckCircle, Briefcase, MapPin, ChevronRight, Loader, DollarSign, BarChart3,
  Eye, Pencil, Search, X, MessageSquare, Wrench, BookOpen, ScrollText, UserPlus, AlertCircle as AlertCircleIcon, Link as LinkIcon,
  Map as MapIcon, Maximize2, Minimize2, Calendar, Building2, Sparkles, ExternalLink, Image as ImageIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import departmentDashboardService from '../../services/departmentDashboard.service';
import { useAuth } from '../../context/AuthContext';
import PremiumHeader from './components/PremiumHeader';
import BudgetManagement from './components/BudgetManagement';
import LocationDisplay from '../../components/LocationDisplay';
import JsonRenderer from '../../components/JsonRenderer';
import { grievanceService } from '../../services/grievance.service';

// Fix default marker icon in react-leaflet
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const DepartmentDashboardNew = () => {
  const { departmentId: depId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [grievancesLoading, setGrievancesLoading] = useState(false);
  const [mapGrievances, setMapGrievances] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapSearch, setMapSearch] = useState('');
  const [mapCategoryFilter, setMapCategoryFilter] = useState('all');
  const [mapStatusFilter, setMapStatusFilter] = useState('all');
  const [mapPriorityFilter, setMapPriorityFilter] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [grievanceSearch, setGrievanceSearch] = useState('');
  const [selectedGrievanceId, setSelectedGrievanceId] = useState(null);
  const [grievanceDetail, setGrievanceDetail] = useState(null);
  const [grievanceDetailLoading, setGrievanceDetailLoading] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Map refs
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [contractors, setContractors] = useState([]);
  const [contractorsLoading, setContractorsLoading] = useState(false);
  const [zoneAllocation, setZoneAllocation] = useState([]);
  const [zoneAllocationLoading, setZoneAllocationLoading] = useState(false);
  const [activeResourceTab, setActiveResourceTab] = useState('internal-team');
  const [escalationsData, setEscalationsData] = useState({ escalations: [], repeatPatterns: [] });
  const [escalationsLoading, setEscalationsLoading] = useState(false);
  const [aiInsightsList, setAiInsightsList] = useState([]);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [citizenFeedbackData, setCitizenFeedbackData] = useState({ data: [], summary: {} });
  const [citizenFeedbackLoading, setCitizenFeedbackLoading] = useState(false);
  const [predictiveMaintenanceList, setPredictiveMaintenanceList] = useState([]);
  const [predictiveMaintenanceLoading, setPredictiveMaintenanceLoading] = useState(false);
  const [knowledgeBaseList, setKnowledgeBaseList] = useState([]);
  const [knowledgeBaseLoading, setKnowledgeBaseLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploading, setUploading] = useState(false);
  const [copyingLink, setCopyingLink] = useState(null);
  const [officersList, setOfficersList] = useState([]);
  const [officersLoading, setOfficersLoading] = useState(false);
  const [auditLogsList, setAuditLogsList] = useState([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Helper function to handle auth errors and logout
  const handleAuthError = async (err) => {
    const msg = err?.message || '';
    const errorStr = err?.toString() || '';
    
    const isConnectionError = errorStr.includes('Failed to fetch') || 
                              errorStr.includes('ERR_CONNECTION_REFUSED') ||
                              errorStr.includes('NetworkError');
    
    const isAuthError = msg.includes('Session expired') || 
                       msg.includes('Token expired') || 
                       msg.includes('Unauthorized') ||
                       msg.includes('401');
    
    if (isAuthError || isConnectionError) {
      try {
        await logout();
      } catch (logoutErr) {
        // Even if logout fails, clear local storage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
      navigate('/officials-portal/authentication', { replace: true });
      return true; // Indicates error was handled
    }
    return false; // Error not handled
  };

  useEffect(() => {
    loadDashboardData();
  }, [depId]);

  useEffect(() => {
    if (activeTab === 'grievances') {
      loadGrievances();
    }
  }, [activeTab, filterStatus, filterCategory, filterPriority]);

  useEffect(() => {
    if (!selectedGrievanceId || !depId) {
      setGrievanceDetail(null);
      return;
    }
    let cancelled = false;
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    setGrievanceDetailLoading(true);
    setGrievanceDetail(null);
    departmentDashboardService.getGrievanceById(depId, selectedGrievanceId, token)
      .then((res) => {
        if (!cancelled && res.success) setGrievanceDetail(res.data);
      })
      .catch(() => {
        if (!cancelled) setGrievanceDetail(null);
      })
      .finally(() => {
        if (!cancelled) setGrievanceDetailLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedGrievanceId, depId]);

  useEffect(() => {
    if (activeTab === 'map') loadMapGrievances();
  }, [activeTab, depId]);
  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics();
  }, [activeTab, depId]);
  useEffect(() => {
    if (activeTab === 'resources') loadResourcesData();
  }, [activeTab, activeResourceTab, depId]);
  useEffect(() => {
    if (activeTab === 'escalations') loadEscalations();
  }, [activeTab, depId]);
  useEffect(() => {
    if (activeTab === 'ai-insights') loadAIInsights();
  }, [activeTab, depId]);
  useEffect(() => {
    if (activeTab === 'citizen-feedback') loadCitizenFeedback();
  }, [activeTab, depId]);
  useEffect(() => {
    if (activeTab === 'knowledge-base') loadKnowledgeBase();
  }, [activeTab, depId]);
  useEffect(() => {
    if (activeTab === 'officers') loadOfficers();
  }, [activeTab, depId]);
  useEffect(() => {
    if (activeTab === 'audit-logs') loadAuditLogs();
  }, [activeTab, depId]);

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        await handleAuthError(new Error('No token'));
        return;
      }
      const res = await departmentDashboardService.getAnalytics(depId, token);
      if (res.success) setAnalyticsData(res.data || null);
    } catch (e) {
      const handled = await handleAuthError(e);
      if (!handled) {
        console.error('Error loading analytics:', e);
        setAnalyticsData(null);
      }
    } finally { setAnalyticsLoading(false); }
  };
  const loadResourcesData = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      await handleAuthError(new Error('No token'));
      return;
    }
    try {
      if (activeResourceTab === 'internal-team') {
        setStaffLoading(true);
        const res = await departmentDashboardService.getStaff(depId, token);
        if (res.success) setStaff(res.data || []);
      } else if (activeResourceTab === 'contractors') {
        setContractorsLoading(true);
        const res = await departmentDashboardService.getContractors(depId, token);
        if (res.success) setContractors(res.data || []);
      } else if (activeResourceTab === 'zone') {
        setZoneAllocationLoading(true);
        const res = await departmentDashboardService.getZoneAllocation(depId, token);
        if (res.success) setZoneAllocation(res.data || []);
      }
    } catch (e) {
      const handled = await handleAuthError(e);
      if (!handled) {
        console.error('Error loading resources:', e);
      }
    } finally {
      setStaffLoading(false);
      setContractorsLoading(false);
      setZoneAllocationLoading(false);
    }
  };
  const loadEscalations = async () => {
    try {
      setEscalationsLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        await handleAuthError(new Error('No token'));
        return;
      }
      const res = await departmentDashboardService.getEscalations(depId, token);
      if (res.success) setEscalationsData(res.data || { escalations: [], repeatPatterns: [] });
    } catch (e) {
      const handled = await handleAuthError(e);
      if (!handled) {
        console.error('Error loading escalations:', e);
        setEscalationsData({ escalations: [], repeatPatterns: [] });
      }
    } finally { setEscalationsLoading(false); }
  };
  const loadAIInsights = async () => {
    try {
      setAiInsightsLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        await handleAuthError(new Error('No token'));
        return;
      }
      const res = await departmentDashboardService.getAiInsights(depId, token);
      if (res.success) setAiInsightsList(res.data || []);
    } catch (e) {
      const handled = await handleAuthError(e);
      if (!handled) {
        console.error('Error loading AI insights:', e);
        setAiInsightsList([]);
      }
    } finally { setAiInsightsLoading(false); }
  };
  const loadCitizenFeedback = async () => {
    try {
      setCitizenFeedbackLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        await handleAuthError(new Error('No token'));
        return;
      }
      const res = await departmentDashboardService.getCitizenFeedback(depId, token);
      if (res.success) setCitizenFeedbackData({ data: res.data || [], summary: res.summary || {} });
    } catch (e) {
      const handled = await handleAuthError(e);
      if (!handled) {
        console.error('Error loading citizen feedback:', e);
        setCitizenFeedbackData({ data: [], summary: {} });
      }
    } finally { setCitizenFeedbackLoading(false); }
  };
  const loadPredictiveMaintenance = async () => {
    try {
      setPredictiveMaintenanceLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        await handleAuthError(new Error('No token'));
        return;
      }
      const res = await departmentDashboardService.getPredictiveMaintenance(depId, token);
      if (res.success) setPredictiveMaintenanceList(res.data || []);
    } catch (e) {
      const handled = await handleAuthError(e);
      if (!handled) {
        console.error('Error loading predictive maintenance:', e);
        setPredictiveMaintenanceList([]);
      }
    } finally { setPredictiveMaintenanceLoading(false); }
  };
  const loadKnowledgeBase = async () => {
    try {
      setKnowledgeBaseLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        await handleAuthError(new Error('No token'));
        return;
      }
      const res = await departmentDashboardService.getKnowledgeBase(depId, token);
      if (res.success) setKnowledgeBaseList(res.data || []);
    } catch (e) {
      const handled = await handleAuthError(e);
      if (!handled) {
        console.error('Error loading knowledge base:', e);
        setKnowledgeBaseList([]);
      }
    } finally { setKnowledgeBaseLoading(false); }
  };

  const handleUploadDocument = async () => {
    if (!uploadFile) {
      alert('Please select a file');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('document', uploadFile);
      formData.append('title', uploadTitle || uploadFile.name);
      formData.append('description', uploadDescription);
      formData.append('category', uploadCategory);

      const token = localStorage.getItem('accessToken');
      await departmentDashboardService.uploadKnowledgeBaseDocument(depId, formData, token);

      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadCategory('General');
      loadKnowledgeBase();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleCopyLink = async (docId) => {
    try {
      setCopyingLink(docId);
      const token = localStorage.getItem('accessToken');
      const response = await departmentDashboardService.generateShareableLink(depId, docId, token, 1440); // 24 hours
      
      await navigator.clipboard.writeText(response.data.shareableLink);
      alert('Link copied to clipboard! Valid for 24 hours.');
    } catch (error) {
      console.error('Copy link error:', error);
      alert('Failed to copy link');
    } finally {
      setCopyingLink(null);
    }
  };

  const loadOfficers = async () => {
    try {
      setOfficersLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        await handleAuthError(new Error('No token'));
        return;
      }
      const res = await departmentDashboardService.getOfficers(depId, token);
      if (res.success) setOfficersList(res.data || []);
    } catch (e) {
      const handled = await handleAuthError(e);
      if (!handled) {
        console.error('Error loading officers:', e);
        setOfficersList([]);
      }
    } finally { setOfficersLoading(false); }
  };
  const loadAuditLogs = async () => {
    try {
      setAuditLogsLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        await handleAuthError(new Error('No token'));
        return;
      }
      const res = await departmentDashboardService.getAuditLogs(depId, token);
      if (res.success) setAuditLogsList(res.data || []);
    } catch (e) {
      const handled = await handleAuthError(e);
      if (!handled) {
        console.error('Error loading audit logs:', e);
        setAuditLogsList([]);
      }
    } finally { setAuditLogsLoading(false); }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/officials-portal/authentication');
        return;
      }

      const response = await departmentDashboardService.getCompleteDashboard(depId, token);
      
      if (response.success) {
        setDashboardData(response.data);
      } else {
        setError(response.message || 'Failed to load dashboard');
      }
    } catch (err) {
      const handled = await handleAuthError(err);
      if (handled) {
        return; // Already redirected to auth screen
      }
      
      // Only log unexpected errors
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadGrievances = async () => {
    try {
      setGrievancesLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        await handleAuthError(new Error('No token'));
        return;
      }
      const filters = {};
      
      if (filterStatus !== 'all') filters.status = filterStatus;
      if (filterCategory !== 'all') filters.category = filterCategory;
      if (filterPriority !== 'all') filters.priority = filterPriority;

      const response = await departmentDashboardService.getGrievances(depId, token, filters);
      
      if (response.success) {
        setGrievances(response.data || []);
      }
    } catch (err) {
      const handled = await handleAuthError(err);
      if (!handled) {
        console.error('Error loading grievances:', err);
        setGrievances([]);
      }
    } finally {
      setGrievancesLoading(false);
    }
  };

  const loadMapGrievances = async () => {
    try {
      setMapLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        await handleAuthError(new Error('No token'));
        return;
      }
      const response = await departmentDashboardService.getGrievancesForMap(depId, token);
      if (response.success) {
        setMapGrievances(response.data || []);
      }
    } catch (err) {
      const handled = await handleAuthError(err);
      if (!handled) {
        console.error('Error loading map grievances:', err);
        setMapGrievances([]);
      }
    } finally {
      setMapLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'Map View', icon: MapPin },
    { id: 'grievances', label: 'Grievances', icon: FileText },
    { id: 'budget-management', label: 'Budget Management', icon: DollarSign },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'resources', label: 'Resources', icon: Briefcase },
    { id: 'escalations', label: 'Escalations', icon: AlertTriangle },
    { id: 'ai-insights', label: 'AI Insights', icon: TrendingUp },
    { id: 'citizen-feedback', label: 'Citizen Feedback', icon: MessageSquare },
    { id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
    { id: 'officers', label: 'Officers', icon: Users },
    { id: 'audit-logs', label: 'Audit Logs', icon: ScrollText },
  ];
  const resourceSubTabs = [
    { id: 'internal-team', label: 'Internal Team' },
    { id: 'contractors', label: 'Contractors' },
    { id: 'zone', label: 'Zone Allocation' },
  ];

  // Hooks must run unconditionally (before any early return)
  const filteredMapGrievances = useMemo(() => {
    return mapGrievances.filter((g) => {
      // Search filter
      if (mapSearch.trim()) {
        const searchLower = mapSearch.toLowerCase();
        const matchesSearch = 
          (g.grievance_id || '').toLowerCase().includes(searchLower) ||
          (g.title || '').toLowerCase().includes(searchLower) ||
          (g.location || '').toLowerCase().includes(searchLower) ||
          (g.citizen_name || '').toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      // Category filter
      if (mapCategoryFilter !== 'all') {
        const category = typeof g.category === 'object' ? g.category.primary : (typeof g.category === 'string' && g.category.startsWith('{') ? JSON.parse(g.category).primary : g.category);
        if (category !== mapCategoryFilter) return false;
      }
      // Status filter
      if (mapStatusFilter !== 'all') {
        const status = (g.status || '').toLowerCase().replace(/\s/g, '_');
        const filterStatus = mapStatusFilter.toLowerCase().replace(/\s/g, '_');
        if (status !== filterStatus) return false;
      }
      // Priority filter
      if (mapPriorityFilter !== 'all') {
        const priority = (g.priority || '').toLowerCase();
        const filterPriority = mapPriorityFilter.toLowerCase();
        if (priority !== filterPriority) return false;
      }
      return true;
    });
  }, [mapGrievances, mapSearch, mapCategoryFilter, mapStatusFilter, mapPriorityFilter]);

  const markersWithCoords = useMemo(() =>
    filteredMapGrievances.filter((g) => g.lat != null && g.lng != null && Number(g.lat) && Number(g.lng)),
    [filteredMapGrievances]
  );

  // Calculate bounds and center for auto-zoom
  const mapBounds = useMemo(() => {
    if (markersWithCoords.length === 0) return null;
    const lats = markersWithCoords.map(g => Number(g.lat));
    const lngs = markersWithCoords.map(g => Number(g.lng));
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
  }, [markersWithCoords]);

  const defaultCenter = useMemo(() => {
    if (!mapBounds) return [19.1975, 73.194]; // Default to Ambernath
    const lat = (mapBounds.north + mapBounds.south) / 2;
    const lng = (mapBounds.east + mapBounds.west) / 2;
    return [lat, lng];
  }, [mapBounds]);

  // Calculate zoom level based on bounds
  const defaultZoom = useMemo(() => {
    if (!mapBounds || markersWithCoords.length === 0) return 10;
    const latDiff = mapBounds.north - mapBounds.south;
    const lngDiff = mapBounds.east - mapBounds.west;
    const maxDiff = Math.max(latDiff, lngDiff);
    // Adjust zoom based on spread of markers
    if (maxDiff > 0.1) return 10; // Wide spread
    if (maxDiff > 0.05) return 12; // Medium spread
    if (maxDiff > 0.02) return 13; // Close markers
    return 14; // Very close markers
  }, [mapBounds, markersWithCoords.length]);

  // Get unique categories for filter
  const mapCategories = useMemo(() => {
    const cats = new Set();
    mapGrievances.forEach(g => {
      const category = typeof g.category === 'object' ? g.category.primary : (typeof g.category === 'string' && g.category.startsWith('{') ? JSON.parse(g.category).primary : g.category);
      if (category) cats.add(category);
    });
    return Array.from(cats).sort();
  }, [mapGrievances]);

  // Helper functions for grievance rendering
  const formatGrievanceDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '—' : `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };
  const getCategoryLabel = (cat) => {
    if (!cat) return 'N/A';
    if (typeof cat === 'object' && cat.primary) return cat.primary;
    if (typeof cat === 'string' && cat.startsWith('{')) {
      try { return JSON.parse(cat).primary || cat; } catch { return cat; }
    }
    return cat;
  };
  const priorityPillClass = (p) => {
    const v = (p || '').toLowerCase();
    if (v === 'emergency' || v === 'urgent') return 'bg-slate-600 text-white';
    return 'bg-stone-200 text-stone-800';
  };
  const statusPillClass = (s) => {
    const v = (s || '').toLowerCase().replace(/\s/g, '_');
    if (v === 'in_progress' || v === 'in progress') return 'bg-slate-600 text-white';
    if (v === 'resolved' || v === 'closed') return 'bg-emerald-600 text-white';
    return 'bg-stone-200 text-stone-800';
  };

  // Enhanced helper functions for citizen-like view
  const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isImageUrl = (path) => {
    if (!path || typeof path !== "string") return false;
    const lower = path.toLowerCase();
    return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(lower) || lower.includes("blob") && !lower.includes(".pdf");
  };

  const formatStatus = (status, grievance = null) => {
    const s = String(status || "").toLowerCase();
    if (s === "resolved") return "Resolved";
    if (s === "rejected") return "Rejected";
    if (s === "in_progress") return "Under Working";
    if (s === "assigned") return "Accepted by Department";
    if (s === "submitted" || s === "pending" || !status) return "Submitted";
    return status;
  };

  const getStatusColor = (status, grievance = null) => {
    const display = formatStatus(status, grievance);
    const d = String(display).toLowerCase();
    if (d === "resolved") return "bg-green-100 text-green-800";
    if (d === "accepted by department") return "bg-blue-100 text-blue-800";
    if (d === "under working") return "bg-yellow-100 text-yellow-800";
    if (d === "rejected") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  // Build enhanced timeline
  const buildTimeline = (grievance) => {
    const timeline = [];
    
    timeline.push({
      stage: "submitted",
      label: "Grievance Submitted",
      description: "Grievance has been received",
      at: grievance.created_at,
      icon: FileText,
      completed: true
    });
    
    if (grievance.department_id || grievance.assigned_officer_id) {
      timeline.push({
        stage: "accepted",
        label: "Accepted by Department",
        description: grievance.department_name ? `Assigned to ${grievance.department_name}` : "Assigned to department",
        at: grievance.updated_at,
        icon: Building2,
        completed: true
      });
    }
    
    const status = String(grievance.status || "").toLowerCase();
    if (status === "in_progress" || status === "assigned") {
      timeline.push({
        stage: "working",
        label: "Under Working",
        description: grievance.officer_name ? `Being handled by ${grievance.officer_name}` : "Work in progress",
        at: grievance.updated_at,
        icon: Activity,
        completed: status === "in_progress"
      });
    }
    
    if (status === "resolved") {
      timeline.push({
        stage: "resolved",
        label: "Resolved",
        description: "Grievance has been successfully resolved",
        at: grievance.resolved_at || grievance.updated_at,
        icon: CheckCircle,
        completed: true
      });
    } else if (status === "rejected") {
      timeline.push({
        stage: "rejected",
        label: "Rejected",
        description: "Grievance was rejected",
        at: grievance.updated_at,
        icon: X,
        completed: true
      });
    }
    
    return timeline;
  };

  // Map initialization and update functions
  const initializeMap = (data) => {
    if (mapInstanceRef.current || !mapRef.current) return;

    const map = L.map(mapRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    markersLayerRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 50
    });

    map.addLayer(markersLayerRef.current);
    mapInstanceRef.current = map;

    updateMapMarkers(data);
  };

  const updateMapMarkers = (data) => {
    if (!markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const validGrievances = data.filter(g => 
      g.latitude && g.longitude && 
      !isNaN(g.latitude) && !isNaN(g.longitude) &&
      g.latitude >= -90 && g.latitude <= 90 &&
      g.longitude >= -180 && g.longitude <= 180
    );

    validGrievances.forEach(grievance => {
      const marker = L.marker([grievance.latitude, grievance.longitude]);
      
      const popupContent = `
        <div style="font-family: sans-serif; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1A1A1A;">
            ${grievance.grievance_id || 'N/A'}
          </h3>
          <p style="margin: 4px 0; font-size: 12px; color: #6B6B6B;">
            <strong>Status:</strong> ${formatStatus(grievance.status, grievance)}
          </p>
          <p style="margin: 4px 0; font-size: 12px; color: #6B6B6B;">
            <strong>Category:</strong> ${getCategoryLabel(grievance.category) || 'N/A'}
          </p>
          <p style="margin: 4px 0; font-size: 12px; color: #6B6B6B;">
            <strong>Location:</strong> ${grievance.location || grievance.location_address || 'N/A'}
          </p>
          <button 
            onclick="window.dispatchEvent(new CustomEvent('openGrievanceDetail', { detail: '${grievance.grievance_id}' }))"
            style="margin-top: 8px; padding: 6px 12px; background: #7D6E5C; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;"
          >
            View Details
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 250 });
      markersLayerRef.current.addLayer(marker);
    });

    if (validGrievances.length > 0 && mapInstanceRef.current) {
      const bounds = L.latLngBounds(
        validGrievances.map(g => [g.latitude, g.longitude])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // Define filteredGrievances first before using it in useEffect
  const filteredGrievances = useMemo(() => {
    if (!grievanceSearch.trim()) return grievances;
    const q = grievanceSearch.trim().toLowerCase();
    return grievances.filter(
      (g) =>
        (g.grievance_id || '').toLowerCase().includes(q) ||
        (g.citizen_name || '').toLowerCase().includes(q) ||
        (g.citizen_phone || '').toLowerCase().includes(q) ||
        (g.location || '').toLowerCase().includes(q) ||
        getCategoryLabel(g.category).toLowerCase().includes(q)
    );
  }, [grievances, grievanceSearch]);

  // Listen for custom event to open detail modal from map
  useEffect(() => {
    const handleOpenDetail = (e) => {
      setSelectedGrievanceId(e.detail);
    };
    window.addEventListener('openGrievanceDetail', handleOpenDetail);
    return () => window.removeEventListener('openGrievanceDetail', handleOpenDetail);
  }, []);

  // Initialize map when grievances load
  useEffect(() => {
    if (activeTab === 'grievances' && grievances.length > 0 && mapRef.current) {
      setTimeout(() => initializeMap(grievances), 100);
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [activeTab, grievances]);

  // Update map when filtered grievances change
  useEffect(() => {
    if (mapInstanceRef.current && filteredGrievances.length > 0) {
      updateMapMarkers(filteredGrievances);
    }
  }, [filteredGrievances]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-[#FFFBF5] to-[#FFF5E8] flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-gray-900 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error in a toast or inline, but keep the layout
  const hasData = dashboardData && dashboardData.grievanceOverview;
  
  if (!dashboardData) {
    return null;
  }

  const { 
    department,
    grievanceOverview, 
    performanceMetrics, 
    resourceHealth, 
    tenderProjectStatus,
    departmentHealthScore,
    zonePerformance,
    aiInsights,
    alertsRiskMonitoring,
    recentActivityFeed,
    categoryWiseGrievances = [],
    emergencyGrievances = [],
    urgentGrievances = [],
    recentGrievances = []
  } = dashboardData;

  const renderOverview = () => {
    // Show empty state if no data
    if (!grievanceOverview && !performanceMetrics && !departmentHealthScore) {
      return (
        <div className="bg-white rounded-2xl p-12 border border-stone-200 shadow-lg text-center">
          <AlertTriangle className="w-20 h-20 text-stone-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-stone-900 mb-3">No Data Available</h2>
          <p className="text-stone-600 mb-8 max-w-md mx-auto">
            Dashboard data has not been seeded yet. Please contact your administrator or run the seeding script.
          </p>
          <button
            onClick={loadDashboardData}
            className="px-8 py-3 bg-stone-800 text-white rounded-lg font-semibold hover:bg-stone-700 transition-colors shadow-md"
          >
            Refresh Dashboard
          </button>
        </div>
      );
    }

    return (
    <div className="space-y-6">
      {/* Top Row - Emergency & Urgent Grievances + Project Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Emergency Grievances */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-red-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Emergency Grievances
            </h3>
            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
              {emergencyGrievances.length}
            </span>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {emergencyGrievances.length > 0 ? (
              emergencyGrievances.map((grv) => (
                <div key={grv.grievance_id} className="p-3 bg-red-50 rounded-xl border border-red-200 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-red-700">{grv.grievance_id}</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      grv.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {grv.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{grv.category || 'General'}</p>
                  <p className="text-xs text-gray-600 mt-1">{grv.location || 'Location not specified'}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No emergency grievances</p>
            )}
          </div>
        </div>

        {/* Urgent Grievances */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertCircleIcon className="w-5 h-5 text-orange-600" />
              Urgent Grievances
            </h3>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
              {urgentGrievances.length}
            </span>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {urgentGrievances.length > 0 ? (
              urgentGrievances.map((grv) => (
                <div key={grv.grievance_id} className="p-3 bg-orange-50 rounded-xl border border-orange-200 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-orange-700">{grv.grievance_id}</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      grv.status === 'assigned' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {grv.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{grv.category || 'General'}</p>
                  <p className="text-xs text-gray-600 mt-1">{grv.location || 'Location not specified'}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No urgent grievances</p>
            )}
          </div>
        </div>

        {/* Project Stats */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-[#F5E6D3]">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Project Overview</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border-2 bg-blue-50 border-blue-200">
              <p className="text-2xl font-bold text-gray-900">{tenderProjectStatus?.activeTenders || 0}</p>
              <p className="text-xs font-semibold text-gray-700 mt-1">Active Tenders</p>
            </div>
            <div className="p-4 rounded-xl border-2 bg-green-50 border-green-200">
              <p className="text-2xl font-bold text-gray-900">{tenderProjectStatus?.activeProjects || 0}</p>
              <p className="text-xs font-semibold text-gray-700 mt-1">Active Projects</p>
            </div>
            <div className="p-4 rounded-xl border-2 bg-yellow-50 border-yellow-200">
              <p className="text-2xl font-bold text-gray-900">{tenderProjectStatus?.projectsAtRisk || 0}</p>
              <p className="text-xs font-semibold text-gray-700 mt-1">Projects at Risk</p>
            </div>
            <div className="p-4 rounded-xl border-2 bg-red-50 border-red-200">
              <p className="text-2xl font-bold text-gray-900">{tenderProjectStatus?.projectsDelayed || 0}</p>
              <p className="text-xs font-semibold text-gray-700 mt-1">Projects Delayed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts & Risks */}
      {alertsRiskMonitoring && alertsRiskMonitoring.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-4 shadow-xl border-2 border-red-800">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <AlertCircleIcon className="w-5 h-5" />
            Critical Alerts & Risks
          </h3>
          {alertsRiskMonitoring.map((alert, index) => (
            <div key={alert.id || `alert-${index}`} className="bg-white rounded-lg p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-3 last:mb-0">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                      {alert.priority || 'High'}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
                      {alert.type || 'EQUIPMENT'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{alert.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">Action: {alert.action || 'Review required'}</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-bold rounded-lg hover:shadow-lg transition-all whitespace-nowrap">
                Take Action
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Single Row - Recent Activity Feed & Recent Grievances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Feed */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-[#F5E6D3]">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-900" />
            Recent Activity Feed
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentActivityFeed && recentActivityFeed.length > 0 ? (
              recentActivityFeed.map((activity, index) => (
                <div key={activity.id || `activity-${index}`} className="p-3 bg-[#FFF8F0] rounded-xl border border-[#F5E6D3] hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{activity.action} - {activity.description}</p>
                      <p className="text-xs text-gray-600 mt-1">{activity.timestamp} • {activity.category || 'General'}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>

        {/* Recent Grievances */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-[#F5E6D3]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-900" />
              Recent Grievances
            </h3>
            <button 
              onClick={() => setActiveTab('grievances')}
              className="text-sm font-semibold text-gray-900 hover:text-black flex items-center gap-1"
            >
              View More
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentGrievances && recentGrievances.length > 0 ? (
              recentGrievances.map((grv) => (
                <div key={grv.grievance_id} className="p-3 bg-[#FFF8F0] rounded-xl border border-[#F5E6D3] hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <span className="text-xs font-bold text-gray-700">{grv.grievance_id}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        grv.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                        grv.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {grv.status?.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        grv.priority === 'Emergency' ? 'bg-red-100 text-red-700' :
                        grv.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                        grv.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {grv.priority}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{grv.category || 'General'}</p>
                  <p className="text-xs text-gray-600 mt-1">{grv.location || 'Location not specified'}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent grievances</p>
            )}
          </div>
        </div>
      </div>

      {/* Department Health Score */}
      {departmentHealthScore && (
        <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-stone-900 mb-2">Department Health Score</h2>
              <p className="text-stone-600 text-sm font-medium">Overall Performance Indicator</p>
            </div>
            <div className="text-center">
              <div className="text-7xl font-bold text-stone-900">{departmentHealthScore.overallScore}</div>
              <div className="text-2xl font-semibold text-stone-500">/ {departmentHealthScore.maxScore}</div>
              <div className="mt-3 bg-stone-800 text-white px-6 py-2 rounded-lg font-semibold text-sm shadow-md">
                {departmentHealthScore.status} • {departmentHealthScore.trend}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {grievanceOverview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <FileText className="w-8 h-8 text-stone-600" />
              <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-3 py-1 rounded-lg border border-stone-200">
                {grievanceOverview.monthlyTrend}
              </span>
            </div>
            <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Total Grievances</h3>
            <p className="text-3xl font-bold text-stone-900 mt-2">{grievanceOverview.totalGrievances}</p>
            <p className="text-xs text-stone-500 mt-1">This Month</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-8 h-8 text-stone-600" />
              <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-3 py-1 rounded-lg border border-stone-200">PENDING</span>
            </div>
            <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Pending</h3>
            <p className="text-3xl font-bold text-stone-900 mt-2">{grievanceOverview.pendingGrievances}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="w-8 h-8 text-stone-600" />
              <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-3 py-1 rounded-lg border border-stone-200">RESOLVED</span>
            </div>
            <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Resolved</h3>
            <p className="text-3xl font-bold text-stone-900 mt-2">{grievanceOverview.resolvedGrievances}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <AlertTriangle className="w-8 h-8 text-stone-600" />
              <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-3 py-1 rounded-lg border border-stone-200">OVERDUE</span>
            </div>
            <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Overdue</h3>
            <p className="text-3xl font-bold text-stone-900 mt-2">{grievanceOverview.overdueGrievances}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <AlertTriangle className="w-8 h-8 text-stone-600" />
              <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-3 py-1 rounded-lg border border-stone-200">EMERGENCY</span>
            </div>
            <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Emergency</h3>
            <p className="text-3xl font-bold text-stone-900 mt-2">{grievanceOverview.emergencyGrievances}</p>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {performanceMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-md hover:shadow-lg transition-all">
            <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-3">KPI Score</h3>
            <div className="flex items-end gap-2">
              <p className="text-4xl font-bold text-stone-900">{performanceMetrics.kpiScore}%</p>
              <span className="text-sm font-semibold text-stone-600 mb-1">{performanceMetrics.performanceTrend}</span>
            </div>
            <p className="text-xs text-stone-500 mt-2">Target: {performanceMetrics.kpiTarget}%</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-md hover:shadow-lg transition-all">
            <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-3">SLA Compliance</h3>
            <p className="text-4xl font-bold text-stone-900">{performanceMetrics.slaCompliance}%</p>
            <p className="text-xs text-stone-500 mt-2">Within Deadline</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-md hover:shadow-lg transition-all">
            <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-3">Avg Resolution</h3>
            <p className="text-4xl font-bold text-stone-900">{performanceMetrics.avgResolutionTime}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-md hover:shadow-lg transition-all">
            <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-3">Citizen Rating</h3>
            <div className="flex items-center gap-2">
              <p className="text-4xl font-bold text-stone-900">{performanceMetrics.citizenSatisfaction}</p>
              <span className="text-stone-400 text-2xl">★</span>
            </div>
            <p className="text-xs text-stone-500 mt-2">Out of 5.0</p>
          </div>
        </div>
      )}

      {/* Resource Health */}
      {resourceHealth && (
        <div className="bg-white rounded-xl border border-stone-200 p-8 shadow-lg">
          <h3 className="text-xl font-bold text-stone-900 mb-6">Resource Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-stone-50 rounded-xl p-5 border border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-stone-700">Staff</h4>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  resourceHealth.staff.status === 'Shortage' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {resourceHealth.staff.status}
                </span>
              </div>
              <p className="text-2xl font-bold text-stone-900">{resourceHealth.staff.available} / {resourceHealth.staff.total}</p>
              <p className="text-xs text-stone-600 mt-1">Utilization: {resourceHealth.staff.utilizationRate}%</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-5 border border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-stone-700">Equipment</h4>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-800">
                  {resourceHealth.equipment.status}
                </span>
              </div>
              <p className="text-2xl font-bold text-stone-900">{resourceHealth.equipment.available} / {resourceHealth.equipment.total}</p>
              <p className="text-xs text-stone-600 mt-1">Available: {resourceHealth.equipment.availabilityPercent}%</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-5 border border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-stone-700">Budget</h4>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-800">
                  {resourceHealth.budget.status}
                </span>
              </div>
              <p className="text-lg font-bold text-stone-900">
                ₹{resourceHealth.budget.allocated >= 10000000 
                  ? (resourceHealth.budget.allocated / 10000000).toFixed(1) + ' Cr'
                  : resourceHealth.budget.allocated >= 100000
                  ? (resourceHealth.budget.allocated / 100000).toFixed(1) + ' L'
                  : resourceHealth.budget.allocated.toLocaleString('en-IN')
                }
              </p>
              <p className="text-xs text-stone-600 mt-1">Used: {resourceHealth.budget.utilizationPercent}%</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-5 border border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-stone-700">Materials</h4>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  resourceHealth.materials.status.includes('Critical') ? 'bg-red-100 text-red-800' :
                  resourceHealth.materials.status.includes('Low') ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {resourceHealth.materials.status}
                </span>
              </div>
              <div className="flex gap-2 text-xs text-stone-700">
                <span>{resourceHealth.materials.adequate} Adequate</span>
                <span>{resourceHealth.materials.lowStock} Low</span>
                <span>{resourceHealth.materials.critical} Critical</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights */}
      {aiInsights && aiInsights.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-8 h-8 text-stone-600" />
            <h3 className="text-xl font-bold text-stone-900">AI Insights & Recommendations</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiInsights.slice(0, 4).map((insight, index) => (
              <div key={index} className="bg-stone-50/50 rounded-xl p-5 border border-stone-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-lg border ${
                    insight.priority === 'High' ? 'bg-stone-100 text-stone-800 border-stone-200' :
                    'bg-stone-50 text-stone-700 border-stone-200'
                  }`}>
                    {insight.priority} Priority
                  </span>
                  <span className="text-xs font-semibold text-stone-500">
                    {Math.round((insight.confidence || 0) * 100)}% Confidence
                  </span>
                </div>
                <p className="text-sm font-semibold text-stone-900 mb-3">{insight.message}</p>
                <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
                  <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1">Recommendation:</p>
                  <p className="text-xs font-medium text-stone-800">{insight.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical Alerts & Risks */}
      {alertsRiskMonitoring && alertsRiskMonitoring.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="w-8 h-8 text-stone-600" />
            <h3 className="text-xl font-bold text-stone-900">Critical Alerts & Risks</h3>
          </div>
          <div className="space-y-4">
            {alertsRiskMonitoring.map((alert, idx) => (
              <div key={idx} className="flex items-center justify-between p-5 rounded-xl border border-stone-200 bg-stone-50">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 text-xs font-semibold rounded ${
                      alert.riskLevel === 'Critical' ? 'bg-red-100 text-red-800' :
                      alert.riskLevel === 'High' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {alert.riskLevel}
                    </span>
                    <span className="text-sm font-semibold text-stone-700">{alert.category}</span>
                  </div>
                  <p className="text-sm text-stone-900 mb-1">{alert.description}</p>
                  <p className="text-xs text-stone-600">Action: {alert.action}</p>
                </div>
                <button className="px-6 py-2 bg-stone-800 text-white rounded-lg font-semibold hover:bg-stone-700 transition-colors">
                  Take Action
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Feed */}
      {recentActivityFeed && recentActivityFeed.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-8 shadow-lg">
          <h3 className="text-xl font-bold text-stone-900 mb-6">Recent Activity Feed</h3>
          <div className="space-y-4">
            {recentActivityFeed.slice(0, 6).map((activity, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 rounded-lg border border-stone-200 bg-stone-50">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.category === 'Grievance' ? 'bg-red-500' :
                  activity.category === 'AI' ? 'bg-orange-500' :
                  activity.category === 'Resource' ? 'bg-yellow-500' :
                  'bg-stone-400'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-900">{activity.description}</p>
                  <p className="text-xs text-stone-500 mt-1">
                    {new Date(activity.timestamp).toLocaleString()} • {activity.category}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
    );
  };

  const renderGrievances = () => (
    <div className="space-y-6">
      {/* Search + Filters */}
      <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-md">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search grievances..."
              value={grievanceSearch}
              onChange={(e) => setGrievanceSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
          >
            <option value="all">All Categories</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
          >
            <option value="all">All Priorities</option>
            <option value="Emergency">Emergency</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Grievances Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-md overflow-hidden">
        {grievancesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-stone-500" />
            <span className="ml-3 text-stone-600">Loading grievances...</span>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Citizen</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Officer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredGrievances.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-stone-500">
                    No grievances found
                  </td>
                </tr>
              ) : (
                filteredGrievances.map((grievance) => (
                  <tr key={grievance.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-stone-900">{grievance.grievance_id}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-stone-900">{grievance.citizen_name}</div>
                      <div className="text-xs text-stone-500">{grievance.citizen_phone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">{getCategoryLabel(grievance.category)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${priorityPillClass(grievance.priority)}`}>
                        {grievance.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">{grievance.location}</td>
                    <td className="px-4 py-3 text-sm text-stone-700">{formatGrievanceDate(grievance.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 font-semibold rounded ${statusPillClass(grievance.status)} ${
                        (grievance.status || '').toLowerCase().replace(/\s/g, '_') === 'in_progress' || 
                        (grievance.status || '').toLowerCase() === 'in progress'
                          ? 'text-[10px]' : 'text-xs'
                      }`}>
                        {(grievance.status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">{grievance.officer_name || 'Unassigned'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedGrievanceId(grievance.grievance_id)}
                          className="p-2 rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-lg border-2 border-stone-800 text-stone-800 hover:bg-stone-100 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Grievance Details Modal */}
      {selectedGrievanceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedGrievanceId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-bold text-stone-900">Grievance Details</h2>
              <button type="button" onClick={() => setSelectedGrievanceId(null)} className="p-2 rounded-lg hover:bg-stone-100">
                <X className="w-5 h-5 text-stone-600" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {grievanceDetailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 animate-spin text-stone-500" />
                  <span className="ml-3 text-stone-600">Loading...</span>
                </div>
              ) : grievanceDetail ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase">Grievance ID</p>
                      <p className="text-base font-semibold text-stone-900">{grievanceDetail.grievance_id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase">Status</p>
                      <p>
                        <span className={`inline-block px-2 py-1 text-sm font-semibold rounded ${statusPillClass(grievanceDetail.status)}`}>
                          {(grievanceDetail.status || '').replace(/_/g, ' ')}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-800 mb-2">Citizen Information</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-stone-500">Name</p>
                        <p className="font-medium text-stone-900">{grievanceDetail.citizen_name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-stone-500">Phone</p>
                        <p className="font-medium text-stone-900">{grievanceDetail.citizen_phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-stone-500">Email</p>
                        <p className="font-medium text-stone-900">{grievanceDetail.citizen_email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-stone-500">Location</p>
                        <p className="font-medium text-stone-900">{grievanceDetail.location || '—'}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-800 mb-2">Description</h3>
                    <p className="text-sm text-stone-700">{grievanceDetail.description || '—'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-800 mb-3">Grievance Workflow Timeline</h3>
                    <div className="space-y-4">
                      {(() => {
                        const stages = (grievanceDetail.workflow && grievanceDetail.workflow.stages) || [];
                        return stages.length === 0 ? (
                          <p className="text-sm text-stone-500">No workflow stages recorded.</p>
                        ) : (
                          stages.map((stage, idx) => {
                            const isCompleted = (stage.status || '').toLowerCase() === 'completed';
                            const isCurrent = (stage.status || '').toLowerCase() === 'current';
                            const isPending = (stage.status || '').toLowerCase() === 'pending';
                            const dateStr = stage.timestamp
                              ? new Date(stage.timestamp).toLocaleString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                              : '—';
                            return (
                              <div key={idx} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    isCompleted ? 'bg-emerald-600 text-white' : isCurrent ? 'bg-slate-600 text-white' : 'bg-stone-200 text-stone-600'
                                  }`}>
                                    {isCompleted ? '✓' : idx + 1}
                                  </div>
                                  {idx < stages.length - 1 && <div className="w-0.5 flex-1 min-h-[24px] bg-stone-200" />}
                                </div>
                                <div className="flex-1 pb-4">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-stone-900">{stage.stage}</span>
                                    <span className="text-xs text-stone-500">{dateStr}</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                      isCompleted ? 'bg-emerald-100 text-emerald-800' : isCurrent ? 'bg-slate-600 text-white' : 'bg-stone-200 text-stone-600'
                                    }`}>
                                      {isCompleted ? 'COMPLETED' : isCurrent ? 'CURRENT' : 'PENDING'}
                                    </span>
                                  </div>
                                  {stage.officer && (
                                    <p className="text-xs text-stone-600 mt-1"><span className="font-medium">Officer</span> {stage.officer}</p>
                                  )}
                                  {stage.action && <p className="text-sm text-stone-700 mt-1"><span className="font-medium">Action</span> {stage.action}</p>}
                                  {stage.notes && <p className="text-sm text-stone-600 mt-1"><span className="font-medium">Notes</span> {stage.notes}</p>}
                                  {stage.attachments && stage.attachments.length > 0 && (
                                    <p className="text-xs text-stone-500 mt-1">Attachments: {stage.attachments.join(', ')}</p>
                                  )}
                                  {stage.gpsLocation && (
                                    <p className="text-xs text-stone-500 mt-1">GPS: {typeof stage.gpsLocation === 'object' ? `${stage.gpsLocation.lat}, ${stage.gpsLocation.lng}` : stage.gpsLocation}</p>
                                  )}
                                  {stage.progressPercentage != null && (
                                    <p className="text-xs text-stone-600 mt-1">Progress: {stage.progressPercentage}%</p>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        );
                      })()}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-stone-500">Could not load grievance details.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAnalytics = () => {
    if (analyticsLoading) {
      return (
        <div className="flex items-center justify-center py-24 bg-white rounded-xl border border-stone-200">
          <Loader className="w-8 h-8 animate-spin text-stone-500" />
          <span className="ml-3 text-stone-600">Loading analytics...</span>
        </div>
      );
    }
    const data = analyticsData || {};
    const byCategory = data.byCategory || [];
    const byZone = data.byZone || [];
    const monthly = data.monthly || [];
    
    // Find department data for selected category
    const selectedDeptData = selectedCategory 
      ? byZone.find(z => z.zone_name === selectedCategory) 
      : null;
    
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-stone-900">Analytics</h2>
        
        {/* Two Column Layout: Bars on Left, Department Card on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Complaints by Category Bars */}
          <div className="bg-white rounded-xl p-6 border border-stone-200">
            <h3 className="text-lg font-semibold text-stone-800 mb-4">Complaints by Category</h3>
            {byCategory.length === 0 ? <p className="text-stone-500">No data</p> : (
              <div className="space-y-3">
                {byCategory.map((row, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 cursor-pointer hover:bg-stone-50 p-2 rounded-lg transition-colors"
                    onClick={() => {
                      // Find matching department in byZone
                      const matchingDept = byZone.find(z => 
                        z.zone_name.toLowerCase().includes(row.category_name.toLowerCase()) ||
                        row.category_name.toLowerCase().includes(z.zone_name.toLowerCase())
                      ) || byZone[i % byZone.length]; // Fallback to index-based matching
                      
                      setSelectedCategory(matchingDept?.zone_name || null);
                    }}
                  >
                    <div className="w-48 text-sm font-medium text-stone-700 truncate">{row.category_name || 'Uncategorized'}</div>
                    <div className="flex-1 h-8 bg-stone-100 rounded overflow-hidden">
                      <div 
                        className="h-full bg-stone-600 rounded hover:bg-stone-700 transition-colors" 
                        style={{ width: `${Math.min(100, (row.count / Math.max(1, byCategory[0]?.count || 1)) * 100)}%` }} 
                      />
                    </div>
                    <span className="text-sm font-semibold text-stone-900 w-16">{row.count}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-stone-500 mt-4 italic">Click on a bar to view department details</p>
          </div>
          
          {/* Right Column: Selected Department Card */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-stone-800">Department Details</h3>
            {selectedDeptData ? (
              <div className="bg-white rounded-xl p-6 border-2 border-[#D4AF37] shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xl font-bold text-stone-900">{selectedDeptData.zone_name}</h4>
                  <button 
                    onClick={() => setSelectedCategory(null)}
                    className="text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mb-4">
                  <span className="px-4 py-2 bg-stone-100 text-stone-700 text-sm font-semibold rounded-full">
                    {selectedDeptData.total} Total Grievances
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-200">
                    <p className="text-xs text-green-700 font-semibold mb-2 uppercase tracking-wide">Solved</p>
                    <p className="text-4xl font-bold text-green-600">{selectedDeptData.resolved || 0}</p>
                    <p className="text-xs text-green-600 mt-1">Grievances Resolved</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border-2 border-amber-200">
                    <p className="text-xs text-amber-700 font-semibold mb-2 uppercase tracking-wide">Pending</p>
                    <p className="text-4xl font-bold text-amber-600">{(selectedDeptData.total || 0) - (selectedDeptData.resolved || 0)}</p>
                    <p className="text-xs text-amber-600 mt-1">Grievances Left</p>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                  <div className="flex items-center justify-between text-sm text-stone-700 mb-2">
                    <span className="font-semibold">Resolution Rate</span>
                    <span className="text-lg font-bold text-[#D4AF37]">
                      {selectedDeptData.total > 0 ? Math.round((selectedDeptData.resolved / selectedDeptData.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-3">
                    <div 
                      className="h-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500 shadow-sm" 
                      style={{ width: `${selectedDeptData.total > 0 ? Math.round((selectedDeptData.resolved / selectedDeptData.total) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 border-2 border-dashed border-stone-300 text-center">
                <svg className="w-16 h-16 text-stone-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-stone-500 font-medium">Click on a category bar to view details</p>
                <p className="text-xs text-stone-400 mt-2">Select a category from the left to see solved and pending grievances</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Monthly Performance Table - Only Table, No Cards Below */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <h3 className="text-lg font-semibold text-stone-800 p-4 border-b border-stone-200">Monthly Performance</h3>
          <table className="w-full">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Month</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Received</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Resolved</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Avg Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {monthly.map((m, i) => (
                <tr key={i} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 text-stone-800 font-medium">{m.month_label}</td>
                  <td className="px-4 py-3 text-stone-700">{m.received}</td>
                  <td className="px-4 py-3 text-stone-700">{m.resolved}</td>
                  <td className="px-4 py-3 text-stone-700">{m.avg_time_days != null ? `${m.avg_time_days} days` : '-'}</td>
                </tr>
              ))}
              {monthly.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-stone-500">No monthly data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderResources = () => (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto border-b border-stone-200 pb-2">
        {resourceSubTabs.map((t) => (
          <button key={t.id} onClick={() => setActiveResourceTab(t.id)} className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap ${activeResourceTab === t.id ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>{t.label}</button>
        ))}
      </div>
      {activeResourceTab === 'internal-team' && (staffLoading ? <div className="flex items-center justify-center py-12"><Loader className="w-8 h-8 animate-spin text-stone-500" /></div> : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-md">
          <h3 className="text-xl font-bold p-6 border-b border-stone-200 text-stone-900 uppercase tracking-wide">Internal Team - Small Work Specialists</h3>
          <p className="px-6 py-3 text-sm text-stone-600 bg-stone-50 border-b border-stone-200">
            Internal team members handle small-scale grievances and maintenance work that doesn't require contractor involvement.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Staff ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Zone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Workload</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Specialization</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {staff.map((s, i) => {
                  const statusColors = {
                    'available': 'bg-green-100 text-green-800',
                    'busy': 'bg-amber-100 text-amber-800',
                    'on_field': 'bg-blue-100 text-blue-800',
                    'on_leave': 'bg-stone-100 text-stone-600'
                  };
                  const statusLabel = s.status === 'on_field' ? 'On Field' : s.status === 'on_leave' ? 'On Leave' : s.status === 'busy' ? 'Busy' : 'Available';
                  const perfScore = Number(s.performance_score) || 0;
                  const avgRes = s.avg_resolution_time != null ? `${s.avg_resolution_time}d avg` : '';
                  return (
                    <tr key={i} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-stone-900">{s.staff_id}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-stone-900">{s.full_name}</div>
                        {s.phone && <div className="text-xs text-stone-500">{s.phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-700">{s.role}</td>
                      <td className="px-4 py-3 text-sm text-stone-700">{s.zone || s.ward || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusColors[s.status] || statusColors.available}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-700">{s.workload ?? 0} tasks</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{s.specialization || '-'}</td>
                      <td className="px-4 py-3 text-sm text-stone-700">
                        {perfScore > 0 ? `${Number(perfScore).toFixed(0)}%` : '-'} {avgRes && <span className="text-xs text-stone-500">{avgRes}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {staff.length === 0 && !staffLoading && <p className="p-8 text-center text-stone-500">No staff data</p>}
        </div>
      ))}
      {activeResourceTab === 'equipment' && (equipmentLoading ? <div className="flex items-center justify-center py-12"><Loader className="w-8 h-8 animate-spin text-stone-500" /></div> : (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-stone-900 uppercase tracking-wide">Equipment Inventory</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipment.map((e, i) => {
              const statusColors = {
                'available': 'bg-green-100 text-green-800',
                'in_use': 'bg-amber-100 text-amber-800',
                'maintenance': 'bg-red-100 text-red-800'
              };
              const statusLabel = e.status === 'in_use' ? 'In Use' : e.status === 'maintenance' ? 'Maintenance' : 'Available';
              return (
                <div key={i} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-stone-900 text-lg">{e.name}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[e.status] || statusColors.available}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mb-3">{e.equipment_id}</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-stone-700"><span className="font-semibold">Location:</span> {e.location || 'Department Yard'}</p>
                    <p className="text-stone-700"><span className="font-semibold">Assigned To:</span> {e.assigned_to_name || 'None'}</p>
                    <p className="text-stone-700"><span className="font-semibold">Condition:</span> <span className="capitalize">{e.condition || 'Good'}</span></p>
                    <p className="text-stone-700"><span className="font-semibold">Utilization:</span> {e.utilization_rate ?? 0}%</p>
                    {e.next_maintenance && (
                      <p className="text-stone-700"><span className="font-semibold">Next Maintenance:</span> {new Date(e.next_maintenance).toLocaleDateString('en-GB')}</p>
                    )}
                    {e.specifications && typeof e.specifications === 'object' && (
                      <p className="text-xs text-stone-500 mt-2">{JSON.stringify(e.specifications).replace(/[{}"]/g, '').substring(0, 50)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {equipment.length === 0 && !equipmentLoading && <p className="text-center text-stone-500 py-8">No equipment data</p>}
        </div>
      ))}
      {activeResourceTab === 'materials' && (materialsLoading ? <div className="flex items-center justify-center py-12"><Loader className="w-8 h-8 animate-spin text-stone-500" /></div> : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-md">
          <h3 className="text-xl font-bold p-6 border-b border-stone-200 text-stone-900 uppercase tracking-wide">Material Inventory</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Material ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Available</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Min Threshold</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-600">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {materials.map((m, i) => {
                  const statusColors = {
                    'adequate': 'bg-green-100 text-green-800',
                    'critical': 'bg-red-100 text-red-800',
                    'low_stock': 'bg-amber-100 text-amber-800'
                  };
                  const statusLabel = m.status === 'low_stock' ? 'Low Stock' : m.status === 'critical' ? 'Critical' : 'Adequate';
                  return (
                    <tr key={i} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-stone-900">{m.material_id}</td>
                      <td className="px-4 py-3 text-sm text-stone-900">{m.name}</td>
                      <td className="px-4 py-3 text-sm text-stone-900"><span className="font-bold">{m.available_quantity}</span> {m.unit}</td>
                      <td className="px-4 py-3 text-sm text-stone-700">{m.min_threshold} {m.unit}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${statusColors[m.status] || statusColors.adequate}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-700">{m.location || '-'}</td>
                      <td className="px-4 py-3 text-sm text-stone-700">{m.supplier || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {materials.length === 0 && !materialsLoading && <p className="p-8 text-center text-stone-500">No materials data</p>}
        </div>
      ))}
      {activeResourceTab === 'contractors' && (contractorsLoading ? <div className="flex items-center justify-center py-12"><Loader className="w-8 h-8 animate-spin text-stone-500" /></div> : (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-stone-900 uppercase tracking-wide">Contractor Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contractors.map((c, i) => {
              const aiAnalysis = c.ai_analysis || {};
              const projectTypes = aiAnalysis.project_types_accepted || [];
              const resources = aiAnalysis.resources_available || {};
              const workHistory = aiAnalysis.work_history || {};
              const performanceInsights = aiAnalysis.performance_insights || {};
              
              return (
                <div key={i} className="bg-white rounded-xl border-2 border-stone-200 shadow-md hover:shadow-xl transition-all overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-stone-800 to-stone-900 text-white p-5">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-xl mb-1">{c.company_name}</h4>
                        <p className="text-xs opacity-90">{c.contractor_id}</p>
                      </div>
                      <div className="text-right ml-3">
                        <div className="text-3xl font-bold text-[#D4AF37]">{c.performance_score ?? 0}%</div>
                        <div className="text-xs opacity-90">Performance</div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="p-4 bg-stone-50 border-b border-stone-200">
                    <p className="text-sm text-stone-700 mb-1"><span className="font-semibold">Contact:</span> {c.contact_person}</p>
                    <p className="text-sm text-stone-700"><span className="font-semibold">Phone:</span> {c.phone || '-'}</p>
                  </div>

                  {/* Project Types Accepted */}
                  {projectTypes.length > 0 && (
                    <div className="p-4 border-b border-stone-200">
                      <p className="text-xs font-semibold text-stone-600 mb-2">PROJECT TYPES ACCEPTED</p>
                      <div className="flex flex-wrap gap-1">
                        {projectTypes.map((type, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resources Available */}
                  {(resources.workers || resources.equipment || resources.vehicles) && (
                    <div className="p-4 border-b border-stone-200">
                      <p className="text-xs font-semibold text-stone-600 mb-3">RESOURCES AVAILABLE</p>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {resources.workers && (
                          <div className="bg-green-50 rounded-lg p-2 text-center border border-green-200">
                            <div className="text-lg font-bold text-green-700">{resources.workers}</div>
                            <div className="text-xs text-green-600">Workers</div>
                          </div>
                        )}
                        {resources.vehicles && (
                          <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-200">
                            <div className="text-lg font-bold text-blue-700">{resources.vehicles}</div>
                            <div className="text-xs text-blue-600">Vehicles</div>
                          </div>
                        )}
                        {resources.equipment && Array.isArray(resources.equipment) && (
                          <div className="bg-purple-50 rounded-lg p-2 text-center border border-purple-200">
                            <div className="text-lg font-bold text-purple-700">{resources.equipment.length}</div>
                            <div className="text-xs text-purple-600">Equipment</div>
                          </div>
                        )}
                      </div>
                      {resources.equipment && Array.isArray(resources.equipment) && (
                        <div className="text-xs text-stone-600">
                          <p className="font-semibold mb-1">Equipment:</p>
                          <p className="text-stone-500">{resources.equipment.slice(0, 3).join(', ')}{resources.equipment.length > 3 ? '...' : ''}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Work History */}
                  <div className="p-4 border-b border-stone-200">
                    <p className="text-xs font-semibold text-stone-600 mb-3">WORK HISTORY</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-stone-50 rounded-lg p-2 border border-stone-200">
                        <p className="text-xs text-stone-500">Active</p>
                        <p className="font-bold text-stone-900 text-lg">{workHistory.active_projects ?? c.active_projects ?? 0}</p>
                      </div>
                      <div className="bg-stone-50 rounded-lg p-2 border border-stone-200">
                        <p className="text-xs text-stone-500">Completed</p>
                        <p className="font-bold text-stone-900 text-lg">{workHistory.completed_projects ?? c.completed_projects ?? 0}</p>
                      </div>
                      <div className="bg-stone-50 rounded-lg p-2 border border-stone-200">
                        <p className="text-xs text-stone-500">Success Rate</p>
                        <p className="font-bold text-green-600 text-lg">{workHistory.success_rate ?? '-'}%</p>
                      </div>
                      <div className="bg-stone-50 rounded-lg p-2 border border-stone-200">
                        <p className="text-xs text-stone-500">Avg Duration</p>
                        <p className="font-bold text-stone-900 text-lg">{workHistory.avg_project_duration ?? c.avg_completion_time ?? '-'}<span className="text-xs"> days</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Performance Insights */}
                  {performanceInsights.risk_level && (
                    <div className="p-4 bg-stone-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-stone-600">RISK LEVEL</p>
                          <p className={`text-sm font-bold mt-1 ${
                            performanceInsights.risk_level === 'Very Low' || performanceInsights.risk_level === 'Low' ? 'text-green-600' :
                            performanceInsights.risk_level === 'Medium' ? 'text-amber-600' :
                            'text-red-600'
                          }`}>
                            {performanceInsights.risk_level}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-stone-600">CONTRACT VALUE</p>
                          <p className="text-sm font-bold text-[#D4AF37] mt-1">
                            ₹{c.contract_value != null ? (c.contract_value / 10000000).toFixed(1) + ' Cr' : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {contractors.length === 0 && !contractorsLoading && <p className="text-center text-stone-500 py-8">No contractors data</p>}
        </div>
      ))}
      {activeResourceTab === 'zone' && (zoneAllocationLoading ? <div className="flex items-center justify-center py-12"><Loader className="w-8 h-8 animate-spin text-stone-500" /></div> : (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-stone-900 uppercase tracking-wide">Ward Grievance Tracking</h2>
          <p className="text-sm text-stone-600">Department-specific grievances with real-time progress updates</p>
          
          {/* Grid of Ward Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zoneAllocation.map((z, zoneIdx) => {
              const zoneNum = z.zone_name.match(/\d+/)?.[0] || '';
              const location = z.zone_name.includes('Zone 1') ? 'Ambernath East' : z.zone_name.includes('Zone 2') ? 'Ambernath West' : z.zone_name.includes('Zone 3') ? 'Ambernath East' : z.zone_name.includes('Zone 4') ? 'Ambernath West' : '';
              const displayName = z.zone_name.includes('Zone') ? `Ward ${12 + parseInt(zoneNum || '1')}` : z.zone_name;
              const grievances = z.current_grievances || [];
              
              return (
                <div key={zoneIdx} className="bg-white rounded-xl border-2 border-stone-200 shadow-md hover:shadow-xl transition-all overflow-hidden">
                  {/* Ward Header */}
                  <div className="bg-gradient-to-r from-stone-800 to-stone-900 p-5 text-white">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-xl font-bold">{displayName}</h3>
                        {location && <p className="text-xs opacity-90 mt-1">{location}</p>}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#D4AF37]">{grievances.length}</div>
                        <div className="text-xs opacity-90">Active</div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-4 gap-2 p-4 bg-stone-50 border-b border-stone-200">
                    <div className="text-center">
                      <div className="text-lg font-bold text-stone-900">{z.workers || 0}</div>
                      <div className="text-xs text-stone-600">Workers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-stone-900">{z.equipment || 0}</div>
                      <div className="text-xs text-stone-600">Equipment</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{z.resolved || 0}</div>
                      <div className="text-xs text-stone-600">Resolved</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-stone-900">{z.avg_resolution_days || '-'}</div>
                      <div className="text-xs text-stone-600">Avg Days</div>
                    </div>
                  </div>

                  {/* Grievances Summary */}
                  <div className="p-4">
                    {grievances.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-stone-600 mb-2">ACTIVE GRIEVANCES</p>
                        {grievances.slice(0, 3).map((g, gIdx) => {
                          const workCompleted = g.work_completed || g.progress || 0;
                          const daysLeft = g.days_left || g.estimated_days_remaining || 0;
                          const stage = (g.stage || g.workflow_stage || g.status || 'pending').toLowerCase();
                          const isUrgent = daysLeft > 0 && daysLeft <= 2;
                          
                          return (
                            <div key={gIdx} className={`p-3 rounded-lg border-2 ${isUrgent ? 'border-red-300 bg-red-50' : 'border-stone-200 bg-white'}`}>
                              <div className="flex items-start justify-between mb-2">
                                <p className="text-xs font-bold text-stone-900">{g.grievance_id || `GRV-${gIdx + 1}`}</p>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  (g.priority || '').toLowerCase() === 'high' || (g.priority || '').toLowerCase() === 'urgent' ? 'bg-red-100 text-red-800' :
                                  (g.priority || '').toLowerCase() === 'medium' ? 'bg-amber-100 text-amber-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {(g.priority || 'NORMAL').toUpperCase()}
                                </span>
                              </div>
                              <p className="text-xs text-stone-600 mb-2 line-clamp-1">{g.description || g.grievance_text || 'No description'}</p>
                              
                              {/* Progress Bar */}
                              <div className="mb-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-stone-600">Progress</span>
                                  <span className="text-xs font-bold text-[#D4AF37]">{workCompleted}%</span>
                                </div>
                                <div className="w-full bg-stone-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      workCompleted >= 75 ? 'bg-green-500' :
                                      workCompleted >= 50 ? 'bg-blue-500' :
                                      workCompleted >= 25 ? 'bg-amber-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.max(5, Math.min(100, workCompleted))}%` }}
                                  />
                                </div>
                              </div>

                              {/* Timeline */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-stone-600">
                                  <span className="font-semibold">Stage:</span> {stage.replace('_', ' ').toUpperCase()}
                                </span>
                                <span className={`font-bold ${
                                  daysLeft <= 2 && daysLeft > 0 ? 'text-red-600' :
                                  daysLeft <= 5 && daysLeft > 0 ? 'text-amber-600' :
                                  'text-green-600'
                                }`}>
                                  {daysLeft > 0 ? `${daysLeft}d left` : 'On track'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {grievances.length > 3 && (
                          <p className="text-xs text-center text-stone-500 pt-2">
                            +{grievances.length - 3} more grievance{grievances.length - 3 !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-bold text-stone-900">All Clear!</p>
                        <p className="text-xs text-stone-600">No active grievances</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {zoneAllocation.length === 0 && !zoneAllocationLoading && (
            <div className="bg-white rounded-xl border-2 border-stone-200 p-12 text-center">
              <MapPin className="w-16 h-16 text-stone-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-stone-900 mb-2">No Zone Data</h3>
              <p className="text-stone-600">No zone allocation data available for this department</p>
            </div>
          )}
        </div>
      ))}
      {activeResourceTab === 'requests' && (resourceRequestsLoading ? <div className="flex items-center justify-center py-12"><Loader className="w-8 h-8 animate-spin text-stone-500" /></div> : (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-stone-900 uppercase tracking-wide">Resource Requests</h2>
          <div className="space-y-4">
            {resourceRequests.length === 0 && !resourceRequestsLoading && (
              <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
                <p className="text-stone-500">No resource requests. Data will appear when requests are added to the system.</p>
              </div>
            )}
            {resourceRequests.map((r, i) => {
              const status = (r.status || 'pending').toLowerCase();
              const priority = (r.priority || 'Medium').toLowerCase();
              
              // Status badge colors
              const statusBadgeClass = status === 'approved' 
                ? 'bg-green-100 text-green-800' 
                : status === 'rejected'
                ? 'bg-red-100 text-red-800'
                : 'bg-amber-100 text-amber-800'; // Pending Approval
              
              const statusText = status === 'pending' ? 'Pending Approval' 
                : status === 'approved' ? 'Approved'
                : status === 'rejected' ? 'Rejected'
                : status.charAt(0).toUpperCase() + status.slice(1);
              
              // Priority text color
              const priorityTextClass = priority === 'critical' || priority === 'high'
                ? 'text-stone-600'
                : priority === 'medium'
                ? 'text-stone-600'
                : 'text-stone-600';
              
              const priorityText = priority.charAt(0).toUpperCase() + priority.slice(1) + ' Priority';
              
              // Format request type
              const requestType = r.type || 'Resource Request';
              const requestId = r.request_id || `REQ-${String(i + 1).padStart(3, '0')}`;
              const requestDate = r.created_at 
                ? new Date(r.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })
                : new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
              
              // Format requester name with ID
              const requesterName = r.requested_by || 'Unknown';
              const requesterId = r.requested_by_id || '';
              const requesterDisplay = requesterId ? `${requesterName} (${requesterId})` : requesterName;
              
              // Format estimated cost
              const estimatedCost = r.estimated_cost 
                ? `₹${(r.estimated_cost / 100000).toFixed(2)} Lakhs`
                : '₹0.00 Lakhs';
              
              return (
                <div key={r.id || i} className="bg-white rounded-xl border-2 border-stone-200 p-6 shadow-md hover:shadow-lg transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-stone-900 text-lg mb-1">{requestType}</h4>
                      <p className="text-xs text-stone-500">{requestId} • {requestDate}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadgeClass}`}>
                        {statusText}
                      </span>
                      <p className={`text-xs mt-1 ${priorityTextClass}`}>
                        {priorityText}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-stone-700">
                      <span className="font-semibold">Requested by:</span>{' '}
                      <span className="font-bold">{requesterName}</span>
                      {requesterId && <span className="text-stone-600"> ({requesterId})</span>}
                    </p>
                    <p className="text-sm text-stone-700">
                      <span className="font-semibold">Description:</span>{' '}
                      <span className="font-medium">{r.description || 'No description provided'}</span>
                    </p>
                    {r.justification && (
                      <p className="text-sm text-stone-700">
                        <span className="font-semibold">Justification:</span>{' '}
                        <span className="font-medium">{r.justification}</span>
                      </p>
                    )}
                    <p className="text-sm text-stone-700">
                      <span className="font-semibold">Estimated Cost:</span>{' '}
                      <span className="font-bold">{estimatedCost}</span>
                    </p>
                  </div>
                  
                  {status === 'pending' && (
                    <div className="flex gap-3 mt-4 pt-4 border-t border-stone-200">
                      <button className="flex-1 px-4 py-2.5 bg-stone-900 text-white rounded-lg font-semibold hover:bg-stone-800 transition-colors uppercase text-sm">
                        Approve
                      </button>
                      <button className="flex-1 px-4 py-2.5 bg-white border-2 border-stone-300 text-stone-900 rounded-lg font-semibold hover:bg-stone-50 transition-colors uppercase text-sm">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderMapView = () => {
    return (
      <div className="space-y-6">
        {/* Premium Search and Filter Bar */}
        <div className="bg-gradient-to-r from-stone-50 to-stone-100 rounded-xl border border-stone-200 shadow-lg p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search grievances by ID, title, location..."
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500 bg-white shadow-sm text-stone-900 placeholder-stone-400"
              />
            </div>
            <select
              value={mapCategoryFilter}
              onChange={(e) => setMapCategoryFilter(e.target.value)}
              className="px-4 py-3 border-2 border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500 bg-white shadow-sm text-stone-900 font-medium min-w-[180px]"
            >
              <option value="all">All Categories</option>
              {mapCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={mapStatusFilter}
              onChange={(e) => setMapStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500 bg-white shadow-sm text-stone-900 font-medium min-w-[150px]"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={mapPriorityFilter}
              onChange={(e) => setMapPriorityFilter(e.target.value)}
              className="px-4 py-3 border-2 border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500 bg-white shadow-sm text-stone-900 font-medium min-w-[140px]"
            >
              <option value="all">All Priorities</option>
              <option value="Emergency">Emergency</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <button
              onClick={() => {
                setMapSearch('');
                setMapCategoryFilter('all');
                setMapStatusFilter('all');
                setMapPriorityFilter('all');
              }}
              className="px-6 py-3 bg-stone-800 text-white rounded-lg font-semibold hover:bg-stone-700 transition-colors shadow-md hover:shadow-lg"
            >
              Clear Filters
            </button>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-stone-600">
            <span className="font-semibold">Total: {mapGrievances.length}</span>
            <span className="text-stone-400">|</span>
            <span className="font-semibold text-stone-800">Showing: {filteredMapGrievances.length}</span>
            <span className="text-stone-400">|</span>
            <span className="font-semibold text-emerald-600">On Map: {markersWithCoords.length}</span>
          </div>
        </div>

        {mapLoading ? (
          <div className="flex items-center justify-center py-24 bg-white rounded-xl border border-stone-200 shadow-lg">
            <Loader className="w-10 h-10 animate-spin text-stone-500" />
            <span className="ml-3 text-stone-600 font-medium">Loading map data...</span>
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-stone-200 shadow-xl overflow-hidden">
            <div className="h-[600px] w-full relative">
              <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
                key={`map-${markersWithCoords.length}-${defaultZoom}`}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {markersWithCoords.map((g) => {
                  // Color code markers by priority
                  let markerColor = '#64748b'; // Default slate
                  if (g.priority === 'Emergency' || g.priority === 'emergency') markerColor = '#dc2626'; // Red
                  else if (g.priority === 'Urgent' || g.priority === 'urgent') markerColor = '#ea580c'; // Orange
                  else if (g.priority === 'High') markerColor = '#f59e0b'; // Amber
                  else if (g.priority === 'Medium') markerColor = '#eab308'; // Yellow
                  else if (g.priority === 'Low') markerColor = '#22c55e'; // Green

                  const customIcon = L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background-color: ${markerColor}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                  });

                  return (
                    <Marker key={g.id} position={[Number(g.lat), Number(g.lng)]} icon={customIcon}>
                      <Popup className="custom-popup">
                        <div className="min-w-[250px] p-2">
                          <p className="font-bold text-stone-900 text-base mb-2">{g.grievance_id}</p>
                          <p className="text-sm text-stone-700 mt-1 line-clamp-2 font-medium">{g.title || 'No title'}</p>
                          <p className="text-xs text-stone-500 mt-2 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {g.location || 'No address'}
                          </p>
                          <div className="flex gap-2 mt-3 flex-wrap">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${statusPillClass(g.status)}`}>
                              {g.status ? g.status.replace(/_/g, ' ') : 'N/A'}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${priorityPillClass(g.priority)}`}>
                              {g.priority || 'N/A'}
                            </span>
                          </div>
                          {g.citizen_name && (
                            <p className="text-xs text-stone-600 mt-2">
                              <span className="font-medium">Citizen:</span> {g.citizen_name}
                            </p>
                          )}
                          {g.officer_name && (
                            <p className="text-xs text-stone-600 mt-1">
                              <span className="font-medium">Officer:</span> {g.officer_name}
                            </p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
            {mapGrievances.length > 0 && markersWithCoords.length === 0 && (
              <div className="p-6 border-t border-stone-200 bg-stone-50 text-center">
                <AlertTriangle className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <p className="text-stone-600 font-medium">No grievances have location coordinates</p>
                <p className="text-sm text-stone-500 mt-1">Add latitude and longitude to grievances to see them on the map.</p>
              </div>
            )}
          </div>
        )}

        {/* Premium Legend */}
        <div className="bg-gradient-to-r from-stone-50 to-stone-100 rounded-xl border-2 border-stone-200 shadow-lg p-5">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-bold text-stone-800 uppercase tracking-wide">Priority Legend:</span>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-stone-200">
              <span className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-sm"></span>
              <span className="text-sm font-medium text-stone-700">Emergency</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-stone-200">
              <span className="w-4 h-4 rounded-full bg-orange-600 border-2 border-white shadow-sm"></span>
              <span className="text-sm font-medium text-stone-700">Urgent</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-stone-200">
              <span className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-sm"></span>
              <span className="text-sm font-medium text-stone-700">High</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-stone-200">
              <span className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-white shadow-sm"></span>
              <span className="text-sm font-medium text-stone-700">Medium</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-stone-200">
              <span className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></span>
              <span className="text-sm font-medium text-stone-700">Low</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-stone-200">
              <span className="w-4 h-4 rounded-full bg-slate-600 border-2 border-white shadow-sm"></span>
              <span className="text-sm font-medium text-stone-700">Default</span>
            </div>
          </div>
        </div>

        {/* Premium Grievance Cards */}
        {filteredMapGrievances.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-stone-900 mb-4">Grievance Details ({filteredMapGrievances.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMapGrievances.slice(0, 9).map((g) => (
                <div key={g.id} className="bg-white rounded-xl border-2 border-stone-200 p-5 shadow-md hover:shadow-xl transition-all hover:border-stone-400">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-bold text-stone-900 text-base">{g.grievance_id}</p>
                    {g.lat && g.lng && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                        On Map
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-700 mt-1 line-clamp-2 font-medium mb-2">{g.title || 'No title'}</p>
                  <p className="text-xs text-stone-500 mt-1 flex items-center gap-1 mb-3">
                    <MapPin className="w-3 h-3" />
                    {g.location || 'No address'}
                  </p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${priorityPillClass(g.priority)}`}>
                      {g.priority || 'N/A'}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${statusPillClass(g.status)}`}>
                      {g.status ? g.status.replace(/_/g, ' ') : 'N/A'}
                    </span>
                  </div>
                  {g.citizen_name && (
                    <p className="text-xs text-stone-600 mb-1">
                      <span className="font-medium">Citizen:</span> {g.citizen_name}
                    </p>
                  )}
                  {g.officer_name && (
                    <p className="text-xs text-stone-600">
                      <span className="font-medium">Officer:</span> {g.officer_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {filteredMapGrievances.length > 9 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-stone-600">
                  Showing 9 of {filteredMapGrievances.length} grievances. Use filters to narrow down results.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render Escalations tab
  const renderEscalations = () => {
    if (escalationsLoading) {
      return (
        <div className="flex items-center justify-center py-24 bg-white rounded-xl border border-stone-200">
          <Loader className="w-10 h-10 animate-spin text-stone-500" />
          <span className="ml-3 text-stone-600">Loading escalations...</span>
        </div>
      );
    }
    const { escalations } = escalationsData;
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-stone-900 uppercase tracking-wide">Escalations</h2>
        {escalations.length > 0 && (
          <div className="bg-white rounded-xl border-2 border-red-500 shadow-lg p-6">
            {escalations.slice(0, 1).map((esc) => {
              const level = esc.escalation_level || 'Level 1';
              const overdueHours = esc.overdue_hours || 0;
              return (
                <div key={esc.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-stone-900">Grievance: {esc.grievance_display_id}</h3>
                      <p className="text-sm text-stone-600">{level} • Overdue: {overdueHours} hours</p>
                    </div>
                  </div>
                  <div className="space-y-3 border-l-4 border-red-500 pl-4">
                    <div className="bg-stone-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-stone-700">Level 1 Escalation</span>
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded">Escalated Further</span>
                      </div>
                      <p className="text-sm text-stone-600"><span className="font-medium">Escalated To:</span> Supervisor - {esc.escalated_to_name || 'N/A'}</p>
                      <p className="text-sm text-stone-600"><span className="font-medium">Time:</span> {esc.created_at ? new Date(esc.created_at).toLocaleString() : 'N/A'}</p>
                      <p className="text-sm text-stone-600"><span className="font-medium">Reason:</span> {esc.reason || 'N/A'}</p>
                      <p className="text-sm text-stone-600"><span className="font-medium">Action Taken:</span> {esc.action_taken || 'N/A'}</p>
                    </div>
                    {escalations.length > 1 && (
                      <div className="bg-stone-50 rounded-lg p-4 border-2 border-blue-500">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-stone-700">Level 2 Escalation</span>
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">Active</span>
                        </div>
                        <p className="text-sm text-stone-600"><span className="font-medium">Escalated To:</span> Department Head - {escalations[1]?.escalated_to_name || 'Mr. Rajesh Kumar'}</p>
                        <p className="text-sm text-stone-600"><span className="font-medium">Time:</span> {escalations[1]?.created_at ? new Date(escalations[1].created_at).toLocaleString() : '2/15/2024, 2:30:00 PM'}</p>
                        <p className="text-sm text-stone-600"><span className="font-medium">Reason:</span> {escalations[1]?.reason || 'SLA overdue by 2 days, no significant progress'}</p>
                        <p className="text-sm text-stone-600"><span className="font-medium">Action Taken:</span> {escalations[1]?.action_taken || 'Priority escalation - Emergency team deployed'}</p>
                      </div>
                    )}
                  </div>
                  {esc.next_escalation_at && (
                    <div className="bg-red-100 border-2 border-red-500 rounded-lg p-3">
                      <p className="text-sm font-semibold text-red-800">Next Escalation: Level 3 to Commissioner in 24 hours</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {escalations.length === 0 && (
          <div className="bg-white rounded-xl border-2 border-[#F5E6D3] p-12 text-center">
            <CheckCircle className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Escalations Found</h3>
            <p className="text-gray-600">All grievances are being handled within normal parameters</p>
          </div>
        )}
      </div>
    );
  };

  // Render AI Insights tab
  const renderAIInsights = () => {
    if (aiInsightsLoading) {
      return (
        <div className="flex items-center justify-center py-24 bg-white rounded-xl border border-stone-200">
          <Loader className="w-10 h-10 animate-spin text-stone-500" />
          <span className="ml-3 text-stone-600">Loading AI insights...</span>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-stone-900 uppercase tracking-wide">AI Insights & Recommendations</h2>
        {aiInsightsList.map((insight) => {
          const priorityColors = {
            'High': 'bg-red-100 text-red-800 border-red-500',
            'Medium': 'bg-orange-100 text-orange-800 border-orange-500',
            'Low': 'bg-green-100 text-green-800 border-green-500'
          };
          const borderColors = {
            'High': 'border-red-500',
            'Medium': 'border-orange-500',
            'Low': 'border-green-500'
          };
          const priority = insight.priority || 'Medium';
          const explanation = insight.ai_explanation || {};
          const metrics = insight.metrics || {};
          return (
            <div key={insight.id} className={`bg-white rounded-xl border-2 ${borderColors[priority] || 'border-stone-300'} shadow-lg p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-stone-900">{insight.title || insight.insight_type || 'AI Insight'}</h3>
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${priorityColors[priority] || priorityColors.Medium}`}>
                    {priority} Priority
                  </span>
                </div>
                <span className="text-sm text-stone-600">Confidence: {insight.confidence_score ? Math.round(insight.confidence_score) : 0}%</span>
              </div>
              <p className="text-sm text-stone-700 mb-4">{insight.description || 'N/A'}</p>
              {explanation.reasons && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">AI Explanation</p>
                  <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                    {explanation.reasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Object.keys(metrics).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {Object.entries(metrics).map(([key, value]) => (
                    <div key={key} className="bg-stone-50 rounded-lg p-3">
                      <p className="text-xs text-stone-500 mb-1">{key}</p>
                      <p className="text-sm font-semibold text-stone-900">{value}</p>
                    </div>
                  ))}
                </div>
              )}
              {insight.recommended_action && (
                <div className="bg-stone-100 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-stone-900 mb-1">Recommended Action</p>
                  <p className="text-sm text-stone-700">{insight.recommended_action}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button className="px-6 py-2 bg-stone-900 text-white rounded-lg font-semibold hover:bg-stone-800 transition-colors">
                  ACCEPT
                </button>
                <button className="px-6 py-2 bg-white border-2 border-stone-300 text-stone-800 rounded-lg font-semibold hover:bg-stone-50 transition-colors">
                  DISMISS
                </button>
              </div>
            </div>
          );
        })}
        {aiInsightsList.length === 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
            <p className="text-stone-500">No AI insights available</p>
          </div>
        )}
      </div>
    );
  };

  // Render Citizen Feedback tab
  const renderCitizenFeedback = () => {
    if (citizenFeedbackLoading) {
      return (
        <div className="flex items-center justify-center py-24 bg-white rounded-xl border border-stone-200">
          <Loader className="w-10 h-10 animate-spin text-stone-500" />
          <span className="ml-3 text-stone-600">Loading citizen feedback...</span>
        </div>
      );
    }
    const { data, summary } = citizenFeedbackData;
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-stone-900 uppercase tracking-wide">Citizen Feedback</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border-2 border-stone-800 p-6 text-center">
            <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Average Rating</p>
            <p className="text-3xl font-bold text-stone-900">{summary.avgRating || 0}</p>
            <p className="text-lg text-yellow-500">★</p>
          </div>
          <div className="bg-green-50 rounded-xl border-2 border-green-500 p-6 text-center">
            <p className="text-xs font-semibold text-green-800 uppercase mb-2">Positive</p>
            <p className="text-3xl font-bold text-green-700">{summary.positive || 0}%</p>
          </div>
          <div className="bg-red-50 rounded-xl border-2 border-red-500 p-6 text-center">
            <p className="text-xs font-semibold text-red-800 uppercase mb-2">Negative</p>
            <p className="text-3xl font-bold text-red-700">{summary.negative || 0}%</p>
          </div>
          <div className="bg-white rounded-xl border-2 border-stone-800 p-6 text-center">
            <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Neutral</p>
            <p className="text-3xl font-bold text-stone-900">{summary.neutral || 0}%</p>
          </div>
        </div>
        <div className="space-y-4">
          {data.map((feedback) => {
            const sentimentColors = {
              'Highly Satisfied': 'border-green-500 bg-green-50',
              'Satisfied': 'border-green-400 bg-green-50',
              'Dissatisfied': 'border-red-500 bg-red-50',
              'Neutral': 'border-stone-300 bg-stone-50'
            };
            const sentiment = feedback.satisfaction_level || (feedback.rating >= 4 ? 'Highly Satisfied' : feedback.rating <= 2 ? 'Dissatisfied' : 'Satisfied');
            const borderColor = sentimentColors[sentiment] || sentimentColors.Neutral;
            return (
              <div key={feedback.id} className={`bg-white rounded-xl border-2 ${borderColor} shadow-lg p-6`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-stone-900">Grievance: {feedback.grievance_display_id || 'N/A'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={`text-lg ${star <= (feedback.rating || 0) ? 'text-yellow-500' : 'text-stone-300'}`}>★</span>
                      ))}
                      <span className="text-sm text-stone-600 ml-2">{feedback.rating || 0}/5</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    sentiment.includes('Satisfied') ? 'bg-green-100 text-green-800' :
                    sentiment.includes('Dissatisfied') ? 'bg-red-100 text-red-800' :
                    'bg-stone-100 text-stone-800'
                  }`}>{sentiment}</span>
                </div>
                <p className="text-sm text-stone-600 mb-2"><span className="font-medium">Citizen:</span> {feedback.citizen_name || 'N/A'}</p>
                <p className="text-sm text-stone-600 mb-3"><span className="font-medium">Submitted:</span> {feedback.created_at ? new Date(feedback.created_at).toLocaleString() : 'N/A'}</p>
                <p className="text-sm text-stone-700 mb-3">{feedback.feedback_text || 'No feedback provided'}</p>
                {feedback.additional_comments && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Additional Comments:</p>
                    <p className="text-sm text-blue-800">{feedback.additional_comments}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {feedback.would_recommend ? (
                    <span className="text-sm font-semibold text-green-700">✓ Would Recommend</span>
                  ) : (
                    <span className="text-sm font-semibold text-red-700">✗ Would Not Recommend</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {data.length === 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
            <p className="text-stone-500">No citizen feedback available</p>
          </div>
        )}
      </div>
    );
  };

  // Render Predictive Maintenance tab
  const renderPredictiveMaintenance = () => {
    if (predictiveMaintenanceLoading) {
      return (
        <div className="flex items-center justify-center py-24 bg-white rounded-xl border border-stone-200">
          <Loader className="w-10 h-10 animate-spin text-stone-500" />
          <span className="ml-3 text-stone-600">Loading predictive maintenance...</span>
        </div>
      );
    }
    
    const { repeatPatterns } = escalationsData;
    
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-stone-900 uppercase tracking-wide">Predictive Maintenance</h2>
        
        {/* Equipment Predictive Maintenance Table */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wide">Equipment Maintenance Predictions</h3>
          
          {predictiveMaintenanceList && predictiveMaintenanceList.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-xl border-2 border-stone-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-stone-800 to-stone-900 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Equipment ID</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Equipment Type</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Risk Level</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Breakdown Probability</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Last Maintenance</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Next Scheduled</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">AI Prediction</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {predictiveMaintenanceList.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-stone-900">{item.equipmentId || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-stone-900">{item.equipmentType || 'Unknown'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            item.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                            item.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.riskLevel || 'Low'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-stone-200 rounded-full h-2 w-20">
                              <div 
                                className={`h-2 rounded-full ${
                                  item.breakdownProbability > 70 ? 'bg-red-500' :
                                  item.breakdownProbability > 40 ? 'bg-amber-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(100, item.breakdownProbability || 0)}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-stone-900">{item.breakdownProbability || 0}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-stone-700">{item.lastMaintenance || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-stone-700">{item.nextScheduledMaintenance || 'Not scheduled'}</span>
                        </td>
                        <td className="px-6 py-4">
                          {item.maintenanceOverdue ? (
                            <div className="flex items-center gap-1">
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">OVERDUE</span>
                              {item.overdueBy && <span className="text-xs text-red-600">{item.overdueBy}</span>}
                            </div>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">ON TRACK</span>
                          )}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-sm text-stone-700 line-clamp-2">{item.prediction || 'Equipment in good condition'}</p>
                        </td>
                        <td className="px-6 py-4 max-w-md">
                          <p className="text-sm text-stone-700 line-clamp-2">{item.aiRecommendation || 'Continue regular maintenance'}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
              <p className="text-stone-500">No equipment maintenance predictions available</p>
            </div>
          )}
        </div>
        
        {/* Repeat Grievance Detection & Predictive Maintenance Table */}
        {repeatPatterns && repeatPatterns.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wide">Repeat Grievance Detection</h3>
            
            {/* Premium Table Layout */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-[#F5E6D3] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-[#1a1a1a] to-[#000000] text-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Location</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Issue Type</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Frequency</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Affected Citizens</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Pattern</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Est. Cost</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Potential Savings</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">AI Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5E6D3]">
                    {repeatPatterns.map((pattern, index) => (
                      <tr key={pattern.id || index} className="hover:bg-[#FFF8F0] transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{pattern.zone || pattern.area || 'N/A'}</div>
                          <div className="text-sm text-gray-600">{pattern.ward || ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">{pattern.issue_type || 'General'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            pattern.priority === 'Emergency' ? 'bg-black text-white' :
                            pattern.priority === 'High' ? 'bg-[#D4AF37] text-white' :
                            pattern.priority === 'Medium' ? 'bg-[#FFF8F0] border-2 border-[#D4AF37] text-gray-900' :
                            'bg-gray-200 text-gray-900'
                          }`}>
                            {pattern.priority || 'Medium'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-[#D4AF37]">{pattern.complaint_count || 0} times</div>
                          <div className="text-xs text-gray-600">in {pattern.time_period_days || 30} days</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">{pattern.affected_citizens || 0}</div>
                          <div className="text-xs text-gray-600">citizens</div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-sm text-gray-700 line-clamp-2">{pattern.pattern_description || 'Recurring issue detected'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">
                            ₹{pattern.estimated_cost ? (pattern.estimated_cost / 100000).toFixed(2) + ' L' : 'TBD'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-[#D4AF37]">
                            ₹{pattern.estimated_savings ? (pattern.estimated_savings / 100000).toFixed(2) + ' L' : 'TBD'}
                          </div>
                          <div className="text-xs text-gray-600">vs repeated fixes</div>
                        </td>
                        <td className="px-6 py-4 max-w-md">
                          <p className="text-sm text-gray-700 line-clamp-3">{pattern.ai_recommendation || 'Proactive maintenance recommended'}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#000000] rounded-xl p-6 text-white">
                <div className="text-sm opacity-90 mb-2">Total Patterns Detected</div>
                <div className="text-3xl font-bold">{repeatPatterns.length}</div>
              </div>
              <div className="bg-white border-2 border-[#D4AF37] rounded-xl p-6">
                <div className="text-sm text-gray-600 mb-2">Total Affected Citizens</div>
                <div className="text-3xl font-bold text-gray-900">
                  {repeatPatterns.reduce((sum, p) => sum + (p.affected_citizens || 0), 0)}
                </div>
              </div>
              <div className="bg-[#FFF8F0] border-2 border-[#F5E6D3] rounded-xl p-6">
                <div className="text-sm text-gray-600 mb-2">Estimated Total Cost</div>
                <div className="text-3xl font-bold text-gray-900">
                  ₹{(repeatPatterns.reduce((sum, p) => sum + (p.estimated_cost || 0), 0) / 100000).toFixed(2)} L
                </div>
              </div>
              <div className="bg-gradient-to-br from-[#D4AF37] to-[#C5A028] rounded-xl p-6 text-white">
                <div className="text-sm opacity-90 mb-2">Potential Savings</div>
                <div className="text-3xl font-bold">
                  ₹{(repeatPatterns.reduce((sum, p) => sum + (p.estimated_savings || 0), 0) / 100000).toFixed(2)} L
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Knowledge Base tab
  const renderKnowledgeBase = () => {
    if (knowledgeBaseLoading) {
      return (
        <div className="flex items-center justify-center py-24 bg-white rounded-xl border border-stone-200">
          <Loader className="w-10 h-10 animate-spin text-stone-500" />
          <span className="ml-3 text-stone-600">Loading knowledge base...</span>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-stone-900 uppercase tracking-wide">Knowledge Base</h2>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg font-semibold hover:bg-stone-800 transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            ↑ UPLOAD DOCUMENT
          </button>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-stone-900 mb-4">Upload Document</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">File</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                  <p className="text-xs text-stone-500 mt-1">Supported: PDF, DOC, DOCX, JPG, PNG (Max 10MB)</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Title (Optional)</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Document title"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Description (Optional)</label>
                  <textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Document description"
                    rows={3}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  >
                    <option value="General">General</option>
                    <option value="Policy">Policy</option>
                    <option value="Procedure">Procedure</option>
                    <option value="Guidelines">Guidelines</option>
                    <option value="Reports">Reports</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUploadDocument}
                  disabled={uploading || !uploadFile}
                  className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-lg font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setUploadTitle('');
                    setUploadDescription('');
                  }}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-white border-2 border-stone-300 text-stone-800 rounded-lg font-semibold hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {knowledgeBaseList.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-stone-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-stone-900 mb-1">{doc.title || 'Document'}</h3>
                  <p className="text-sm text-stone-600">{doc.description || 'No description'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-stone-500 mb-4">
                <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}</span>
                <span>{doc.file_type || 'PDF'} • {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : 'N/A'}</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleCopyLink(doc.id)}
                  disabled={copyingLink === doc.id}
                  className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-lg font-semibold hover:bg-stone-800 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {copyingLink === doc.id ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Copying...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      COPY LINK
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
        {knowledgeBaseList.length === 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
            <p className="text-stone-500">No documents in knowledge base</p>
          </div>
        )}
      </div>
    );
  };

  // Render Officers tab
  const renderOfficers = () => {
    if (officersLoading) {
      return (
        <div className="flex items-center justify-center py-24 bg-white rounded-xl border border-stone-200">
          <Loader className="w-10 h-10 animate-spin text-stone-500" />
          <span className="ml-3 text-stone-600">Loading officers...</span>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-stone-900 uppercase tracking-wide">Officers</h2>
          <button className="px-4 py-2 bg-stone-900 text-white rounded-lg font-semibold hover:bg-stone-800 transition-colors flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Add Officer
          </button>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Assigned</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Resolved</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Avg Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {officersList.map((officer) => (
                <tr key={officer.staff_id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-stone-900">{officer.full_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-stone-700">{officer.role || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-stone-700">
                    <div>{officer.email || 'N/A'}</div>
                    {officer.phone && <div className="text-xs text-stone-500">{officer.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-700">{officer.total_assigned || 0}</td>
                  <td className="px-4 py-3 text-sm text-stone-700">{officer.total_resolved || 0}</td>
                  <td className="px-4 py-3 text-sm text-stone-700">{officer.avg_resolution_time ? `${officer.avg_resolution_time} days` : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {officersList.length === 0 && (
            <div className="p-8 text-center text-stone-500">No officers found</div>
          )}
        </div>
      </div>
    );
  };

  // Render Audit Logs tab
  const renderAuditLogs = () => {
    if (auditLogsLoading) {
      return (
        <div className="flex items-center justify-center py-24 bg-white rounded-xl border border-stone-200">
          <Loader className="w-10 h-10 animate-spin text-stone-500" />
          <span className="ml-3 text-stone-600">Loading audit logs...</span>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-stone-900 uppercase tracking-wide">Audit Logs</h2>
        <div className="bg-white rounded-xl border border-stone-200 shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {auditLogsList.map((log) => {
                // Parse details JSON to show meaningful information
                let detailsDisplay = 'N/A';
                let entityDisplay = log.entity_type || 'N/A';
                
                try {
                  const details = typeof log.details === 'string' ? JSON.parse(log.details) : (log.details || {});
                  
                  // Format entity display
                  if (log.entity_id) {
                    const entityIdStr = typeof log.entity_id === 'string' ? log.entity_id : JSON.stringify(log.entity_id);
                    if (details.grievance_id || details.entity_display_id) {
                      entityDisplay = `${log.entity_type || 'Entity'} (${details.grievance_id || details.entity_display_id || entityIdStr.substring(0, 15)}...)`;
                    } else {
                      entityDisplay = `${log.entity_type || 'Entity'} (${entityIdStr.substring(0, 15)}...)`;
                    }
                  }
                  
                  // Format details based on action type
                  const action = (log.action || '').toUpperCase();
                  if (action === 'LOGIN') {
                    detailsDisplay = details.success ? 'User logged in successfully' : 'Login attempt';
                  } else if (action === 'CREATE_GRIEVANCE') {
                    detailsDisplay = `Created grievance ${details.grievance_id || 'N/A'}`;
                  } else if (action === 'ASSIGN_GRIEVANCE') {
                    detailsDisplay = `Assigned to ${details.assigned_to || details.assigned_to_officer || 'N/A'}`;
                  } else if (action === 'UPDATE_STATUS' || action === 'STATUS CHANGED') {
                    if (details.new_status && details.old_status) {
                      detailsDisplay = `Status changed from '${details.old_status}' to '${details.new_status}'`;
                    } else if (details.description) {
                      detailsDisplay = details.description;
                    } else {
                      detailsDisplay = `Status updated: ${details.new_status || details.status || 'N/A'}`;
                    }
                  } else if (action === 'COMPLETE_GRIEVANCE') {
                    detailsDisplay = `Grievance completed${details.resolution_time ? ` in ${details.resolution_time}` : ''}`;
                  } else if (action === 'DOCUMENT UPLOADED') {
                    detailsDisplay = details.description || `Document uploaded: ${details.file_name || 'N/A'}`;
                  } else if (action === 'RECOMMENDATION GENERATED') {
                    detailsDisplay = details.description || `AI recommendation generated for ${details.grievance_id || 'N/A'}`;
                  } else if (details.description) {
                    detailsDisplay = details.description;
                  } else if (details.details) {
                    detailsDisplay = details.details;
                  } else if (typeof details === 'object' && Object.keys(details).length > 0) {
                    // Show key-value pairs for other objects
                    const keyValuePairs = Object.entries(details)
                      .filter(([k]) => k !== 'entity_id' && k !== 'entity_display_id')
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ');
                    detailsDisplay = keyValuePairs || 'No details available';
                  } else {
                    detailsDisplay = log.details_text || 'No details available';
                  }
                } catch (e) {
                  // If JSON parsing fails, use the raw text
                  detailsDisplay = log.details_text || (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) || 'N/A';
                }
                
                return (
                  <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-stone-700">{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      <div className="font-semibold">{log.actor_name || 'N/A'}</div>
                      {log.actor_role && <div className="text-xs text-stone-500">{log.actor_role}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">{log.action || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-stone-700">{entityDisplay}</td>
                    <td className="px-4 py-3 text-sm text-stone-700">{detailsDisplay}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {auditLogsList.length === 0 && (
            <div className="p-8 text-center text-stone-500">No audit logs found</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-[#FFFBF5] to-[#FFF5E8]">
      {/* Premium Header */}
      <PremiumHeader 
        userAuth={user} 
        onLogout={logout}
        title={`${department?.name || 'Water Supply Department'} Dashboard`}
      />

      {/* Tabs */}
      <div className="bg-white/90 border-b-2 border-[#F5E6D3] backdrop-blur-sm shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-gray-900 border-b-4 border-gray-900 bg-[#FFF8F0]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-[#FFF8F0]/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'map' && renderMapView()}
        {activeTab === 'grievances' && renderGrievances()}
        {activeTab === 'budget-management' && <BudgetManagement depId={depId} />}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'resources' && renderResources()}
        {activeTab === 'escalations' && renderEscalations()}
        {activeTab === 'ai-insights' && renderAIInsights()}
        {activeTab === 'citizen-feedback' && renderCitizenFeedback()}
        {activeTab === 'knowledge-base' && renderKnowledgeBase()}
        {activeTab === 'officers' && renderOfficers()}
        {activeTab === 'audit-logs' && renderAuditLogs()}
      </div>
    </div>
  );
};

export default DepartmentDashboardNew;
