'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import L from 'leaflet';
import { debounce } from 'lodash';
import { Search, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import clsx from 'clsx';

import { useGeolocation } from '../hooks/useGeolocation';
import { getRoute, calculateDirectDistance, calculateTime } from '../utils/routingService';
import AmenityControls from './AmenityControls';
import { Place } from '../types';
import DynamicMap from './DynamicMap';

// External APIs and configurations
const NOMINATIM_API = 'https://nominatim.openstreetmap.org';
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Predefined amenity types with query tags and colors for UI
const amenityTags: Record<string, string> = {
  'EV-Chargers': 'amenity=charging_station',
  'Hospitals': 'amenity=hospital',
  'Schools': 'amenity=school',
  'Restaurants': 'amenity=restaurant',
  'Supermarkets': 'shop=supermarket'
};

const amenityColors: Record<string, string> = {
  'EV-Chargers': '#2ecc71',
  'Hospitals': '#e74c3c',
  'Schools': '#3498db',
  'Restaurants': '#f39c12',
  'Supermarkets': '#9b59b6'
};

// Add rate limiting and API configuration
const API_CONFIG = {
  NOMINATIM_API: 'https://nominatim.openstreetmap.org',
  REQUEST_DELAY: 300, // Adding missing delay value
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'HousePlanner_App/1.0'
  },
  searchParams: {
    format: 'json',
    limit: '10',
    addressdetails: '1',
    'accept-language': 'en',
    countrycodes: 'ca', // Limit to Canada for better results
    featuretype: 'settlement,street,house,poi' // Focus on meaningful places
  }
};

// Helper function to format addresses
const formatAddress = (item: any) => {
  if (!item) return '';
  const addr = item.address || {};
  const parts = [
    addr.house_number && addr.road ? `${addr.house_number} ${addr.road}` : addr.road,
    addr.suburb || addr.neighbourhood,
    addr.city || addr.town || addr.village,
    addr.state || addr.province,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : item.display_name || '';
};

// Highlight matching text in search results
const highlightMatch = (text: string, searchTerm: string) => {
  if (!text || !searchTerm) return text;
  const safeTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safeTerm})`, 'gi');
  return text.split(regex).map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="bg-amber-200 text-black font-medium">{part}</span>
    ) : (
      part
    )
  );
};

// -------------------------
// Subcomponent: AddressInput
// Input box for entering a location with suggestion dropdown
// -------------------------
interface AddressInputProps {
  address: string;
  onChange: (value: string) => void;
  predictions: Place[];
  onSelect: (prediction: any) => void;
  onReset: () => void;
  onSearch: () => void;
  isLoading: boolean;
}

const AddressInput: React.FC<AddressInputProps> = ({ address, onChange, predictions, onSelect, onReset, onSearch, isLoading }) => (
  <div className="mb-4 relative" style={{ zIndex: 10000 }}>
    <div className="relative">
      <input
        type="text"
        value={address}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter location (city, address, or place)"
        className="w-full p-3 rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500 pr-24 bg-white text-gray-900 placeholder-gray-400"
      />
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
        <button className="p-2 rounded-full hover:bg-gray-100" onClick={onReset} title="Reset everything">
          <RotateCcw className="w-5 h-5 text-gray-500" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100" onClick={onSearch} disabled={isLoading}>
          <Search className={`w-5 h-5 ${isLoading ? 'text-gray-300' : 'text-gray-500'}`} />
        </button>
      </div>
    </div>

    {predictions?.length > 0 && (
      <div className="absolute z-[9999] w-full bg-white rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto border border-gray-200">
        {predictions.map((prediction: any, idx: number) => {
          const displayName = prediction.display_name || '';
          const [mainPart, ...secondaryParts] = displayName.split(',');
          return (
            <button
              key={`${prediction.place_id || idx}`}
              onClick={() => onSelect(prediction)}
              className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors relative"
            >
              <div className="font-medium text-gray-900">{highlightMatch(mainPart, address)}</div>
              {secondaryParts.length > 0 && <div className="text-sm text-gray-500 truncate">{highlightMatch(secondaryParts.join(','), address)}</div>}
            </button>
          );
        })}
      </div>
    )}
  </div>
);

// -------------------------
// Subcomponent: AmenitiesList
// Displays the list of fetched amenities and their walking times
// -------------------------
interface AmenitiesListProps {
  routes: any[];
}

const AmenitiesList: React.FC<AmenitiesListProps> = ({ routes }) => (
  <>
    {routes?.length > 0 && (
      <div className="mt-4 bg-white rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4 text-black-important">Nearest Amenities:</h2>
        {Object.entries(amenityColors).map(([amenityType, color]) => {
          const amenityRoutes = routes.filter((r) => r.type === amenityType).sort((a, b) => a.distance - b.distance);
          if (amenityRoutes.length === 0) return null;
          return (
            <div key={amenityType} className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-black-important" style={{ color }}>{amenityType}</h3>
              {amenityRoutes.map((route, idx) => (
                <div key={idx} className="ml-4 mb-2">
                  <p className="text-black-important" style={{ color }}>
                    {idx + 1}. {route.destination?.name} - {(route.distance / 1000).toFixed(2)}km&nbsp;
                    ({Math.round(calculateTime(route.distance / 1000, 'walking'))} mins walking){route.isEstimate && ' *'}
                  </p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    )}
  </>
);

// -------------------------
// Main Component: HousePlanner
// -------------------------
const HousePlanner: React.FC = () => {
  const { location: userLocation } = useGeolocation();
  const [searchAddress, setSearchAddress] = useState<string>('');
  const [predictions, setPredictions] = useState<Place[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [amenityMarkers, setAmenityMarkers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [amenitiesError, setAmenitiesError] = useState<string | null>(null);
  const [radius, setRadius] = useState<number>(1000);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<Record<string, boolean>>(
    Object.keys(amenityTags).reduce((acc, key) => ({ ...acc, [key]: false }), {})
  );
  const [numAmenities, setNumAmenities] = useState<number>(5);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const mapRef = useRef<L.Map | null>(null);

  const fetchAddress = async (searchText: string) => {
    if (!searchText || searchText.length < 2) {
      setPredictions([]);
      return;
    }
    try {
      const encoded = encodeURIComponent(searchText);
      const url = `${NOMINATIM_API}/search?format=json&q=${encoded}&limit=5&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'HousePlanner/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) {
        setPredictions([]);
        return;
      }
      setPredictions(data.map((item: any) => ({ ...item, display_name: item.display_name })));
    } catch (err) {
      setPredictions([]);
    }
  };

  const debouncedSearch = useMemo(() => debounce((v: string) => fetchAddress(v), 300), []);
  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);
  const handleInputChange = (value: string) => { setSearchAddress(value); debouncedSearch(value); };

  const handlePredictionSelect = useCallback((prediction: any) => {
    if (!prediction?.lat || !prediction?.lon) return;
    const lat = parseFloat(prediction.lat);
    const lon = parseFloat(prediction.lon);
    setSearchAddress(formatAddress(prediction));
    setSelectedLocation([lat, lon]);
    setMarkerPosition([lat, lon]);
    setPredictions([]);
  }, []);

  // -------------------------
  // Fetch nearby amenities using Overpass API
  // -------------------------
  const fetchNearbyAmenities = async (lat: number, lon: number, amenityType: string) => {
    const getQuery = (radius: number) => `
      [out:json][timeout:30];
      (
        node[${amenityTags[amenityType]}](around:${radius},${lat},${lon});
        way[${amenityTags[amenityType]}](around:${radius},${lat},${lon});
        relation[${amenityTags[amenityType]}](around:${radius},${lat},${lon});
      );
      out body center qt ${numAmenities * 2};
    `;

    const fetchData = async (query: string) => {
      const response = await fetch(OVERPASS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText.includes('DOCTYPE html') ? 'Rate limit exceeded' : errorText);
      }
      return response.json();
    };

    try {
      let data = await fetchData(getQuery(3000));

      if (!data.elements || data.elements.length < numAmenities) {
        data = await fetchData(getQuery(10000));
      }
      if (!data.elements || data.elements.length < numAmenities) {
        data = await fetchData(getQuery(50000));
      }

      if (!data.elements || !data.elements.length) return [];

      return data.elements
        .map((element: any) => {
          const elemLat = element.lat || element.center?.lat;
          const elemLon = element.lon || element.center?.lon;

          if (!elemLat || !elemLon || !element.tags) return null;

          let name = element.tags.name || element.tags.brand || element.tags.operator || `${amenityType} (No name)`;

          return {
            position: [elemLat, elemLon],
            name,
            tags: element.tags,
            distance: calculateDirectDistance(lat, lon, elemLat, elemLon),
            type: amenityType,
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, numAmenities);
    } catch (error) {
      console.error(`Error fetching ${amenityType} amenities:`, error);
      setAmenitiesError((error as Error).message);
      return [];
    }
  };

  // -------------------------
  // Search for amenities based on current location and user selection.
  // -------------------------
  const performAmenitySearch = useCallback(async () => {
    if (!selectedLocation) return;

    const [lat, lon] = selectedLocation;
    setLoading(true);
    setAmenityMarkers([]);
    setRoutes([]);
    setAmenitiesError(null);

    const selectedTypes = Object.keys(selectedAmenities).filter(type => selectedAmenities[type]);

    if (selectedTypes.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const amenityPromises = selectedTypes.map(type => fetchNearbyAmenities(lat, lon, type));
      const results = await Promise.all(amenityPromises);
      const allAmenities = results.flat();

      setAmenityMarkers(allAmenities.map((amenity, index) => ({
        ...amenity,
        id: `${Date.now()}-${index}`,
        color: amenityColors[amenity.type],
      })));

      const routePromises = allAmenities.map(amenity =>
        getRoute(selectedLocation, amenity.position)
          .then(route => ({ ...route, type: amenity.type, color: amenityColors[amenity.type], destination: amenity }))
          .catch(error => {
            console.error(`Failed to get route for ${amenity.name}:`, error);
            const directDistance = calculateDirectDistance(selectedLocation[0], selectedLocation[1], amenity.position[0], amenity.position[1]);
            return {
              coordinates: [[selectedLocation[1], selectedLocation[0]], [amenity.position[1], amenity.position[0]]],
              distance: directDistance,
              duration: calculateTime(directDistance / 1000, 'walking') * 60,
              isEstimate: true,
              type: amenity.type,
              color: amenityColors[amenity.type],
              destination: amenity,
            };
          })
      );

      const settledRoutes = await Promise.all(routePromises);
      setRoutes(settledRoutes);

    } catch (error) {
      console.error('Search error:', error);
      setAmenitiesError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedLocation, selectedAmenities, numAmenities]);

  // -------------------------
  // Handlers for input, prediction selection, and map interactions
  // -------------------------
  const handleMapClick = useCallback(async (e: { latlng: { lat: number; lng: number } }) => {
    const { lat, lng } = e.latlng;
    setMarkerPosition([lat, lng]);
    setSelectedLocation([lat, lng]);
    try {
      const resp = await fetch(
        `${NOMINATIM_API}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: API_CONFIG.headers }
      );
      if (!resp.ok) throw new Error('Reverse failed');
      const data = await resp.json();
      setSearchAddress(formatAddress(data) || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch {
      setSearchAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  }, []);

  const handleReset = () => {
    setSelectedLocation(null);
    setMarkerPosition(null);
    setAmenityMarkers([]);
    setRoutes([]);
    setSearchAddress('');
    setPredictions([]);
    setSelectedAmenities(Object.keys(amenityTags).reduce((acc, key) => ({ ...acc, [key]: false }), {}));
    setNumAmenities(5);
    setAmenitiesError(null);
  };

  const handleToggleAmenity = useCallback((type: string) => {
    setSelectedAmenities(prev => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const toggleMapFullscreen = useCallback(() => {
    setIsMapFullscreen(prev => !prev);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
  }, []);

  // -------------------------
  // Effects to load geolocation and update amenities when selection changes
  // -------------------------
  useEffect(() => {
    if (selectedLocation && Object.values(selectedAmenities).some(v => v)) {
      performAmenitySearch();
    }
  }, [selectedLocation, selectedAmenities, numAmenities, performAmenitySearch]); // Added numAmenities as dependency

  useEffect(() => {
    if (userLocation && !selectedLocation) {
      const [lat, lon] = userLocation;
      setSelectedLocation(userLocation);
      setMarkerPosition(userLocation);
      
      // Fetch address for initial location
      fetch(`${NOMINATIM_API}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, { headers: API_CONFIG.headers })
        .then(res => res.json())
        .then(data => setSearchAddress(formatAddress(data) || `${lat.toFixed(6)}, ${lon.toFixed(6)}`))
        .catch(() => setSearchAddress(`${lat.toFixed(6)}, ${lon.toFixed(6)}`));
    }
  }, [userLocation, selectedLocation]);

  // Invalidate map size on fullscreen toggle
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }
  }, [isMapFullscreen]);

  // Center the map on the selected location
  useEffect(() => {
    if (mapRef.current && selectedLocation) {
      mapRef.current.setView(selectedLocation, 15);
    }
  }, [selectedLocation]);

  return (
    <div className="flex h-screen bg-gray-100">
      <div className={clsx("p-4 overflow-y-auto bg-white shadow-lg transition-all duration-300", {
        "w-1/3": !isMapFullscreen,
        "w-0 p-0": isMapFullscreen,
      })}>
        <h1 className="text-3xl font-bold text-gray-800 mb-6">House Planner</h1>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search for an address
          </label>
          <AddressInput
            address={searchAddress}
            onChange={handleInputChange}
            predictions={predictions}
            onSelect={handlePredictionSelect}
            onReset={handleReset}
            onSearch={() => fetchAddress(searchAddress)}
            isLoading={loading}
          />
        </div>

        {selectedLocation && (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Radius: {(radius / 1000).toFixed(1)} km
              </label>
              <input
                type="range"
                min="500"
                max="5000"
                step="100"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <button
              onClick={performAmenitySearch}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out disabled:bg-blue-300"
            >
              {loading ? 'Searching...' : 'Find Nearby Amenities'}
            </button>
          </>
        )}

        {amenitiesError && (
          <p className="text-red-500 text-sm mt-2">{amenitiesError}</p>
        )}

        <AmenitiesList routes={routes} calculateTime={calculateTime} />
        
        <AmenityControls
          numAmenities={numAmenities}
          setNumAmenities={setNumAmenities}
          selectedAmenities={selectedAmenities}
          toggleAmenity={handleToggleAmenity}
          amenityColors={amenityColors}
        />
      </div>

      <div className={clsx("relative transition-all duration-300", {
        "w-2/3": !isMapFullscreen,
        "w-full": isMapFullscreen,
      })}>
        {isClient ? (
          <DynamicMap
            selectedLocation={selectedLocation}
            amenityMarkers={amenityMarkers}
            radius={radius}
            setMapRef={(map: any) => (mapRef.current = map)}
            onMapClick={handleMapClick}
            markerPosition={markerPosition}
            routes={routes}
            isLoading={loading}
            isFullscreen={isMapFullscreen}
          />
        ) : (
          <div>Loading Map...</div>
        )}
        <button
          onClick={toggleMapFullscreen}
          className="absolute top-4 right-4 z-[500] bg-white p-2 rounded-md shadow-md hover:bg-gray-100 transition-colors"
          title={isMapFullscreen ? "Exit fullscreen" : "View fullscreen map"}
        >
          {isMapFullscreen ? (
            <Minimize2 className="w-5 h-5 text-gray-700" />
          ) : (
            <Maximize2 className="w-5 h-5 text-gray-700" />
          )}
        </button>
      </div>
    </div>
  );
};

export default HousePlanner;