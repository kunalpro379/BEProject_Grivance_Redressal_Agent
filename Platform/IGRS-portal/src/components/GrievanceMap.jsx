import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import axios from 'axios';
import './GrievanceMap.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const GrievanceMap = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    category: 'all'
  });
  const [stats, setStats] = useState({
    total: 0,
    byStatus: {},
    byPriority: {},
    byCategory: {}
  });

  // Color schemes
  const statusColors = {
    'submitted': '#3b82f6',      // Blue
    'pending': '#eab308',        // Yellow
    'assigned': '#8b5cf6',       // Purple
    'in_progress': '#f59e0b',    // Orange
    'resolved': '#10b981',       // Green
    'closed': '#6b7280',         // Gray
    'rejected': '#ef4444'        // Red
  };

  const priorityColors = {
    'low': '#10b981',      // Green
    'medium': '#f59e0b',   // Orange
    'high': '#ef4444',     // Red
    'critical': '#dc2626'  // Dark Red
  };

  const categoryIcons = {
    'Sanitation': '🗑️',
    'Roads': '🛣️',
    'Water': '💧',
    'Electricity': '⚡',
    'Healthcare': '🏥',
    'Education': '🎓',
    'Transport': '🚌',
    'Default': '📍'
  };

  useEffect(() => {
    initializeMap();
    fetchGrievances();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && grievances.length > 0) {
      updateMarkers();
    }
  }, [grievances, filters]);

  const initializeMap = () => {
    if (mapInstanceRef.current) return;

    // Initialize map centered on India
    const map = L.map(mapRef.current, {
      center: [20.5937, 78.9629], // India center
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Initialize marker cluster group
    markersLayerRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 50
    });

    map.addLayer(markersLayerRef.current);
    mapInstanceRef.current = map;
  };

  const fetchGrievances = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('http://localhost:4000/api/grievances', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const grievancesData = response.data.grievances || [];
      
      // Filter grievances with valid coordinates
      const validGrievances = grievancesData.filter(g => 
        g.latitude && g.longitude && 
        !isNaN(g.latitude) && !isNaN(g.longitude) &&
        g.latitude >= -90 && g.latitude <= 90 &&
        g.longitude >= -180 && g.longitude <= 180
      );

      console.log(`Loaded ${validGrievances.length} grievances with valid coordinates out of ${grievancesData.length} total`);
      
      setGrievances(validGrievances);
      calculateStats(validGrievances);
      setLoading(false);

      // Fit map to show all markers
      if (validGrievances.length > 0 && mapInstanceRef.current) {
        const bounds = L.latLngBounds(
          validGrievances.map(g => [g.latitude, g.longitude])
        );
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (error) {
      console.error('Error fetching grievances:', error);
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const stats = {
      total: data.length,
      byStatus: {},
      byPriority: {},
      byCategory: {}
    };

    data.forEach(g => {
      // Status
      const status = g.status || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Priority
      const priority = g.priority || 'medium';
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

      // Category
      const category = g.category || 'Other';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    setStats(stats);
  };

  const createCustomIcon = (grievance) => {
    const status = grievance.status || 'submitted';
    const priority = grievance.priority || 'medium';
    const category = grievance.category || 'Default';
    
    const color = statusColors[status] || statusColors.submitted;
    const icon = categoryIcons[category] || categoryIcons.Default;
    
    const html = `
      <div class="custom-marker" style="background-color: ${color};">
        <span class="marker-icon">${icon}</span>
        ${priority === 'high' || priority === 'critical' ? '<span class="priority-badge">!</span>' : ''}
      </div>
    `;

    return L.divIcon({
      html: html,
      className: 'custom-marker-wrapper',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });
  };

  const createPopupContent = (grievance) => {
    const statusColor = statusColors[grievance.status] || '#gray';
    const priorityColor = priorityColors[grievance.priority] || '#gray';

    return `
      <div class="grievance-popup">
        <div class="popup-header">
          <h3>${grievance.grievance_id || 'N/A'}</h3>
          <span class="status-badge" style="background-color: ${statusColor};">
            ${grievance.status || 'Unknown'}
          </span>
        </div>
        
        <div class="popup-content">
          <div class="popup-row">
            <strong>Category:</strong>
            <span>${grievance.category || 'N/A'}</span>
          </div>
          
          <div class="popup-row">
            <strong>Priority:</strong>
            <span class="priority-badge" style="background-color: ${priorityColor};">
              ${grievance.priority || 'Medium'}
            </span>
          </div>
          
          <div class="popup-row">
            <strong>Location:</strong>
            <span>${grievance.location || grievance.location_address || 'N/A'}</span>
          </div>
          
          <div class="popup-row">
            <strong>Submitted:</strong>
            <span>${new Date(grievance.created_at).toLocaleDateString()}</span>
          </div>
          
          ${grievance.department_name ? `
            <div class="popup-row">
              <strong>Department:</strong>
              <span>${grievance.department_name}</span>
            </div>
          ` : ''}
          
          <div class="popup-description">
            <strong>Description:</strong>
            <p>${(grievance.grievance_text || '').substring(0, 150)}...</p>
          </div>
        </div>
        
        <div class="popup-footer">
          <button onclick="window.location.href='/grievances/${grievance.id}'" class="view-details-btn">
            View Details
          </button>
        </div>
      </div>
    `;
  };

  const updateMarkers = () => {
    if (!markersLayerRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Filter grievances
    const filteredGrievances = grievances.filter(g => {
      if (filters.status !== 'all' && g.status !== filters.status) return false;
      if (filters.priority !== 'all' && g.priority !== filters.priority) return false;
      if (filters.category !== 'all' && g.category !== filters.category) return false;
      return true;
    });

    // Add markers
    filteredGrievances.forEach(grievance => {
      const marker = L.marker(
        [grievance.latitude, grievance.longitude],
        { icon: createCustomIcon(grievance) }
      );

      marker.bindPopup(createPopupContent(grievance), {
        maxWidth: 300,
        className: 'custom-popup'
      });

      marker.on('click', () => {
        console.log('Clicked grievance:', grievance);
      });

      markersLayerRef.current.addLayer(marker);
    });

    calculateStats(filteredGrievances);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      priority: 'all',
      category: 'all'
    });
  };

  return (
    <div className="grievance-map-container">
      {/* Header */}
      <div className="map-header">
        <h2>Grievance Map</h2>
        <div className="map-stats">
          <div className="stat-item">
            <span className="stat-label">Total:</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="map-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={filters.status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="all">All</option>
            {Object.keys(stats.byStatus).map(status => (
              <option key={status} value={status}>
                {status} ({stats.byStatus[status]})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Priority:</label>
          <select 
            value={filters.priority} 
            onChange={(e) => handleFilterChange('priority', e.target.value)}
          >
            <option value="all">All</option>
            {Object.keys(stats.byPriority).map(priority => (
              <option key={priority} value={priority}>
                {priority} ({stats.byPriority[priority]})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <select 
            value={filters.category} 
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="all">All</option>
            {Object.keys(stats.byCategory).map(category => (
              <option key={category} value={category}>
                {category} ({stats.byCategory[category]})
              </option>
            ))}
          </select>
        </div>

        <button onClick={resetFilters} className="reset-btn">
          Reset Filters
        </button>

        <button onClick={fetchGrievances} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="map-legend">
        <h4>Status Legend</h4>
        <div className="legend-items">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="legend-item">
              <span className="legend-color" style={{ backgroundColor: color }}></span>
              <span className="legend-label">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="map-wrapper">
        {loading && (
          <div className="map-loading">
            <div className="spinner"></div>
            <p>Loading grievances...</p>
          </div>
        )}
        <div ref={mapRef} className="leaflet-map"></div>
      </div>
    </div>
  );
};

export default GrievanceMap;
