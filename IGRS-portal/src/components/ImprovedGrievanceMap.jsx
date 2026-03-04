import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MapPin, AlertTriangle } from 'lucide-react';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Add custom styles for popup
const popupStyles = `
  .leaflet-popup-content-wrapper {
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    padding: 0;
    overflow: hidden;
  }
  .leaflet-popup-content {
    margin: 16px;
    line-height: 1.4;
  }
  .leaflet-popup-tip {
    box-shadow: 0 3px 14px rgba(0,0,0,0.15);
  }
  .custom-popup .leaflet-popup-close-button {
    color: #78716c;
    font-size: 24px;
    padding: 8px 12px;
    font-weight: 300;
  }
  .custom-popup .leaflet-popup-close-button:hover {
    color: #292524;
    background-color: #f5f5f4;
    border-radius: 6px;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = popupStyles;
  document.head.appendChild(styleSheet);
}

const ImprovedGrievanceMap = ({ grievances = [] }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [mapError, setMapError] = useState(null);

  // Priority colors
  const getPriorityColor = (priority) => {
    const p = (priority || '').toLowerCase();
    if (p === 'emergency') return '#dc2626';
    if (p === 'urgent') return '#ea580c';
    if (p === 'high') return '#f59e0b';
    if (p === 'medium') return '#eab308';
    if (p === 'low') return '#22c55e';
    return '#64748b';
  };

  // Status badge class
  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'resolved') return 'bg-green-100 text-green-800';
    if (s === 'in_progress' || s === 'assigned') return 'bg-blue-100 text-blue-800';
    if (s === 'rejected') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  useEffect(() => {
    if (!mapRef.current) return;

    try {
      // Initialize map
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current, {
          center: [19.1975, 73.194], // Default: Ambernath
          zoom: 12,
          scrollWheelZoom: true,
          zoomControl: true,
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      }

      // Clear existing markers
      if (markersLayerRef.current) {
        mapInstanceRef.current.removeLayer(markersLayerRef.current);
      }

      // Filter valid coordinates
      const validGrievances = grievances.filter(g => {
        const lat = Number(g.lat);
        const lng = Number(g.lng);
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 &&
               lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      });

      if (validGrievances.length === 0) {
        setMapError('No grievances with valid coordinates');
        return;
      }

      // Create marker cluster group with better settings
      const markers = L.markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 80, // Better clustering
        disableClusteringAtZoom: 16, // Show individual markers at high zoom
        iconCreateFunction: function(cluster) {
          const count = cluster.getChildCount();
          
          // Get priority distribution in cluster
          const markers = cluster.getAllChildMarkers();
          let hasEmergency = false;
          let hasUrgent = false;
          let hasHigh = false;
          
          markers.forEach(m => {
            const priority = (m.options.priority || '').toLowerCase();
            if (priority === 'emergency') hasEmergency = true;
            else if (priority === 'urgent') hasUrgent = true;
            else if (priority === 'high') hasHigh = true;
          });
          
          // Determine cluster color based on highest priority
          let clusterColor = '#64748b'; // Default
          let borderColor = '#475569';
          if (hasEmergency) {
            clusterColor = '#dc2626';
            borderColor = '#991b1b';
          } else if (hasUrgent) {
            clusterColor = '#ea580c';
            borderColor = '#c2410c';
          } else if (hasHigh) {
            clusterColor = '#f59e0b';
            borderColor = '#d97706';
          }
          
          // Size based on count
          let size = 40;
          if (count > 50) size = 60;
          else if (count > 20) size = 50;
          else if (count > 10) size = 45;
          
          return L.divIcon({
            html: `
              <div style="
                width: ${size}px;
                height: ${size}px;
                background: linear-gradient(135deg, ${clusterColor} 0%, ${borderColor} 100%);
                border-radius: 50%;
                border: 4px solid white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                color: white;
                font-size: ${count > 99 ? '14px' : '16px'};
                position: relative;
              ">
                <div style="
                  position: absolute;
                  top: -8px;
                  right: -8px;
                  background-color: #1e293b;
                  color: white;
                  border-radius: 50%;
                  width: 24px;
                  height: 24px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 10px;
                  font-weight: 700;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                ">
                  ${count}
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3" fill="${borderColor}"></circle>
                </svg>
              </div>
            `,
            className: 'custom-cluster-icon',
            iconSize: L.point(size, size)
          });
        }
      });

      // Add markers
      validGrievances.forEach(g => {
        const lat = Number(g.lat);
        const lng = Number(g.lng);
        const color = getPriorityColor(g.priority);

        // Create custom marker icon with priority badge
        const icon = L.divIcon({
          className: 'custom-marker-icon',
          html: `
            <div style="
              position: relative;
              width: 32px;
              height: 32px;
            ">
              <div style="
                position: absolute;
                top: 0;
                left: 0;
                background-color: ${color};
                width: 32px;
                height: 32px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 3px 8px rgba(0,0,0,0.4);
              "></div>
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -60%);
                width: 12px;
                height: 12px;
                background-color: white;
                border-radius: 50%;
                z-index: 1;
              "></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        });

        const marker = L.marker([lat, lng], { 
          icon,
          priority: g.priority // Store priority for cluster coloring
        });

        // Create popup content with better styling
        const popupContent = `
          <div style="min-width: 300px; max-width: 350px; font-family: system-ui, -apple-system, sans-serif;">
            <!-- Header -->
            <div style="
              background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
              color: white;
              padding: 12px 16px;
              margin: -12px -16px 12px -16px;
              border-radius: 8px 8px 0 0;
              font-weight: 700;
              font-size: 13px;
              letter-spacing: 0.5px;
            ">
              ${g.grievance_id || 'N/A'}
            </div>
            
            <!-- Description -->
            <div style="
              font-size: 14px;
              color: #292524;
              line-height: 1.5;
              margin-bottom: 12px;
              font-weight: 500;
            ">
              ${(g.title || 'No description').substring(0, 200)}${(g.title || '').length > 200 ? '...' : ''}
            </div>
            
            <!-- Location -->
            <div style="
              display: flex;
              align-items: flex-start;
              gap: 8px;
              padding: 10px;
              background-color: #fafaf9;
              border-radius: 6px;
              margin-bottom: 12px;
              border-left: 3px solid ${color};
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span style="font-size: 12px; color: #57534e; line-height: 1.4;">
                ${g.location || 'No address available'}
              </span>
            </div>
            
            <!-- Status & Priority Badges -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
              <span style="
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                ${g.status === 'resolved' ? 'background-color: #dcfce7; color: #166534;' : 
                  g.status === 'in_progress' || g.status === 'assigned' ? 'background-color: #dbeafe; color: #1e40af;' :
                  g.status === 'rejected' ? 'background-color: #fee2e2; color: #991b1b;' :
                  'background-color: #f3f4f6; color: #374151;'}
              ">
                ${(g.status || 'N/A').replace(/_/g, ' ')}
              </span>
              <span style="
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                background-color: ${color};
                color: white;
              ">
                ${g.priority || 'N/A'}
              </span>
            </div>
            
            <!-- People Info -->
            ${g.citizen_name || g.officer_name ? `
              <div style="
                padding: 10px;
                background-color: #f5f5f4;
                border-radius: 6px;
                margin-bottom: 12px;
              ">
                ${g.citizen_name ? `
                  <div style="font-size: 12px; color: #44403c; margin-bottom: 4px;">
                    <span style="font-weight: 600; color: #292524;">Citizen:</span> ${g.citizen_name}
                  </div>
                ` : ''}
                ${g.officer_name ? `
                  <div style="font-size: 12px; color: #44403c;">
                    <span style="font-weight: 600; color: #292524;">Officer:</span> ${g.officer_name}
                  </div>
                ` : ''}
              </div>
            ` : ''}
            
            <!-- Date -->
            <div style="
              font-size: 11px;
              color: #a8a29e;
              text-align: right;
              padding-top: 8px;
              border-top: 1px solid #e7e5e4;
            ">
              📅 ${new Date(g.created_at).toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 380,
          minWidth: 300,
          className: 'custom-popup',
          closeButton: true,
          offset: [0, -10] // Offset popup above marker
        });

        markers.addLayer(marker);
      });

      // Add markers to map
      mapInstanceRef.current.addLayer(markers);
      markersLayerRef.current = markers;

      // Fit bounds to show all markers
      if (validGrievances.length > 0) {
        const bounds = L.latLngBounds(validGrievances.map(g => [Number(g.lat), Number(g.lng)]));
        mapInstanceRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15
        });
      }

      setMapError(null);
    } catch (error) {
      console.error('Map error:', error);
      setMapError('Failed to initialize map');
    }

    // Cleanup
    return () => {
      if (markersLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(markersLayerRef.current);
      }
    };
  }, [grievances]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: '500px' }} />
      
      {mapError && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 border-2 border-amber-200 z-[1000]">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">{mapError}</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000] border border-stone-200">
        <div className="text-xs font-bold text-stone-700 mb-2">PRIORITY</div>
        <div className="space-y-1">
          {[
            { label: 'Emergency', color: '#dc2626' },
            { label: 'Urgent', color: '#ea580c' },
            { label: 'High', color: '#f59e0b' },
            { label: 'Medium', color: '#eab308' },
            { label: 'Low', color: '#22c55e' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full border-2 border-white shadow-sm" 
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-stone-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImprovedGrievanceMap;
