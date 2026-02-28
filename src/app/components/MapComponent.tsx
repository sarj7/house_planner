'use client';

import React, { useState, useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  LayersControl,
  useMap,
  useMapEvents,
  Tooltip,
  Circle,
} from 'react-leaflet';
import { Amenity, Location } from '../types';

// Fix for default icon path in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
    iconUrl: require('leaflet/dist/images/marker-icon.png').default,
    shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
  });
}

export interface MapComponentProps {
  selectedLocation: Location | null;
  markerPosition: Location | null;
  amenityMarkers: Amenity[];
  routes: any[];
  onMapClick: (e: any) => void;
  isLoading: boolean;
  isFullscreen?: boolean;
  setMapRef?: (map: L.Map) => void;
  radius?: number;
}

const formatDistance = (distanceMeters?: number) => {
  if (!Number.isFinite(distanceMeters)) return 'N/A';
  const km = (distanceMeters as number) / 1000;
  if (km < 10) return `${km.toFixed(2)} km`;
  return `${km.toFixed(1)} km`;
};

const formatDuration = (minutes?: number) => {
  if (!Number.isFinite(minutes)) return 'N/A';
  const total = Math.max(0, Math.round(minutes as number));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
};

const estimateMinutes = (distanceMeters?: number, speedKmh = 5) => {
  if (!Number.isFinite(distanceMeters)) return 0;
  return ((distanceMeters as number) / 1000 / speedKmh) * 60;
};

const formatWebsite = (website?: string) => {
  if (!website || typeof website !== 'string') return '';
  if (website.startsWith('http://') || website.startsWith('https://')) return website;
  return `https://${website}`;
};

const ChangeView = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const MapClickHandler = ({ onMapClick }: { onMapClick: (e: any) => void }) => {
  useMapEvents({
    click: (e) => onMapClick(e),
  });
  return null;
};

const MapComponent: React.FC<MapComponentProps> = ({
  selectedLocation,
  markerPosition,
  amenityMarkers,
  routes,
  onMapClick,
  isLoading,
  isFullscreen = false,
  setMapRef,
  radius,
}) => {
  const [mapContainerId, setMapContainerId] = useState('');
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    setMapContainerId(`map-${Math.random().toString(36).slice(2)}`);
  }, []);

  useEffect(() => {
    if (mapContainerId) {
      const container = L.DomUtil.get(mapContainerId);
      if (container && (container as any)._leaflet_id) {
        (container as any)._leaflet_id = null;
      }
    }
  }, [mapContainerId]);

  useEffect(() => {
    if (map && selectedLocation && amenityMarkers.length > 0) {
      const bounds = L.latLngBounds([selectedLocation]);
      amenityMarkers.forEach((marker) => bounds.extend(marker.position));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, selectedLocation, amenityMarkers]);

  const routeByAmenityId = useMemo(() => {
    const mapById = new Map<string | number, any>();
    routes?.forEach((route) => {
      const id = route.destination?.id;
      if (id !== undefined) mapById.set(id, route);
    });
    return mapById;
  }, [routes]);

  const createCustomIcon = (color: string, number: number) =>
    L.divIcon({
      className: 'custom-icon',
      html: `<div style="
        background-color: ${color}; 
        color: white; 
        width: 26px; 
        height: 26px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        border-radius: 50%; 
        font-weight: 600;
        font-size: 12px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${number}</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

  const homeIcon = L.divIcon({
    className: 'home-icon',
    html: `<div style="
      background-color: #e26a4f; 
      color: white; 
      width: 30px; 
      height: 30px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      border-radius: 50%; 
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  if (!mapContainerId) return null;

  return (
    <MapContainer
      id={mapContainerId}
      center={selectedLocation || [43.6532, -79.3832]}
      zoom={14}
      style={{
        height: '100%',
        width: '100%',
      }}
      className={isFullscreen ? 'fullscreen-map' : ''}
      ref={(mapInstance) => {
        if (!mapInstance) return;
        setMap(mapInstance);
        setMapRef?.(mapInstance);
      }}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Standard">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Detailed">
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <MapClickHandler onMapClick={onMapClick} />
      {selectedLocation && !amenityMarkers.length && <ChangeView center={selectedLocation} zoom={14} />}

      {selectedLocation && radius && radius > 0 && (
        <Circle
          center={selectedLocation}
          radius={radius}
          pathOptions={{
            color: '#d1a24a',
            fillColor: '#f1d3a0',
            fillOpacity: 0.2,
            weight: 1,
            dashArray: '4 6',
          }}
        />
      )}

      {markerPosition && (
        <Marker position={markerPosition} icon={homeIcon}>
          <Popup>
            <div className="text-center">
              <div className="text-sm font-semibold">Selected Location</div>
              <div className="text-xs text-slate-500">
                {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      {amenityMarkers.map((marker, idx) => {
        const routeInfo = marker.id !== undefined ? routeByAmenityId.get(marker.id) : undefined;
        const distance = routeInfo?.distance ?? marker.distance;
        const walkingMinutes = routeInfo?.duration
          ? routeInfo.duration / 60
          : estimateMinutes(distance, 5);
        const drivingMinutes = estimateMinutes(distance, 40);
        const address =
          marker.tags?.['addr:full'] ||
          [marker.tags?.['addr:housenumber'], marker.tags?.['addr:street']]
            .filter(Boolean)
            .join(' ');

        return (
          <Marker
            key={marker.id || idx}
            position={marker.position}
            icon={createCustomIcon(marker.color || '#6b7280', marker.number || idx + 1)}
          >
            <Tooltip
              direction="top"
              offset={[0, -16]}
              opacity={0.95}
              sticky
              className="amenity-tooltip"
            >
              <div className="text-xs font-semibold">
                {marker.number || idx + 1}. {marker.name}
              </div>
              <div className="text-[10px] text-slate-600">
                {formatDistance(distance)} | {formatDuration(walkingMinutes)} walk
              </div>
            </Tooltip>
            <Popup className="custom-popup">
              <div className="p-3">
                <div className="text-base font-semibold" style={{ color: marker.color }}>
                  {marker.name}
                </div>
                {address && <div className="mt-1 text-xs text-slate-500">{address}</div>}
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div>Distance: {formatDistance(distance)}</div>
                  <div>Walk: {formatDuration(walkingMinutes)}</div>
                  <div>Drive: {formatDuration(drivingMinutes)}</div>
                  {routeInfo?.isEstimate && (
                    <div className="text-amber-600">Estimated route</div>
                  )}
                </div>
                {marker.tags && (
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    {marker.tags.opening_hours && (
                      <div>
                        <span className="font-semibold">Hours:</span> {marker.tags.opening_hours}
                      </div>
                    )}
                    {marker.tags.phone && (
                      <div>
                        <span className="font-semibold">Phone:</span> {marker.tags.phone}
                      </div>
                    )}
                    {marker.tags.website && (
                      <div>
                        <span className="font-semibold">Website:</span>{' '}
                        <a
                          href={formatWebsite(marker.tags.website)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-700 underline"
                        >
                          {marker.tags.website}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {routes.map((route, idx) => {
        if (!route.coordinates) return null;
        const drivingMinutes = estimateMinutes(route.distance, 40);
        return (
          <Polyline
            key={idx}
            positions={route.coordinates.map((coord: [number, number]) => [coord[1], coord[0]])}
            pathOptions={{ color: route.color || '#4f46e5', weight: 4, opacity: 0.7 }}
          >
            <Popup>
              <div className="text-sm text-slate-700">
                <div className="font-semibold">Distance: {formatDistance(route.distance)}</div>
                <div>Walk: {formatDuration(route.duration / 60)}</div>
                <div>Drive: {formatDuration(drivingMinutes)}</div>
              </div>
            </Popup>
          </Polyline>
        );
      })}

      {isLoading && (
        <div className="map-loading-overlay">
          <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700 shadow-lg">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500"></span>
            Fetching routes
          </div>
        </div>
      )}
    </MapContainer>
  );
};

export default MapComponent;
