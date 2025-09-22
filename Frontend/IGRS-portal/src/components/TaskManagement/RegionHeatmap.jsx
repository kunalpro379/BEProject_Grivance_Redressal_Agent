import React from 'react';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const RegionHeatmap = () => {
  const regionData = [
    { name: 'Lucknow', lat: 26.8467, lng: 80.9462, complaints: 245 },
    { name: 'Kanpur', lat: 26.4499, lng: 80.3319, complaints: 198 },
    { name: 'Varanasi', lat: 25.3176, lng: 82.9739, complaints: 167 },
    { name: 'Agra', lat: 27.1767, lng: 78.0081, complaints: 212 },
    { name: 'Meerut', lat: 28.9845, lng: 77.7064, complaints: 156 },
    { name: 'Prayagraj', lat: 25.4358, lng: 81.8463, complaints: 178 },
    { name: 'Ghaziabad', lat: 28.6692, lng: 77.4538, complaints: 189 },
    { name: 'Gorakhpur', lat: 26.7606, lng: 83.3732, complaints: 145 },
  ];

  const getCircleColor = (complaints) => {
    if (complaints > 200) return '#ef4444';
    if (complaints > 150) return '#f97316';
    return '#eab308';
  };

  const getCircleRadius = (complaints) => {
    return (complaints / 10) * 100;
  };

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden">
      <MapContainer
        center={[26.8467, 80.9462]}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {regionData.map((region) => (
          <Circle
            key={region.name}
            center={[region.lat, region.lng]}
            radius={getCircleRadius(region.complaints)}
            pathOptions={{
              color: getCircleColor(region.complaints),
              fillColor: getCircleColor(region.complaints),
              fillOpacity: 0.6,
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{region.name}</h3>
                <p>Total Complaints: {region.complaints}</p>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
};

export default RegionHeatmap;
