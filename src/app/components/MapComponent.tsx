'use client';

import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayersControl, useMap, useMapEvents, LayerGroup, Tooltip } from 'react-leaflet';
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

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

export interface MapComponentProps {
  selectedLocation: Location | null;
  markerPosition: Location | null;
  amenityMarkers: Amenity[];
  routes: any[];
  onMapClick: (e: any) => void;
  isLoading: boolean;
  isFullscreen?: boolean;
  setMapRef?: (map: any) => void;
  radius?: number;
}

// Component for changing map view
const ChangeView = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Component for handling map clicks
const MapClickHandler = ({ onMapClick }: { onMapClick: (e: any) => void }) => {
  useMapEvents({
    click: (e) => onMapClick(e),
  });
  return null;
};

// Component for fullscreen control
const FullscreenControlComponent = ({ isFullscreen }: { isFullscreen: boolean }) => {
  const map = useMap();

  useEffect(() => {
    // Check if the fullscreen control exists on L.control
    if ((L.control as any).fullscreen) {
      const control = (L.control as any).fullscreen({
        position: 'topright',
        forceSeparateButton: true,
      }).addTo(map);

      return () => {
        control.remove();
      };
    }
  }, [map]);

  useEffect(() => {
    if ((map as any).isFullscreen && (map as any).isFullscreen() !== isFullscreen) {
      if ((map as any).toggleFullscreen) (map as any).toggleFullscreen();
    }
  }, [isFullscreen, map]);

  return null;
};

// Overpass layer for detailed POIs
const OverpassLayer = ({ map, bounds, zoom, selectedLocation }: { map: any; bounds: any; zoom: number; selectedLocation: Location | null }) => {
  const [pois, setPois] = useState<any[]>([]);

  useEffect(() => {
    if (!map || !bounds || zoom < 15 || !selectedLocation) return;

    const fetchPOIs = async () => {
      const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;

      const query = `[out:json][timeout:25][bbox:${bbox}];
        (
          node["shop"](bbox);
          way["shop"](bbox);
          relation["shop"](bbox);
          node["amenity"](bbox);
          way["amenity"](bbox);
          relation["amenity"](bbox);
          node["leisure"](bbox);
          way["leisure"](bbox);
          relation["leisure"](bbox);
          node["tourism"](bbox);
          way["tourism"](bbox);
          relation["tourism"](bbox);
        );
        out body;
        >;
        out skel qt;`;

      try {
        const response = await fetch(OVERPASS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`
        });

        if (!response.ok) throw new Error('Failed to fetch POIs');

        const data = await response.json();
        setPois(data.elements || []);
      } catch (error) {
        console.error('Error fetching POIs:', error);
      }
    };

    fetchPOIs();
  }, [map, bounds, zoom, selectedLocation]);

  useEffect(() => {
    if (!map || pois.length === 0) return;

    // Create and add markers for POIs
    const poiMarkers = pois.map(poi => {
      if (!poi.lat || !poi.lon || !poi.tags) return null;

      const name = poi.tags.name || poi.tags.shop || poi.tags.amenity || poi.tags.leisure || poi.tags.tourism || 'Unnamed';

      // Create styled text marker
      return L.marker([poi.lat, poi.lon], {
        icon: L.divIcon({
          className: 'poi-label',
          html: `<div class="poi-label-inner" style="font-size: ${zoom > 16 ? '12px' : '10px'};">${name}</div>`,
          iconSize: [100, 20],
          iconAnchor: [50, 10]
        })
      }).bindTooltip(name, {
        permanent: zoom > 16,
        direction: 'center',
        className: 'poi-tooltip'
      });
    }).filter(marker => marker !== null);

    // Create a layer group for the POI markers
    const poiGroup = L.layerGroup(poiMarkers);
    map.addLayer(poiGroup);

    return () => {
      if (map) map.removeLayer(poiGroup);
    };
  }, [map, pois, zoom]);

  return null;
};

// Component to track map state changes
const MapStateTracker = ({ onBoundsChange, onZoomChange }: { onBoundsChange: (bounds: any) => void; onZoomChange: (zoom: number) => void }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const updateState = () => {
      onBoundsChange(map.getBounds());
      onZoomChange(map.getZoom());
    };

    map.on('moveend', updateState);
    map.on('zoomend', updateState);

    // Initialize
    updateState();

    return () => {
      map.off('moveend', updateState);
      map.off('zoomend', updateState);
    };
  }, [map, onBoundsChange, onZoomChange]);

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
}) => {
  const [mapContainerId, setMapContainerId] = useState('');

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

  // Custom marker icon for amenities
  const createCustomIcon = (color: string, number: number) => {
    return L.divIcon({
      className: 'custom-icon',
      html: `<div style="
        background-color: ${color}; 
        color: white; 
        width: 24px; 
        height: 24px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        border-radius: 50%; 
        font-weight: bold;
        box-shadow: 0 1px 3px rgba(0,0,0,0.4);">${number}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  // Location marker icon
  const HomeIcon = L.divIcon({
    className: 'home-icon',
    html: `<div style="
      background-color: #ff6b6b; 
      color: white; 
      width: 28px; 
      height: 28px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      border-radius: 50%; 
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

  const [map, setMap] = useState<L.Map | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [zoomLevel, setZoomLevel] = useState(14);

  useEffect(() => {
    if (map && selectedLocation && amenityMarkers.length > 0) {
      const bounds = L.latLngBounds([selectedLocation]);
      amenityMarkers.forEach(marker => bounds.extend(marker.position));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, selectedLocation, amenityMarkers]);

  if (!mapContainerId) return null;

  return (
    <MapContainer
      id={mapContainerId}
      center={selectedLocation || [43.6532, -79.3832]} // Default to Toronto if no location
      zoom={14}
      style={{ 
        height: '100%', 
        width: '100%'
      }}
      className={isFullscreen ? 'fullscreen-map' : ''}
      ref={setMap}
    >
      <LayersControl position="topright">
        {/* Standard OpenStreetMap */}
        <LayersControl.BaseLayer checked name="Standard">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>

        {/* More detailed Carto Positron */}
        <LayersControl.BaseLayer name="Detailed">
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>

        {/* Satellite imagery */}
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {/* Add the map state tracker */}
      <MapStateTracker 
        onBoundsChange={setMapBounds}
        onZoomChange={setZoomLevel}
      />

      {/* Add the overpass layer for detailed POIs when zoomed in */}
      {map && mapBounds && zoomLevel >= 15 && (
        <OverpassLayer 
          map={map} 
          bounds={mapBounds} 
          zoom={zoomLevel}
          selectedLocation={selectedLocation}
        />
      )}

      {/* Fullscreen and click handlers */}
      <FullscreenControlComponent isFullscreen={isFullscreen} />
      <MapClickHandler onMapClick={onMapClick} />

      {/* Change view when selected location changes */}
      {selectedLocation && !amenityMarkers.length && <ChangeView center={selectedLocation} zoom={14} />}

      {/* Main selected marker */}
      {markerPosition && (
        <Marker position={markerPosition} icon={HomeIcon}>
          <Popup>
            <div className="text-center">
              <div className="font-bold">Selected Location</div>
              <div className="text-xs text-gray-500">
                {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Enhanced amenity markers with improved labels */}
      {amenityMarkers.map((marker, idx) => (
        <Marker 
          key={marker.id || idx} 
          position={marker.position}
          icon={createCustomIcon(marker.color || '#666', marker.number || 0)}
        >
          <Popup className="custom-popup">
            <div className="p-2">
              <div className="font-bold text-lg" style={{ color: marker.color }}>{marker.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                <div>Distance: {((marker.distance ?? 0) / 1000).toFixed(2)}km</div>
                {marker.tags && (
                  <div className="mt-2">
                    {marker.tags.opening_hours && (
                      <div><span className="font-semibold">Hours:</span> {marker.tags.opening_hours}</div>
                    )}
                    {marker.tags.phone && (
                      <div><span className="font-semibold">Phone:</span> {marker.tags.phone}</div>
                    )}
                    {marker.tags.website && (
                      <div><span className="font-semibold">Website:</span> <a href={marker.tags.website} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{marker.tags.website}</a></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Popup>
          <Tooltip 
            permanent={zoomLevel > 14} 
            direction="center" 
            offset={[0, -30]} 
            className={`amenity-label ${(marker.type || 'unknown').toLowerCase().replace(' ', '-')}`}
          >
            {marker.name}
          </Tooltip>
        </Marker>
      ))}

      {/* Routes */}
      {routes.map((route, idx) => {
        if (!route.coordinates) return null;
        return (
          <Polyline
            key={idx}
            positions={route.coordinates.map((coord: [number, number]) => [coord[1], coord[0]])}
            pathOptions={{ color: route.color || 'blue', weight: 4, opacity: 0.7 }}
          >
            <Popup>
              <div>
                <div className="font-bold">Distance: {(route.distance / 1000).toFixed(2)}km</div>
              </div>
            </Popup>
          </Polyline>
        );
      })}

      {/* Loading overlay */}
      {isLoading && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="animate-pulse flex space-x-2">
              <div className="rounded-full bg-amber-400 h-3 w-3"></div>
              <div className="rounded-full bg-amber-400 h-3 w-3 animate-pulse delay-100"></div>
              <div className="rounded-full bg-amber-400 h-3 w-3 animate-pulse delay-200"></div>
            </div>
          </div>
        </div>
      )}
    </MapContainer>
  );
};

export default MapComponent;