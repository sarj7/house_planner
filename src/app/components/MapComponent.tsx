'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

let L;
if (typeof window !== 'undefined') {
  L = require('leaflet');
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
};

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
}) => {
  const defaultCenter = [51.0447, -114.0719]; // Calgary center

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <MapEvents onMapClick={onMapClick} />
      {markerPosition && (
        <Marker position={markerPosition} />
      )}
      {amenityMarkers.map((amenity, index) => (
        <Marker
          key={`${amenity.type}-${index}`}
          position={amenity.position}
        />
      ))}
      {routes.map((route, index) => (
        <Polyline
          key={index}
          positions={route.path}
          color="blue"
          weight={3}
          opacity={0.6}
        />
      ))}
      {selectedLocation && (
        <MapController center={selectedLocation} zoom={13} />
      )}
    </MapContainer>
  );
};

export default MapComponent;

