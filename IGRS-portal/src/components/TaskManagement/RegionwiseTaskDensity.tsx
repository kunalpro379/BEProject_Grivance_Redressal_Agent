"use client"

import React from "react"
import { useEffect } from 'react'
import "leaflet/dist/leaflet.css"
import L from 'leaflet'
import dynamic from 'next/dynamic'
import * as topojson from 'topojson-client'
import type { Geometry, GeometryCollection } from 'geojson'

// Dynamic imports for React Leaflet components
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => ({ default: mod.MapContainer })),
  { ssr: false }
)

const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => ({ default: mod.TileLayer })),
  { ssr: false }
)

const GeoJSON = dynamic(
  () => import('react-leaflet').then(mod => ({ default: mod.GeoJSON })),
  { ssr: false }
)

const Marker = dynamic(
  () => import('react-leaflet').then(mod => ({ default: mod.Marker })),
  { ssr: false }
)

const Popup = dynamic(
  () => import('react-leaflet').then(mod => ({ default: mod.Popup })),
  { ssr: false }
)

// Import GeoJSON data and transform from TopoJSON
import upGeoJsonRaw from '../../assets/uttarpradesh.json'

const geoData = topojson.feature(
  upGeoJsonRaw as any,
  (upGeoJsonRaw as any).objects["uttar-pradesh"]
) as unknown as GeoJSON.FeatureCollection<Geometry>;

// Correct coordinate order for Leaflet (it expects [lat, lng])
const upGeoJson: GeoJSON.FeatureCollection<Geometry> = {
  type: "FeatureCollection",
  features: geoData.features.map(feature => ({
    type: "Feature",
    properties: feature.properties,
    geometry: feature.geometry.type !== "GeometryCollection" ? {
      type: feature.geometry.type,
      coordinates: (feature.geometry as any).coordinates.map((ring: any) => 
        Array.isArray(ring[0]) 
          ? ring.map((coord: number[]) => [coord[1], coord[0]])
          : [ring[1], ring[0]]
      )
    } : null
  }))
};

// Type definitions
interface TaskDensityData {
  [key: string]: number;
}

// Updated sample task density data with more realistic values
const taskDensityData: TaskDensityData = {
  "Lucknow": 245,
  "Kanpur Nagar": 188,
  "Varanasi": 176,
  "Agra": 165,
  "Prayagraj": 155,
  "Meerut": 142,
  "Ghaziabad": 138,
  "Gorakhpur": 125,
  "Bareilly": 118,
  "Aligarh": 98,
  "Moradabad": 92,
  "Saharanpur": 85,
  "Jhansi": 78,
  "Mathura": 72,
  "Ayodhya": 68,
  "Firozabad": 62,
  "Muzaffarnagar": 58,
  "Hardoi": 52,
  "Mirzapur": 48,
  "Bulandshahr": 45,
  "Rampur": 42,
  "Shahjahanpur": 38,
  "Farrukhabad": 35,
  "Unnao": 32,
  "Basti": 28,
  "Sitapur": 25,
  "Etawah": 22,
  "Sultanpur": 18,
  "Fatehpur": 15,
  "Banda": 12
};

const officerData = {
  "Lucknow": "IAS Rajshekhar",
  "Kanpur Nagar": "IAS Vijay Kiran Anand",
  "Varanasi": "IAS Deepak Agarwal",
  "Agra": "IAS Navneet Singh Chahal",
  "Prayagraj": "IAS Sanjay Kumar Khatri",
  // ...add more officers as needed
};

const RegionwiseTaskDensity: React.FC = () => {
  useEffect(() => {
    // Fix for leaflet icon issues in Next.js
    if (typeof window !== "undefined") {
      // Import Leaflet dynamically
      import('leaflet').then(L => {
        delete (L as any).Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: '/leaflet/marker-icon-2x.png',
          iconUrl: '/leaflet/marker-icon.png',
          shadowUrl: '/leaflet/marker-shadow.png',
        })
      })
    }
  }, [])

  const getColor = (density: number): string => {
    return density > 140
      ? "#800026"
      : density > 120
        ? "#BD0026"
        : density > 100
          ? "#E31A1C"
          : density > 80
            ? "#FC4E2A"
            : density > 60
              ? "#FD8D3C"
              : density > 40
                ? "#FEB24C"
                : density > 20
                  ? "#FED976"
                  : "#FFEDA0"
  }

  const style = (feature: any) => {
    const districtName = feature.properties.district
    const density = taskDensityData[districtName] || 0 // Default to 0 if no data

    return {
      fillColor: getColor(density),
      weight: 2,
      opacity: 1,
      color: "white",
      dashArray: "3",
      fillOpacity: 0.7,
    }
  }

  const getMarkerColor = (density: number): string => {
    if (density > 140) return 'red';
    if (density > 80) return 'orange';
    if (density > 40) return 'yellow';
    return 'green';
  };

  const createCustomIcon = (density: number) => {
    if (typeof window === 'undefined') return null;
    
    return new L.DivIcon({
      className: 'custom-icon',
      html: `
        <div style="
          background-color: ${getMarkerColor(density)};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 4px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${density > 80 ? 'white' : 'black'};
          font-size: 10px;
          font-weight: bold;
        ">
          ${density}
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  // Don't render map during SSR
  if (typeof window === 'undefined') {
    return <div>Loading map...</div>
  }

  // Wrap the map render in Suspense
  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-2">Region-wise Grievance Density in Uttar Pradesh</h2>
        <p className="text-gray-600 mb-4">Live visualization of complaint distribution across districts</p>
        
        <div className="h-[600px] relative rounded-lg overflow-hidden border">
          <React.Suspense fallback={<div>Loading map...</div>}>
            <MapContainer 
              center={[26.8467, 80.9462]} 
              zoom={7} 
              style={{ height: "100%", width: "100%" }}
              zoomControl={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <GeoJSON
                data={upGeoJson}
                style={style}
                onEachFeature={(feature, layer) => {
                  const districtName = feature.properties.district;
                  const density = taskDensityData[districtName] || 0;
                  const officer = officerData[districtName] || 'Officer not assigned';
                  
                  layer.on({
                    mouseover: (e) => {
                      const layer = e.target;
                      layer.setStyle({
                        fillOpacity: 0.9,
                        weight: 3,
                        dashArray: '',
                      });
                    },
                    mouseout: (e) => {
                      const layer = e.target;
                      layer.setStyle({
                        fillOpacity: 0.7,
                        weight: 2,
                        dashArray: '3',
                      });
                    },
                    click: (e) => {
                      const map = e.target._map;
                      map.fitBounds(e.target.getBounds());
                    }
                  });

                  layer.bindTooltip(
                    `<div class="text-sm font-semibold">
                      <p class="text-base">${districtName}</p>
                      <p>Grievances: ${density}</p>
                      <p>Officer: ${officer}</p>
                    </div>`,
                    { 
                      permanent: false, 
                      sticky: true,
                      className: 'custom-tooltip'
                    }
                  );
                }}
              />
              {Object.entries(taskDensityData).map(([district, density]) => {
                const feature = upGeoJson.features.find(
                  f => f.properties.district === district
                );
                if (!feature) return null;

                const center = (L as any).geoJSON(feature).getBounds().getCenter();
                
                return (
                  <Marker 
                    key={district}
                    position={[center.lat, center.lng]}
                    icon={createCustomIcon(density)}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold">{district}</p>
                        <p>Grievances: {density}</p>
                        <p>Officer: {officerData[district] || 'Not assigned'}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </React.Suspense>
        </div>
        
        {/* Enhanced Legend */}
        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Grievance Density Heat Map</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: "#FFEDA0" }} />
              <span className="text-sm">Low (0-20)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: "#FEB24C" }} />
              <span className="text-sm">Moderate (21-60)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: "#FC4E2A" }} />
              <span className="text-sm">High (61-120)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: "#800026" }} />
              <span className="text-sm">Critical (120+)</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>* Hover over districts to see detailed information</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionwiseTaskDensity;