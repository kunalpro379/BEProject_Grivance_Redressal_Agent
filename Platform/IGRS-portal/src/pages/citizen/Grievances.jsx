import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  MapPin,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  Eye,
  ChevronDown,
  X,
  Calendar,
  Building2,
  FileText,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PlayCircle,
  Award,
  MessageSquare,
  Map as MapIcon,
  Maximize2,
  Minimize2,
} from "lucide-react";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { grievanceService } from "../../services/grievance.service";
import { useAuth } from "../../hooks/useAuth";
import JsonRenderer from "../../components/JsonRenderer";
import LocationDisplay from "../../components/LocationDisplay";
import "./GrievancesEnhanced.css";

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Derive title from grievance_text
const getTitle = (grievance_text) => {
  if (!grievance_text || typeof grievance_text !== "string") return "Grievance";
  const first = grievance_text.split("\n").find((l) => l.trim().startsWith("Title:"));
  if (first) return first.replace(/^Title:\s*/i, "").trim();
  const line = grievance_text.trim().split("\n")[0];
  return line && line.length < 80 ? line : "Grievance";
};

// Parse metadata from grievance
const getCardMeta = (g) => {
  const text = g.grievance_text || "";
  const out = { category: null, city: null, age: null, department: null };
  
  // Try to get from category field first
  if (g.category) {
    out.category = typeof g.category === 'string' ? g.category : g.category.name || g.category.category;
  }
  
  // Try to get department from department_name
  if (g.department_name) {
    out.department = g.department_name;
  }
  
  // Parse from text
  const lines = text.split("\n").map((l) => l.trim());
  for (const line of lines) {
    if (line.toLowerCase().startsWith("category:") && !out.category) 
      out.category = line.replace(/^category:\s*/i, "").trim();
    if (line.toLowerCase().startsWith("city:")) 
      out.city = line.replace(/^city:\s*/i, "").trim();
    if (line.toLowerCase().startsWith("age:")) 
      out.age = line.replace(/^age:\s*/i, "").trim();
  }
  
  return out;
};

// Check if grievance has been analyzed
const hasAnalysis = (g) => {
  if (!g) return false;
  if (g.full_result != null && (typeof g.full_result === "object" || 
      (typeof g.full_result === "string" && g.full_result.trim().length > 2))) return true;
  return false;
};

// Enhanced status formatting
const formatStatus = (status, grievance = null) => {
  const s = String(status || "").toLowerCase();
  if (s === "resolved") return "Resolved";
  if (s === "rejected") return "Rejected";
  if (s === "in_progress") return "Under Working";
  if (s === "assigned") return "Accepted by Department";
  if (s === "submitted" || s === "pending" || !status) {
    if (grievance && hasAnalysis(grievance)) return "Analyzed";
    return "Submitted";
  }
  return grievance && hasAnalysis(grievance) ? "Analyzed" : status;
};

// Premium color scheme
const getStatusColor = (status, grievance = null) => {
  const display = formatStatus(status, grievance);
  const d = String(display).toLowerCase();
  if (d === "resolved") return "status-resolved";
  if (d === "analyzed") return "status-analyzed";
  if (d === "accepted by department") return "status-accepted";
  if (d === "under working") return "status-working";
  if (d === "rejected") return "status-rejected";
  return "status-submitted";
};

const getPriorityColor = (priority) => {
  const p = String(priority || "").toLowerCase();
  if (p === "high" || p === "emergency" || p === "urgent") return "priority-high";
  if (p === "medium") return "priority-medium";
  return "priority-low";
};

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

const Grievances = () => {
  const { user } = useAuth();
  const currentCitizenId = user?.id != null ? String(user.id) : null;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [selectedPriority, setSelectedPriority] = useState("All Priorities");
  const [sortBy, setSortBy] = useState("Date");
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredGrievances, setFilteredGrievances] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // Show 12 cards per page
  const [mapExpanded, setMapExpanded] = useState(false);
  
  // Map refs
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Load first batch of 50 grievances instead of 200
    grievanceService
      .getGrievances({ all: "true", limit: 50, page: 1 })
      .then((res) => {
        if (!cancelled) {
          setGrievances(res.grievances || []);
          // Initialize map after data loads
          setTimeout(() => initializeMap(res.grievances || []), 100);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || err.message || "Failed to load grievances");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { 
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let filtered = [...grievances];
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (g) =>
          getTitle(g.grievance_text).toLowerCase().includes(term) ||
          (g.grievance_text || "").toLowerCase().includes(term) ||
          (g.department_name || "").toLowerCase().includes(term)
      );
    }
    if (selectedStatus !== "All Status") {
      const want = selectedStatus.replace(/\s+/g, "_").toLowerCase();
      filtered = filtered.filter((g) => formatStatus(g.status, g).replace(/\s+/g, "_").toLowerCase() === want);
    }
    if (selectedPriority !== "All Priorities") {
      const want = selectedPriority.replace(/\s+/g, "").toLowerCase();
      filtered = filtered.filter((g) => String(g.priority || "").toLowerCase() === want);
    }
    if (sortBy === "Date") {
      filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortBy === "Priority") {
      const order = { high: 3, urgent: 3, emergency: 4, medium: 2, low: 1 };
      filtered.sort((a, b) => (order[String(b.priority).toLowerCase()] || 0) - (order[String(a.priority).toLowerCase()] || 0));
    }
    setFilteredGrievances(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [grievances, searchTerm, selectedStatus, selectedPriority, sortBy]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showFilterDropdown && !e.target.closest(".filter-dropdown")) setShowFilterDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilterDropdown]);

  const openDetail = (id) => {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    // Pass viewAll=true since we're viewing from "all grievances" page
    grievanceService
      .getGrievanceById(id, { viewAll: 'true' })
      .then((res) => {
        setDetail(res);
      })
      .catch((err) => {
        console.error("Error loading grievance details:", err);
        setDetail({ error: true, message: err.response?.data?.error || "Failed to load details" });
      })
      .finally(() => {
        setDetailLoading(false);
      });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedStatus("All Status");
    setSelectedPriority("All Priorities");
    setSortBy("Date");
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredGrievances.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentGrievances = filteredGrievances.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Map initialization
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

  // Update map markers
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
            <strong>Category:</strong> ${grievance.category || 'N/A'}
          </p>
          <p style="margin: 4px 0; font-size: 12px; color: #6B6B6B;">
            <strong>Location:</strong> ${grievance.location_address || 'N/A'}
          </p>
          <button 
            onclick="window.dispatchEvent(new CustomEvent('openGrievanceDetail', { detail: '${grievance.id}' }))"
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

  // Listen for custom event to open detail modal from map
  useEffect(() => {
    const handleOpenDetail = (e) => {
      openDetail(e.detail);
    };
    window.addEventListener('openGrievanceDetail', handleOpenDetail);
    return () => window.removeEventListener('openGrievanceDetail', handleOpenDetail);
  }, []);

  // Update map when filtered grievances change
  useEffect(() => {
    if (mapInstanceRef.current && filteredGrievances.length > 0) {
      updateMapMarkers(filteredGrievances);
    }
  }, [filteredGrievances]);

  // Build enhanced timeline
  const buildTimeline = (grievance, timelineData) => {
    const timeline = [];
    
    // 1. Submitted
    timeline.push({
      stage: "submitted",
      label: "Grievance Submitted",
      description: "Your grievance has been received",
      at: grievance.created_at,
      icon: FileText,
      completed: true
    });
    
    // 2. Analyzed (if AI analysis is done)
    if (hasAnalysis(grievance)) {
      timeline.push({
        stage: "analyzed",
        label: "AI Analysis Completed",
        description: "Grievance categorized and prioritized",
        at: grievance.updated_at || grievance.created_at,
        icon: Sparkles,
        completed: true
      });
    }
    
    // 3. Accepted by Department (if assigned)
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
    
    // 4. Under Working (if in_progress)
    const status = String(grievance.status || "").toLowerCase();
    if (status === "in_progress" || status === "assigned") {
      timeline.push({
        stage: "working",
        label: "Under Working",
        description: grievance.officer_name ? `Being handled by ${grievance.officer_name}` : "Work in progress",
        at: grievance.updated_at,
        icon: PlayCircle,
        completed: status === "in_progress"
      });
    }
    
    // 5. Resolved/Rejected
    if (status === "resolved") {
      timeline.push({
        stage: "resolved",
        label: "Resolved",
        description: "Grievance has been successfully resolved",
        at: grievance.resolved_at || grievance.updated_at,
        icon: CheckCircle2,
        completed: true
      });
    } else if (status === "rejected") {
      timeline.push({
        stage: "rejected",
        label: "Rejected",
        description: "Grievance was rejected",
        at: grievance.updated_at,
        icon: XCircle,
        completed: true
      });
    }
    
    return timeline;
  };

  return (
    <main className="grievances-enhanced-container">
      {/* Premium Header */}
      <div className="premium-header">
        <div className="header-content">
          <h2 className="header-title">Grievances</h2>
          <p className="header-subtitle">
            {loading ? (
              <span className="loading-text">
                <Loader2 size={14} className="inline animate-spin mr-2" />
                Loading grievances...
              </span>
            ) : (
              <>
                {filteredGrievances.length} grievance{filteredGrievances.length !== 1 ? "s" : ""} found
                {!loading && currentCitizenId && filteredGrievances.some((g) => String(g.citizen_id) === currentCitizenId) && (
                  <span className="highlight-badge">Your grievances highlighted</span>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="search-filter-bar">
        <div className="search-container">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search by title, description, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="relative filter-dropdown">
          <button
            type="button"
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="filter-button"
          >
            <Filter size={18} />
            <span>Filters</span>
            <ChevronDown size={16} className={showFilterDropdown ? "rotate-180" : ""} />
          </button>
          {showFilterDropdown && (
            <div className="filter-dropdown-menu">
              <div className="filter-section">
                <label>Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="All Status">All Status</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Analyzed">Analyzed</option>
                  <option value="Accepted by Department">Accepted by Department</option>
                  <option value="Under Working">Under Working</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="filter-section">
                <label>Priority</label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="filter-select"
                >
                  <option value="All Priorities">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="filter-section">
                <label>Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="Date">Date</option>
                  <option value="Priority">Priority</option>
                </select>
              </div>
              {(searchTerm || selectedStatus !== "All Status" || selectedPriority !== "All Priorities") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="clear-filters-btn"
                >
                  <X size={16} />
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Section */}
      {!loading && filteredGrievances.length > 0 && (
        <div className={`map-section ${mapExpanded ? 'expanded' : ''}`}>
          <div className="map-header">
            <div className="map-title">
              <MapIcon size={20} />
              <h3>Grievances Map</h3>
              <span className="map-count">{filteredGrievances.filter(g => g.latitude && g.longitude).length} locations</span>
            </div>
            <button 
              className="map-expand-btn"
              onClick={() => setMapExpanded(!mapExpanded)}
              title={mapExpanded ? 'Minimize map' : 'Expand map'}
            >
              {mapExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
          <div ref={mapRef} className="map-container"></div>
        </div>
      )}

      {/* Section Title */}
      {!loading && filteredGrievances.length > 0 && (
        <div className="section-title">
          <h3>All Grievances</h3>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <p className="loading-message">Loading grievances...</p>
        </div>
      ) : (
        <>
          <div className="grievances-grid">
            {currentGrievances.map((g) => {
            const isMine = currentCitizenId && String(g.citizen_id) === currentCitizenId;
            const meta = getCardMeta(g);
            const descSnippet = (g.grievance_text || "")
              .replace(/\n/g, " ")
              .replace(/^(Title|Category|City|Age|Description):\s*/gi, "")
              .trim()
              .slice(0, 120);
            return (
              <div
                key={g.id}
                className={`grievance-card ${isMine ? "my-grievance" : ""}`}
              >
                <div className="card-header">
                  <div className="card-badges">
                    {isMine && (
                      <span className="badge badge-mine">
                        <Award size={12} />
                        My Grievance
                      </span>
                    )}
                    <span className={`badge ${getStatusColor(g.status, g)}`}>
                      {formatStatus(g.status, g)}
                    </span>
                    {hasAnalysis(g) && (
                      <span className="badge badge-analyzed">
                        <Sparkles size={12} />
                        AI Analyzed
                      </span>
                    )}
                  </div>
                  <span className={`priority-badge ${getPriorityColor(g.priority)}`}>
                    {(g.priority || "medium").toUpperCase()}
                  </span>
                </div>

                <div className="card-content">
                  <h3 className="card-title">{getTitle(g.grievance_text)}</h3>
                  
                  {meta.category && (
                    <div className="card-meta">
                      <span className="meta-item">
                        <FileText size={14} />
                        {meta.category}
                      </span>
                    </div>
                  )}

                  <p className="card-description">
                    {descSnippet || "—"}{descSnippet.length >= 120 ? "…" : ""}
                  </p>

                  <div className="card-footer">
                    <div className="footer-info">
                      <span className="info-item">
                        <Calendar size={14} />
                        {formatDate(g.created_at)}
                      </span>
                      {g.department_name && (
                        <span className="info-item">
                          <Building2 size={14} />
                          {g.department_name}
                        </span>
                      )}
                    </div>
                    <div className="card-actions">
                      <button
                        type="button"
                        onClick={() => openDetail(g.id)}
                        className="view-details-btn"
                      >
                        <Eye size={16} />
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(g.id);
                          setTimeout(() => setShowCommentsModal(true), 300);
                        }}
                        className="card-comments-btn"
                      >
                        <MessageSquare size={16} />
                        Comments
                        {g.comments && Array.isArray(g.comments) && g.comments.length > 0 && (
                          <span className="comments-badge">{g.comments.length}</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {filteredGrievances.length > itemsPerPage && (
          <div className="pagination-container">
            <div className="pagination-info">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredGrievances.length)} of {filteredGrievances.length} grievances
            </div>
            <div className="pagination-controls">
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 1}
                className="pagination-btn pagination-prev"
                title="Previous page"
              >
                <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
                Previous
              </button>

              <div className="pagination-numbers">
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="pagination-btn pagination-next"
                title="Next page"
              >
                Next
                <ChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} />
              </button>
            </div>
          </div>
        )}
      </>
      )}

      {!loading && filteredGrievances.length === 0 && (
        <div className="empty-state">
          <FileText size={48} className="empty-icon" />
          <h3 className="empty-title">No grievances found</h3>
          <p className="empty-description">
            {grievances.length === 0 ? "You haven't submitted any grievances yet." : "Try changing your filters."}
          </p>
          <button type="button" onClick={clearFilters} className="empty-action-btn">
            {grievances.length === 0 ? "Go to dashboard" : "Clear filters"}
          </button>
        </div>
      )}

      {/* Enhanced Detail Modal */}
      {detailId && (
        <div className="modal-overlay" onClick={() => setDetailId(null)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-content">
                <h3 className="modal-title">Grievance Details</h3>
                <div className="grievance-header-info">
                  <div className="header-item">
                    <span className="header-label">ID:</span>
                    <span className="header-value">{detail?.grievance?.grievance_id || "—"}</span>
                  </div>
                  <div className="header-item">
                    <span className="header-label">Status:</span>
                    <span className={`badge ${getStatusColor(detail?.grievance?.status, detail?.grievance)}`}>
                      {formatStatus(detail?.grievance?.status, detail?.grievance)}
                    </span>
                  </div>
                  <div className="header-item">
                    <span className="header-label">Priority:</span>
                    <span className={`priority-badge ${getPriorityColor(detail?.grievance?.priority)}`}>
                      {(detail?.grievance?.priority || "medium").toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="modal-header-actions">
                <button 
                  type="button" 
                  onClick={() => setShowCommentsModal(true)} 
                  className="comments-btn"
                  title="View Comments"
                >
                  <MessageSquare size={18} />
                  <span>Comments</span>
                  {detail?.comments && detail.comments.length > 0 && (
                    <span className="comments-count">{detail.comments.length}</span>
                  )}
                </button>
                <button type="button" onClick={() => setDetailId(null)} className="modal-close-btn">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="modal-content">
              {detailLoading ? (
                <div className="modal-loading">
                  <div className="loading-spinner">
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                  </div>
                  <p>Loading details...</p>
                </div>
              ) : detail && detail.grievance ? (
                <>
                  {/* Description */}
                  <div className="detail-section">
                    <h4 className="section-title">Description</h4>
                    <p className="detail-description">{detail.grievance.grievance_text || "—"}</p>
                  </div>

                  {/* Proof/Evidence */}
                  {detail.grievance.image_path && (
                    <div className="detail-section">
                      <h4 className="section-title">
                        <ImageIcon size={16} />
                        Proof / Evidence
                      </h4>
                      {isImageUrl(detail.grievance.image_path) ? (
                        <div className="evidence-image-container">
                          <img
                            src={detail.grievance.image_path}
                            alt={detail.grievance.image_description || "Proof"}
                            className="evidence-image"
                            onError={(e) => { 
                              e.target.style.display = "none"; 
                              e.target.nextElementSibling?.classList.remove("hidden"); 
                            }}
                          />
                          <p className="hidden evidence-error">
                            Image could not be loaded.{" "}
                            <a href={detail.grievance.image_path} target="_blank" rel="noopener noreferrer" className="evidence-link">
                              <ExternalLink size={14} /> Open link
                            </a>
                          </p>
                        </div>
                      ) : (
                        <a
                          href={detail.grievance.image_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="evidence-link-btn"
                        >
                          <FileText size={18} />
                          {detail.grievance.image_description || "View proof document"}
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Department and Officer Info */}
                  {(detail.grievance.department_name || detail.grievance.officer_name) && (
                    <div className="detail-section">
                      <h4 className="section-title">Assignment</h4>
                      <div className="assignment-info">
                        {detail.grievance.department_name && (
                          <div className="assignment-item">
                            <Building2 size={16} />
                            <span>{detail.grievance.department_name}</span>
                          </div>
                        )}
                        {detail.grievance.officer_name && (
                          <div className="assignment-item">
                            <User size={16} />
                            <span>Assigned to: {detail.grievance.officer_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Location Information */}
                  {(detail.grievance.latitude || detail.grievance.location_address || detail.grievance.extracted_location) && (
                    <div className="detail-section">
                      <h4 className="section-title">
                        <MapPin size={18} />
                        Location Information
                      </h4>
                      
                      {/* Smart Location Display */}
                      {detail.grievance.extracted_location && typeof detail.grievance.extracted_location === 'object' ? (
                        <LocationDisplay locationData={detail.grievance.extracted_location} />
                      ) : detail.grievance.location_address ? (
                        <LocationDisplay locationData={{ 
                          address: detail.grievance.location_address,
                          latitude: detail.grievance.latitude,
                          longitude: detail.grievance.longitude
                        }} />
                      ) : (
                        <span className="location-not-available">Location not available</span>
                      )}

                      {/* Coordinates (if available) */}
                      {detail.grievance.latitude && detail.grievance.longitude && (
                        <div className="detail-row">
                          <span className="detail-label">Coordinates</span>
                          <span className="detail-value coordinates">
                            {detail.grievance.latitude}, {detail.grievance.longitude}
                          </span>
                        </div>
                      )}

                      {/* Zone and Ward */}
                      {(detail.grievance.zone || detail.grievance.ward) && (
                        <div className="location-admin">
                          {detail.grievance.zone && (
                            <div className="admin-item">
                              <span className="admin-label">Zone:</span>
                              <span className="admin-value">{detail.grievance.zone}</span>
                            </div>
                          )}
                          {detail.grievance.ward && (
                            <div className="admin-item">
                              <span className="admin-label">Ward:</span>
                              <span className="admin-value">{detail.grievance.ward}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Analysis Results */}
                  {detail.grievance.full_result && (
                    <div className="detail-section">
                      <h4 className="section-title">
                        <Sparkles size={18} />
                        AI Analysis
                      </h4>
                      <JsonRenderer 
                        data={typeof detail.grievance.full_result === 'object' ? detail.grievance.full_result : JSON.parse(detail.grievance.full_result)} 
                        title="Complete AI Analysis"
                      />
                    </div>
                  )}

                  {/* Validation Information */}
                  {(detail.grievance.validation_status || detail.grievance.validation_score) && (
                    <div className="detail-section">
                      <h4 className="section-title">
                        <CheckCircle size={18} />
                        Validation
                      </h4>
                      {detail.grievance.validation_status && (
                        <div className="detail-row">
                          <span className="detail-label">Status</span>
                          <span className="detail-value">{detail.grievance.validation_status}</span>
                        </div>
                      )}
                      {detail.grievance.validation_score && (
                        <div className="detail-row">
                          <span className="detail-label">Score</span>
                          <span className="detail-value">{detail.grievance.validation_score}</span>
                        </div>
                      )}
                      {detail.grievance.validation_reasoning && (
                        <div className="detail-row">
                          <span className="detail-label">Reasoning</span>
                          <span className="detail-value">{detail.grievance.validation_reasoning}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Additional JSONB Fields */}
                  {(detail.grievance.category || detail.grievance.query_type || detail.grievance.patterns || detail.grievance.fraud) && (
                    <div className="detail-section">
                      <h4 className="section-title">
                        <AlertCircle size={18} />
                        Additional Analysis
                      </h4>
                      {detail.grievance.category && typeof detail.grievance.category === 'object' && (
                        <JsonRenderer data={detail.grievance.category} title="Category Details" />
                      )}
                      {detail.grievance.query_type && (
                        <JsonRenderer data={detail.grievance.query_type} title="Query Type" />
                      )}
                      {detail.grievance.patterns && (
                        <JsonRenderer data={detail.grievance.patterns} title="Patterns" />
                      )}
                      {detail.grievance.fraud && (
                        <JsonRenderer data={detail.grievance.fraud} title="Fraud Analysis" />
                      )}
                      {detail.grievance.severity && (
                        <JsonRenderer data={detail.grievance.severity} title="Severity" />
                      )}
                      {detail.grievance.emotion && (
                        <JsonRenderer data={detail.grievance.emotion} title="Emotion Analysis" />
                      )}
                    </div>
                  )}

                  {/* Enhanced Timeline */}
                  <div className="detail-section">
                    <h4 className="section-title">
                      <Clock size={18} />
                      Timeline
                    </h4>
                    <div className="timeline-container">
                      {buildTimeline(detail.grievance, detail.timeline).map((step, i, arr) => {
                        const Icon = step.icon;
                        return (
                          <div key={i} className={`timeline-item ${step.completed ? "completed" : "pending"}`}>
                            <div className="timeline-marker">
                              <div className="timeline-icon">
                                <Icon size={16} />
                              </div>
                              {i < arr.length - 1 && <div className="timeline-line" />}
                            </div>
                            <div className="timeline-content">
                              <h5 className="timeline-label">{step.label}</h5>
                              <p className="timeline-description">{step.description}</p>
                              <p className="timeline-date">{formatDate(step.at)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Comments */}
                  {detail.comments && detail.comments.length > 0 && (
                    <div className="detail-section">
                      <h4 className="section-title">
                        <MessageSquare size={18} />
                        Comments ({detail.comments.length})
                      </h4>
                      <div className="comments-list">
                        {detail.comments.map((c) => (
                          <div key={c.id} className="comment-item">
                            <div className="comment-header">
                              <span className="comment-author">{c.user_name || "Officer"}</span>
                              <span className="comment-date">{formatDate(c.created_at)}</span>
                            </div>
                            <p className="comment-text">{c.comment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="detail-section timestamps">
                    <div className="timestamp-item">
                      <span className="timestamp-label">Submitted</span>
                      <span className="timestamp-value">{formatDate(detail.grievance.created_at)}</span>
                    </div>
                    <div className="timestamp-item">
                      <span className="timestamp-label">Last Updated</span>
                      <span className="timestamp-value">{formatDate(detail.grievance.updated_at)}</span>
                    </div>
                    {detail.grievance.resolved_at && (
                      <div className="timestamp-item">
                        <span className="timestamp-label">Resolved</span>
                        <span className="timestamp-value">{formatDate(detail.grievance.resolved_at)}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : detail && detail.error ? (
                <div className="error-state">
                  <AlertTriangle size={48} className="error-icon" />
                  <h3 className="error-title">Could not load grievance</h3>
                  <p className="error-message">{detail.message || "An error occurred while loading the details."}</p>
                  <button onClick={() => openDetail(detailId)} className="retry-btn">
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="error-state">
                  <AlertTriangle size={48} className="error-icon" />
                  <p className="error-message">Could not load this grievance.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instagram-Style Comments Modal */}
      {showCommentsModal && detail && detail.grievance && (
        <div className="comments-modal-overlay" onClick={() => setShowCommentsModal(false)}>
          <div className="comments-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="comments-modal-header">
              <h3>Comments</h3>
              <button onClick={() => setShowCommentsModal(false)} className="comments-modal-close">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Split Layout */}
            <div className="comments-modal-body">
              {/* Left Side - Grievance Description */}
              <div className="comments-left-panel">
                <div className="grievance-summary">
                  <div className="summary-header">
                    <h4>Grievance Details</h4>
                    <span className={`badge ${getStatusColor(detail.grievance.status, detail.grievance)}`}>
                      {formatStatus(detail.grievance.status, detail.grievance)}
                    </span>
                  </div>
                  
                  <div className="summary-id">
                    <span className="label">ID:</span>
                    <span className="value">{detail.grievance.grievance_id}</span>
                  </div>

                  <div className="summary-description">
                    <h5>Description</h5>
                    <p>{detail.grievance.grievance_text || "No description provided"}</p>
                  </div>

                  {detail.grievance.image_path && (
                    <div className="summary-image">
                      <h5>Proof/Evidence</h5>
                      {isImageUrl(detail.grievance.image_path) ? (
                        <img src={detail.grievance.image_path} alt="Grievance proof" />
                      ) : (
                        <a href={detail.grievance.image_path} target="_blank" rel="noopener noreferrer" className="file-link">
                          <FileText size={16} />
                          View Attachment
                        </a>
                      )}
                    </div>
                  )}

                  <div className="summary-meta">
                    <div className="meta-item">
                      <Calendar size={14} />
                      <span>{formatDate(detail.grievance.created_at)}</span>
                    </div>
                    {detail.grievance.location_address && (
                      <div className="meta-item">
                        <MapPin size={14} />
                        <span>{detail.grievance.location_address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side - Comments Section */}
              <div className="comments-right-panel">
                <div className="comments-list">
                  {detail.comments && detail.comments.length > 0 ? (
                    detail.comments.map((comment, index) => (
                      <div key={index} className="comment-item">
                        <div className="comment-avatar">
                          <User size={20} />
                        </div>
                        <div className="comment-content">
                          <div className="comment-header">
                            <span className="comment-author">{comment.user_name || "User"}</span>
                            <span className="comment-time">{formatDate(comment.timestamp)}</span>
                          </div>
                          <p className="comment-text">{comment.comment}</p>
                          {comment.is_internal && (
                            <span className="internal-badge">Internal</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-comments">
                      <MessageSquare size={48} />
                      <p>No comments yet</p>
                      <span>Be the first to comment</span>
                    </div>
                  )}
                </div>

                {/* Comment Input */}
                <div className="comment-input-container">
                  <div className="comment-input-wrapper">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows="3"
                      className="comment-input"
                    />
                    <button
                      onClick={async () => {
                        if (!newComment.trim() || submittingComment) return;
                        
                        setSubmittingComment(true);
                        try {
                          await grievanceService.addComment(detail.grievance.id, {
                            comment: newComment.trim(),
                            user_id: user?.id,
                            user_name: user?.name || user?.email || "Anonymous",
                            is_internal: false
                          });
                          
                          // Refresh comments
                          const updated = await grievanceService.getGrievanceById(detail.grievance.id);
                          setDetail(updated);
                          setNewComment("");
                        } catch (error) {
                          console.error("Error adding comment:", error);
                          alert("Failed to add comment. Please try again.");
                        } finally {
                          setSubmittingComment(false);
                        }
                      }}
                      disabled={!newComment.trim() || submittingComment}
                      className="comment-submit-btn"
                    >
                      {submittingComment ? (
                        <Loader2 size={18} className="spinning" />
                      ) : (
                        "Post"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Grievances;
