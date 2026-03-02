// Enhanced Grievances View for Department Dashboard
// This component adds map view and enhanced grievance details similar to citizen portal

import React from 'react';
import { 
  Search, Eye, Pencil, Loader, X, MapPin, FileText, Clock, 
  Building2, Activity, CheckCircle, MapIcon, Maximize2, Minimize2,
  Calendar, Sparkles, ExternalLink, Image as ImageIcon, MessageSquare
} from 'lucide-react';
import LocationDisplay from '../../components/LocationDisplay';
import JsonRenderer from '../../components/JsonRenderer';

export const EnhancedGrievancesView = ({
  grievances,
  grievancesLoading,
  grievanceSearch,
  setGrievanceSearch,
  filterStatus,
  setFilterStatus,
  filterCategory,
  setFilterCategory,
  filterPriority,
  setFilterPriority,
  filteredGrievances,
  selectedGrievanceId,
  setSelectedGrievanceId,
  grievanceDetail,
  grievanceDetailLoading,
  mapRef,
  mapExpanded,
  setMapExpanded,
  formatGrievanceDate,
  getCategoryLabel,
  priorityPillClass,
  statusPillClass,
  formatDate,
  formatStatus,
  getStatusColor,
  isImageUrl,
  buildTimeline
}) => {
  return (
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

      {/* Map Section */}
      {!grievancesLoading && filteredGrievances.length > 0 && (
        <div className={`bg-white rounded-xl border border-stone-200 shadow-md overflow-hidden transition-all ${mapExpanded ? 'h-[600px]' : 'h-[400px]'}`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
            <div className="flex items-center gap-3">
              <MapIcon className="w-5 h-5 text-stone-700" />
              <h3 className="text-lg font-bold text-stone-900">Grievances Map</h3>
              <span className="text-sm text-stone-500">
                {filteredGrievances.filter(g => g.latitude && g.longitude).length} locations
              </span>
            </div>
            <button 
              className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
              onClick={() => setMapExpanded(!mapExpanded)}
              title={mapExpanded ? 'Minimize map' : 'Expand map'}
            >
              {mapExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
          <div ref={mapRef} className="w-full h-[calc(100%-60px)]"></div>
        </div>
      )}

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

      {/* Enhanced Grievance Details Modal */}
      {selectedGrievanceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedGrievanceId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Grievance Details</h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-stone-600">
                    <span className="font-semibold">ID:</span> {grievanceDetail?.grievance_id || selectedGrievanceId}
                  </span>
                  {grievanceDetail && (
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(grievanceDetail.status, grievanceDetail)}`}>
                      {formatStatus(grievanceDetail.status, grievanceDetail)}
                    </span>
                  )}
                </div>
              </div>
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
                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-bold text-stone-800 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Description
                    </h3>
                    <p className="text-sm text-stone-700 bg-stone-50 p-4 rounded-lg">
                      {grievanceDetail.description || grievanceDetail.grievance_text || '—'}
                    </p>
                  </div>

                  {/* Citizen Information */}
                  <div>
                    <h3 className="text-sm font-bold text-stone-800 mb-3">Citizen Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-stone-50 p-3 rounded-lg">
                        <p className="text-stone-500 text-xs mb-1">Name</p>
                        <p className="font-medium text-stone-900">{grievanceDetail.citizen_name || '—'}</p>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-lg">
                        <p className="text-stone-500 text-xs mb-1">Phone</p>
                        <p className="font-medium text-stone-900">{grievanceDetail.citizen_phone || '—'}</p>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-lg">
                        <p className="text-stone-500 text-xs mb-1">Email</p>
                        <p className="font-medium text-stone-900">{grievanceDetail.citizen_email || '—'}</p>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-lg">
                        <p className="text-stone-500 text-xs mb-1">Location</p>
                        <p className="font-medium text-stone-900">{grievanceDetail.location || grievanceDetail.location_address || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  {(grievanceDetail.latitude || grievanceDetail.location_address || grievanceDetail.extracted_location) && (
                    <div>
                      <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Location Information
                      </h3>
                      {grievanceDetail.extracted_location && typeof grievanceDetail.extracted_location === 'object' ? (
                        <LocationDisplay locationData={grievanceDetail.extracted_location} />
                      ) : grievanceDetail.location_address ? (
                        <LocationDisplay locationData={{ 
                          address: grievanceDetail.location_address,
                          latitude: grievanceDetail.latitude,
                          longitude: grievanceDetail.longitude
                        }} />
                      ) : (
                        <span className="text-sm text-stone-500">Location not available</span>
                      )}
                    </div>
                  )}

                  {/* Proof/Evidence */}
                  {grievanceDetail.image_path && (
                    <div>
                      <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Proof / Evidence
                      </h3>
                      {isImageUrl(grievanceDetail.image_path) ? (
                        <img
                          src={grievanceDetail.image_path}
                          alt="Grievance proof"
                          className="max-w-full h-auto rounded-lg border border-stone-200"
                        />
                      ) : (
                        <a
                          href={grievanceDetail.image_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <FileText className="w-4 h-4" />
                          View Attachment
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* AI Analysis */}
                  {grievanceDetail.full_result && (
                    <div>
                      <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI Analysis
                      </h3>
                      <JsonRenderer 
                        data={typeof grievanceDetail.full_result === 'object' ? grievanceDetail.full_result : JSON.parse(grievanceDetail.full_result)} 
                        title="Complete AI Analysis"
                      />
                    </div>
                  )}

                  {/* Enhanced Timeline */}
                  <div>
                    <h3 className="text-sm font-bold text-stone-800 mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Timeline
                    </h3>
                    <div className="space-y-4">
                      {buildTimeline(grievanceDetail).map((step, i, arr) => {
                        const Icon = step.icon;
                        return (
                          <div key={i} className={`flex gap-4 ${step.completed ? '' : 'opacity-50'}`}>
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                step.completed ? 'bg-green-600 text-white' : 'bg-stone-200 text-stone-600'
                              }`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              {i < arr.length - 1 && <div className="w-0.5 flex-1 min-h-[40px] bg-stone-200 mt-2" />}
                            </div>
                            <div className="flex-1 pb-4">
                              <h4 className="font-semibold text-stone-900">{step.label}</h4>
                              <p className="text-sm text-stone-600 mt-1">{step.description}</p>
                              <p className="text-xs text-stone-500 mt-1">{formatDate(step.at)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-stone-200">
                    <div>
                      <p className="text-xs text-stone-500">Submitted</p>
                      <p className="text-sm font-medium text-stone-900">{formatDate(grievanceDetail.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">Last Updated</p>
                      <p className="text-sm font-medium text-stone-900">{formatDate(grievanceDetail.updated_at)}</p>
                    </div>
                    {grievanceDetail.resolved_at && (
                      <div>
                        <p className="text-xs text-stone-500">Resolved</p>
                        <p className="text-sm font-medium text-stone-900">{formatDate(grievanceDetail.resolved_at)}</p>
                      </div>
                    )}
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
};
