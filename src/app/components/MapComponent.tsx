'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Polyline, Popup } from 'react-leaflet';
import LoadingCorner from './LoadingCorner';
import { calculateTime } from '../utils/routingService';
import 'leaflet/dist/leaflet.css';

// Import Leaflet on the client side only to avoid SSR issues.
let L;
if (typeof window !== 'undefined') {
  L = require('leaflet');
  // Set default image path for marker icons to avoid errors.
  L.Icon.Default.imagePath = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/';
}

// Component to control map view settings.
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    // Center the map when the 'center' prop changes.
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
};

// Listen for map click events to capture new marker positions.
const MapEvents = ({ onMapClick }) => {
  useMapEvents({
    click: onMapClick,
  });
  return null;
};

const MapComponent = ({
  selectedLocation,
  markerPosition,
  amenityMarkers,
  routes,
  onMapClick,
  isLoading,
}) => {
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const defaultCenter = [51.0447, -114.0719]; // Default center (e.g., Calgary)

  // Create custom icons with a colored dot for amenity markers.
  const getColoredIcon = (color) => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  };

  const formatTime = (minutes) => {
    if (minutes < 1) return 'Less than 1 min';
    if (minutes < 60) return `${Math.round(minutes)} mins`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Formats the address from marker tags.
  const formatAddress = (tags) => {
    if (!tags) return '';
    const parts = [];
    if (tags['addr:street']) {
      parts.push(tags['addr:housenumber']
        ? `${tags['addr:housenumber']} ${tags['addr:street']}`
        : tags['addr:street']
      );
    }
    if (tags['addr:city']) parts.push(tags['addr:city']);
    return parts.length > 0 ? parts.join(', ') : tags.address || '';
  };

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        {/* OpenStreetMap tile layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapEvents onMapClick={onMapClick} />
        {/* User-selected location marker */}
        {markerPosition && (
          <Marker 
            position={markerPosition}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `<div style="background-color: #000; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white;"></div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7]
            })}
          />
        )}
        {/* Render amenity markers */}
        {amenityMarkers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            eventHandlers={{
              click: (e) => {
                setActiveMarkerId(marker.id);
                e.target.openPopup();
              },
              mouseover: (e) => {
                if (activeMarkerId !== marker.id) {
                  e.target.openPopup();
                }
              },
              mouseout: (e) => {
                if (activeMarkerId !== marker.id) {
                  e.target.closePopup();
                }
              }
            }}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `
                <div style="
                  background-color: ${marker.color};
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: bold;
                  font-size: 14px;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">
                  ${marker.number}
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          >
            <Popup>
              {/* Popup shows additional information about the amenity */}
              <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                <strong>{marker.number}. {marker.name}</strong>
                <br />
                <span style={{ color: '#666' }}>
                  {formatAddress(marker.tags) || 'Address unavailable'}
                  <br />
                  {/* Add null check for distance */}
                  Distance: {(marker.distance || 0).toFixed(2)} km
                  <br />
                  Walking: {formatTime(calculateTime(marker.distance || 0, 'walking'))}
                  <br />
                  Driving: {formatTime(
                    calculateTime(marker.distance || 0, 'driving')
                  )}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
        {/* Simplified route display with solid lines */}
        {routes.map((route, index) => (
          <Polyline
            key={index}
            positions={route.path}
            pathOptions={{
              color: route.color,
              weight: 3,
              opacity: 0.8
            }}
          />
        ))}
        {/* Center map on the selected location */}
        {selectedLocation && (
          <MapController center={selectedLocation} zoom={13} />
        )}
      </MapContainer>
      {isLoading && <LoadingCorner />}
    </div>
  );
};

export default MapComponent;

