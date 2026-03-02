import React from 'react';
import { MapPin } from 'lucide-react';
import './LocationDisplay.css';

/**
 * LocationDisplay - Smart component to display location information
 * Only shows relevant fields: city, address, pincode, state, area_name, street_name
 * Skips null/undefined values automatically
 */
const LocationDisplay = ({ locationData }) => {
  if (!locationData || typeof locationData !== 'object') {
    return <span className="location-not-available">Location not available</span>;
  }

  // Extract relevant fields
  const address = locationData.address;
  const city = locationData.location_details?.city || locationData.city;
  const state = locationData.location_details?.state || locationData.state;
  const pincode = locationData.location_details?.pincode || locationData.pincode;
  const areaName = locationData.location_details?.area_name || locationData.area_name;
  const streetName = locationData.location_details?.street_name || locationData.street_name;
  const areaType = locationData.area_type;
  const confidence = locationData.confidence;

  // Check if we have any meaningful data
  const hasData = address || city || state || pincode || areaName || streetName;

  if (!hasData) {
    return <span className="location-not-available">Location not available</span>;
  }

  return (
    <div className="location-display">
      {/* Address (if available and not "Not visible") */}
      {address && address !== "Not visible" && address !== "Not available" && (
        <div className="location-item location-address">
          <MapPin size={16} className="location-icon" />
          <span className="location-value">{address}</span>
        </div>
      )}

      {/* City */}
      {city && (
        <div className="location-item">
          <span className="location-label">City:</span>
          <span className="location-value">{city}</span>
        </div>
      )}

      {/* Street Name */}
      {streetName && (
        <div className="location-item">
          <span className="location-label">Street:</span>
          <span className="location-value">{streetName}</span>
        </div>
      )}

      {/* Area Name */}
      {areaName && (
        <div className="location-item">
          <span className="location-label">Area:</span>
          <span className="location-value">{areaName}</span>
        </div>
      )}

      {/* State */}
      {state && (
        <div className="location-item">
          <span className="location-label">State:</span>
          <span className="location-value">{state}</span>
        </div>
      )}

      {/* Pincode */}
      {pincode && (
        <div className="location-item">
          <span className="location-label">Pincode:</span>
          <span className="location-value">{pincode}</span>
        </div>
      )}

      {/* Area Type (if available) */}
      {areaType && areaType !== "unknown" && (
        <div className="location-item">
          <span className="location-label">Area Type:</span>
          <span className={`location-badge area-type-${areaType.replace('_', '-')}`}>
            {areaType.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      )}

      {/* Confidence (optional, subtle display) */}
      {confidence && confidence !== "none" && (
        <div className="location-confidence">
          <span className={`confidence-indicator confidence-${confidence}`}>
            {confidence} confidence
          </span>
        </div>
      )}
    </div>
  );
};

export default LocationDisplay;
