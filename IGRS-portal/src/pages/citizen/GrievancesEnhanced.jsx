import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { grievanceService } from "../../services/grievance.service";
import { useAuth } from "../../hooks/useAuth";
import "./GrievancesEnhanced.css";

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    grievanceService
      .getGrievances({ all: "true", limit: 200 })
      .then((res) => {
        if (!cancelled) setGrievances(res.grievances || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || err.message || "Failed to load grievances");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
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
    grievanceService
      .getGrievanceById(id)
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
          <h2 className="header-title">My Grievances</h2>
          <p className="header-subtitle">
            {loading ? (
              <span className="loading-text">
                <Loader2 size={14} className="inline animate-spin mr-2" />
                Loading your grievances...
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

      {/* Loading State */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <p className="loading-message">Loading your grievances...</p>
        </div>
      ) : (
        <div className="grievances-grid">
          {filteredGrievances.map((g) => {
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
                    <button
                      type="button"
                      onClick={() => openDetail(g.id)}
                      className="view-details-btn"
                    >
                      <Eye size={16} />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
              <h3 className="modal-title">Grievance Details</h3>
              <button type="button" onClick={() => setDetailId(null)} className="modal-close-btn">
                <X size={20} />
              </button>
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
                  {/* Status and ID */}
                  <div className="detail-section">
                    <div className="detail-row">
                      <span className="detail-label">Grievance ID</span>
                      <span className="detail-value grievance-id">{detail.grievance.grievance_id || "—"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Status</span>
                      <span className={`badge ${getStatusColor(detail.grievance.status, detail.grievance)}`}>
                        {formatStatus(detail.grievance.status, detail.grievance)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Priority</span>
                      <span className={`priority-badge ${getPriorityColor(detail.grievance.priority)}`}>
                        {(detail.grievance.priority || "medium").toUpperCase()}
                      </span>
                    </div>
                  </div>

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
    </main>
  );
};

export default Grievances;
