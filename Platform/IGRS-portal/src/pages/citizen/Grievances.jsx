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
} from "lucide-react";
import { grievanceService } from "../../services/grievance.service";
import { useAuth } from "../../hooks/useAuth";

// Derive title from grievance_text (first line or "Grievance")
const getTitle = (grievance_text) => {
  if (!grievance_text || typeof grievance_text !== "string") return "Grievance";
  const first = grievance_text.split("\n").find((l) => l.trim().startsWith("Title:"));
  if (first) return first.replace(/^Title:\s*/i, "").trim();
  const line = grievance_text.trim().split("\n")[0];
  return line && line.length < 80 ? line : "Grievance";
};

// Parse Category, City, Age, Department from grievance_text or full_result/metadata for card display
const getCardMeta = (g) => {
  const text = g.grievance_text || "";
  const out = { category: null, city: null, age: null, department: null };
  let metadata = g.metadata;
  let fullResult = g.full_result;
  if (metadata && typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = null;
    }
  }
  if (fullResult && typeof fullResult === "string") {
    try {
      fullResult = JSON.parse(fullResult);
    } catch {
      fullResult = null;
    }
  }
  const fr = fullResult || metadata?.full_result || metadata?.agent_outputs;
  if (fr && typeof fr === "object") {
    const cat = fr.category?.name ?? fr.category?.category ?? fr.category;
    if (cat) out.category = typeof cat === "string" ? cat : (cat?.name || cat?.category);
    const cls = fr.classification || fr.analysis?.classification;
    const dept = cls?.department ?? fr.department_name ?? fr.department;
    if (dept) out.department = typeof dept === "string" ? dept : (dept?.name || dept?.department);
  }
  const lines = text.split("\n").map((l) => l.trim());
  for (const line of lines) {
    if (line.toLowerCase().startsWith("category:")) out.category = out.category || line.replace(/^category:\s*/i, "").trim();
    if (line.toLowerCase().startsWith("city:")) out.city = line.replace(/^city:\s*/i, "").trim();
    if (line.toLowerCase().startsWith("age:")) out.age = line.replace(/^age:\s*/i, "").trim();
  }
  return out;
};

// Check if grievance has been analyzed (AI result saved)
const hasAnalysis = (g) => {
  if (!g) return false;
  if (g.full_result != null && (typeof g.full_result === "object" || (typeof g.full_result === "string" && g.full_result.trim().length > 2))) return true;
  if (g.metadata != null && (typeof g.metadata === "object" || (typeof g.metadata === "string" && g.metadata.trim().length > 2))) return true;
  return false;
};

// Normalize API status for display: Submitted → Analyzed (when AI done) → In Progress → Resolved/Rejected
const formatStatus = (status, grievance = null) => {
  const s = String(status || "").toLowerCase();
  if (s === "resolved") return "Resolved";
  if (s === "rejected") return "Rejected";
  if (s === "in_progress") return "In Progress";
  if (s === "submitted" || s === "pending" || !status) {
    if (grievance && hasAnalysis(grievance)) return "Analyzed";
    return "Submitted";
  }
  return grievance && hasAnalysis(grievance) ? "Analyzed" : status;
};

const getStatusColor = (status, grievance = null) => {
  const display = formatStatus(status, grievance);
  const d = String(display).toLowerCase();
  if (d === "resolved") return "bg-green-100 text-green-800";
  if (d === "analyzed") return "bg-sky-100 text-sky-800";
  if (d === "in progress") return "bg-blue-100 text-blue-800";
  if (d === "rejected") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
};

const getPriorityColor = (priority) => {
  const p = String(priority || "").toLowerCase();
  if (p === "high" || p === "emergency" || p === "urgent") return "bg-red-100 text-red-800";
  if (p === "medium") return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
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

// Check if URL is likely an image (for proof display)
const isImageUrl = (path) => {
  if (!path || typeof path !== "string") return false;
  const lower = path.toLowerCase();
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(lower) || lower.includes("blob") && !lower.includes(".pdf");
};

// Extract human-readable string from AI response objects (no raw JSON on UI)
const formatCategoryDisplay = (cat) => {
  if (!cat) return null;
  if (typeof cat === "string") return cat;
  return cat.main_category || cat.sub_category || cat.name || cat.category || null;
};
const formatDepartmentDisplay = (dept) => {
  if (!dept) return null;
  if (typeof dept === "string") return dept;
  return dept.recommended_department || dept.department || dept.name || null;
};
const formatPriorityDisplay = (pri) => {
  if (!pri) return null;
  if (typeof pri === "string") return pri;
  const raw = pri._raw_priority || pri;
  const level = raw.priority_level || pri.priority_level || pri.urgency_level || pri.level;
  if (level) return String(level);
  return null;
};

// Build AI analysis display from full_result or metadata (show human-readable text only)
const getAIAnalysis = (grievance) => {
  const out = { sections: [], hasAny: false };
  let metadata = grievance.metadata;
  if (metadata && typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = null;
    }
  }
  let fullResult = metadata?.full_result ?? grievance.full_result;
  if (fullResult && typeof fullResult === "string") {
    try {
      fullResult = JSON.parse(fullResult);
    } catch {
      fullResult = null;
    }
  }
  const agentOutputs = metadata?.agent_outputs || {};
  const fr = fullResult && typeof fullResult === "object" ? fullResult : null;

  if (fr) {
    const items = [];
    const cls = fr.classification || {};
    const cat = fr.category ?? cls.category;
    const dept = fr.department_name ?? cls.department;
    const catStr = formatCategoryDisplay(cat);
    const deptStr = formatDepartmentDisplay(dept);
    const pri = fr.priority ?? fr.analysis?.priority;
    const priStr = formatPriorityDisplay(pri);
    if (catStr) items.push({ label: "Category", value: catStr });
    if (deptStr) items.push({ label: "Department", value: deptStr });
    if (priStr) items.push({ label: "Priority", value: priStr });
    if (items.length) {
      out.sections.push({ title: "Category & Department", items });
      out.hasAny = true;
    }
    const summary = fr.summary || fr.executive_summary || fr.analysis_summary;
    if (summary) {
      out.sections.push({ title: "Summary", text: typeof summary === "string" ? summary : String(summary) });
      out.hasAny = true;
    }
  }
  const cat = agentOutputs.category;
  const dept = agentOutputs.department;
  if ((cat || dept) && !out.hasAny) {
    const items = [];
    const catStr = formatCategoryDisplay(cat);
    const deptStr = formatDepartmentDisplay(dept);
    if (catStr) items.push({ label: "Category", value: catStr });
    if (deptStr) items.push({ label: "Department", value: deptStr });
    if (items.length) {
      out.sections.push({ title: "Category & Department", items });
      out.hasAny = true;
    }
  }
  // Fallback: DB columns category, department_info, sentiment_priority (never show raw JSON)
  if (!out.hasAny || (out.sections.length === 1 && out.sections[0].items?.length < 3)) {
    const rootCat = formatCategoryDisplay(grievance.category);
    const rootDept = formatDepartmentDisplay(grievance.department_info ?? grievance.department);
    const rootPri = formatPriorityDisplay(grievance.sentiment_priority ?? grievance.priority);
    if (rootCat || rootDept || rootPri) {
      const existing = out.sections.find((s) => s.title === "Category & Department");
      const items = existing?.items ? [...existing.items] : [];
      if (rootCat && !items.some((i) => i.label === "Category")) items.push({ label: "Category", value: rootCat });
      if (rootDept && !items.some((i) => i.label === "Department")) items.push({ label: "Department", value: rootDept });
      if (rootPri && !items.some((i) => i.label === "Priority")) items.push({ label: "Priority", value: rootPri });
      if (items.length) {
        if (existing) existing.items = items;
        else out.sections.push({ title: "Category & Department", items });
        out.hasAny = true;
      }
    }
  }
  const v = metadata?.validation_result;
  if (v && typeof v === "object") {
    out.sections.push({
      title: "Validation",
      items: [
        { label: "Status", value: v.is_valid ? "Valid" : "Rejected" },
        v.reasoning && { label: "Reasoning", value: v.reasoning },
      ].filter(Boolean),
    });
    out.hasAny = true;
  }
  const loc = metadata?.location_data;
  if (loc && typeof loc === "object" && loc.address) {
    out.sections.push({ title: "Detected Location", text: loc.address });
    out.hasAny = true;
  }
  return out;
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
      .catch(() => {
        setDetail(null);
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

  return (
    <main className="flex-1 p-3 md:p-6 relative z-10 overflow-y-auto">
      {/* Golden "My Grievances" highlight */}
      <div className="mb-6 pb-4 border-b-2 border-amber-400/30">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
          My Grievances
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {loading ? "Loading…" : `${filteredGrievances.length} grievance${filteredGrievances.length !== 1 ? "s" : ""} found`}
          {!loading && currentCitizenId && filteredGrievances.some((g) => String(g.citizen_id) === currentCitizenId) && (
            <span className="ml-2 text-amber-600 font-medium">(yours highlighted in gold)</span>
          )}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by title, description, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl focus:ring-2 focus:ring-blue-200 focus:border-blue-300 shadow-sm"
          />
        </div>
        <div className="relative filter-dropdown">
          <button
            type="button"
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-2 px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl hover:border-blue-300/70 shadow-sm"
          >
            <Filter size={18} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
            <ChevronDown size={16} className={`text-gray-400 ${showFilterDropdown ? "rotate-180" : ""}`} />
          </button>
          {showFilterDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white/95 border border-gray-200 rounded-2xl shadow-xl z-50 p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="All Status">All Status</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Analyzed">Analyzed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="All Priorities">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="Date">Date</option>
                    <option value="Priority">Priority</option>
                  </select>
                </div>
                {(searchTerm || selectedStatus !== "All Status" || selectedPriority !== "All Priorities") && (
                  <div className="pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm w-full justify-center"
                    >
                      <X size={16} />
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                className={`bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-all ${
                  isMine ? "border-l-4 border-l-amber-500 hover:border-amber-400/50" : "border-l-4 border-l-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {isMine && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                          My grievance
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(g.status, g)}`}>
                        {formatStatus(g.status, g)}
                      </span>
                      {hasAnalysis(g) && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700 border border-sky-200">
                          Analysis ready
                        </span>
                      )}
                      {meta.category && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {meta.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{getTitle(g.grievance_text)}</h3>
                    {(meta.city || meta.age) && (
                      <p className="text-sm text-gray-500 mb-1">
                        {[meta.city, meta.age ? `Age: ${meta.age}` : null].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="text-gray-700 text-sm line-clamp-2">{descSnippet || "—"}{descSnippet.length >= 120 ? "…" : ""}</p>
                    {hasAnalysis(g) && (meta.category || meta.department) && (
                      <p className="text-sm text-sky-700 mt-2 flex items-center gap-1 flex-wrap">
                        <Sparkles size={14} className="shrink-0" />
                        {[meta.category, meta.department].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(g.created_at)}
                      </span>
                      {g.department_name && (
                        <span className="flex items-center gap-1">
                          <Building2 size={14} />
                          {g.department_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(g.priority)}`}>
                      {(g.priority || "medium").toLowerCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => openDetail(g.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
                    >
                      <Eye size={16} />
                      View details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filteredGrievances.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-lg border border-gray-200 text-center">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No grievances found</h3>
          <p className="text-gray-600 mb-4">
            {grievances.length === 0 ? "You haven’t submitted any grievances yet." : "Try changing your filters."}
          </p>
          <button type="button" onClick={clearFilters} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            {grievances.length === 0 ? "Go to dashboard" : "Clear filters"}
          </button>
        </div>
      )}

      {/* Detail modal */}
      {detailId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDetailId(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Grievance details</h3>
              <button type="button" onClick={() => setDetailId(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {detailLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-blue-600" />
                </div>
              ) : detail && detail.grievance ? (
                <>
                  <div className="space-y-4 mb-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusColor(detail.grievance.status, detail.grievance)}`}>
                          {formatStatus(detail.grievance.status, detail.grievance)}
                        </span>
                        {hasAnalysis(detail.grievance) && (
                          <span className="text-xs text-sky-600 font-medium">AI analysis completed</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Description</p>
                      <p className="mt-1 text-gray-800 whitespace-pre-wrap">{detail.grievance.grievance_text || "—"}</p>
                    </div>

                    {/* Proof / Evidence */}
                    {detail.grievance.image_path && (
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <ImageIcon size={14} />
                          Proof / Evidence
                        </p>
                        {isImageUrl(detail.grievance.image_path) ? (
                          <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                            <img
                              src={detail.grievance.image_path}
                              alt={detail.grievance.image_description || "Proof"}
                              className="w-full max-h-80 object-contain"
                              onError={(e) => { e.target.style.display = "none"; e.target.nextElementSibling?.classList.remove("hidden"); }}
                            />
                            <p className="hidden p-4 text-center text-gray-500 text-sm">
                              Image could not be loaded.{" "}
                              <a href={detail.grievance.image_path} target="_blank" rel="noopener noreferrer" className="text-blue-600 flex items-center justify-center gap-1 mt-2">
                                <ExternalLink size={14} /> Open link
                              </a>
                            </p>
                            {detail.grievance.image_description && (
                              <p className="text-xs text-gray-500 px-3 py-2 border-t border-gray-100">{detail.grievance.image_description}</p>
                            )}
                          </div>
                        ) : (
                          <a
                            href={detail.grievance.image_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
                          >
                            <FileText size={18} />
                            {detail.grievance.image_description || "View proof document"}
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    )}

                    {/* AI Analysis - show when grievance has been analyzed and we have results */}
                    {(() => {
                      const analysis = getAIAnalysis(detail.grievance);
                      if (!analysis.hasAny) return null;
                      return (
                        <div className="border-t border-gray-200 pt-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Sparkles size={18} className="text-sky-600" />
                            Analysis results
                          </h4>
                          <div className="rounded-xl bg-sky-50/50 border border-sky-100 p-4 space-y-4">
                            {analysis.sections.map((sec, i) => (
                              <div key={i}>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">{sec.title}</p>
                                {sec.text && <p className="text-sm text-gray-800">{sec.text}</p>}
                                {sec.items && sec.items.length > 0 && (
                                  <ul className="space-y-1">
                                    {sec.items.map((item, j) => (
                                      <li key={j} className="text-sm flex gap-2">
                                        <span className="text-gray-500 shrink-0">{item.label}:</span>
                                        <span className="text-gray-800">{item.value}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {(detail.grievance.department_name || detail.grievance.officer_name) && (
                      <div className="flex flex-wrap gap-4 text-sm">
                        {detail.grievance.department_name && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <Building2 size={16} />
                            {detail.grievance.department_name}
                          </span>
                        )}
                        {detail.grievance.officer_name && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <User size={16} />
                            Assigned: {detail.grievance.officer_name}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-gray-500">
                      Submitted: {formatDate(detail.grievance.created_at)} · Last updated: {formatDate(detail.grievance.updated_at)}
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Clock size={18} />
                      Timeline
                    </h4>
                    {detail.timeline && detail.timeline.length > 0 ? (
                      <ul className="space-y-0">
                        {detail.timeline.map((step, i) => (
                          <li key={i} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                              {i < detail.timeline.length - 1 && <div className="w-0.5 h-6 bg-gray-200 shrink-0" />}
                            </div>
                            <div className="pb-4">
                              <p className="font-medium text-gray-900">{step.label || step.stage}</p>
                              {step.description && <p className="text-sm text-gray-600">{step.description}</p>}
                              <p className="text-xs text-gray-500 mt-0.5">{formatDate(step.at)}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">Submitted {formatDate(detail.grievance.created_at)}. Updates will appear here.</p>
                    )}
                  </div>

                  {detail.comments && detail.comments.length > 0 && (
                    <div className="border-t border-gray-200 pt-6 mt-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Comments</h4>
                      <ul className="space-y-2">
                        {detail.comments.map((c) => (
                          <li key={c.id} className="text-sm p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-700">{c.user_name || "Officer"}</span>
                            <span className="text-gray-500 ml-2 text-xs">{formatDate(c.created_at)}</span>
                            <p className="mt-1 text-gray-700">{c.comment}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500">Could not load this grievance.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
        <p className="text-sm text-gray-500 text-center">Thank you for helping us improve.</p>
      </div>
    </main>
  );
};

export default Grievances;
