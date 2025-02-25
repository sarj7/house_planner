'use client';

import React, { useState, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { debounce } from 'lodash';
import dynamic from 'next/dynamic';
import { useGeolocation } from '../hooks/useGeolocation';
import { getRoute, calculateDirectDistance, calculateTime } from '../utils/routingService';

// Dynamic import for MapComponent so it loads only on the client
const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false });

// External APIs and configurations
const NOMINATIM_API = 'https://nominatim.openstreetmap.org';
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Predefined amenity types with query tags and colors for UI
const amenityTags = {
  'EV-Chargers': 'amenity=charging_station',
  'Hospitals': 'amenity=hospital',
  'Schools': 'amenity=school',
  'Restaurants': 'amenity=restaurant',
  'Supermarkets': 'shop=supermarket'
};

const amenityColors = {
  'EV-Chargers': '#2ecc71',
  'Hospitals': '#e74c3c',
  'Schools': '#3498db',
  'Restaurants': '#f39c12',
  'Supermarkets': '#9b59b6'
};

// A helper to compute a color gradient (for markers) based on distance
const getColorGradient = (baseColor: string, distance: number, maxDistance: number) => {
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const opacity = 0.3 + (0.7 * (distance / maxDistance));
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Add input sanitization helper
const sanitizeInput = (input: string) => {
  return input
    .replace(/[^\w\s,.-]/g, '') // Only allow alphanumeric, spaces, commas, dots, and hyphens
    .trim();
};

// Add rate limiting and API configuration
const API_CONFIG = {
  NOMINATIM_API: 'https://nominatim.openstreetmap.org',
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

// Add delay helper function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Improved fetchPredictions function
const fetchPredictions = async (input: string) => {
  if (!input?.trim() || input.length < 2) return [];

  try {
    // Build search parameters
    const params = new URLSearchParams({
      ...API_CONFIG.searchParams,
      q: input
    });

    const response = await fetch(`${NOMINATIM_API}/search?${params}`, {
      method: 'GET',
      headers: API_CONFIG.headers
    });

    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    
    // Process and format the results
    return Array.isArray(data) ? data.map(item => ({
      ...item,
      display_name: formatAddress(item),
      full_address: item.display_name
    })) : [];
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
};

// Helper function to format addresses in a cleaner way
const formatAddress = (item) => {
  if (!item) return '';
  const addr = item.address || {};
  const parts = [];

  // Build address from most specific to least specific
  if (addr.house_number && addr.road) {
    parts.push(`${addr.house_number} ${addr.road}`);
  } else if (addr.road) {
    parts.push(addr.road);
  }

  if (addr.suburb || addr.neighbourhood) {
    parts.push(addr.suburb || addr.neighbourhood);
  }

  if (addr.city || addr.town || addr.village) {
    parts.push(addr.city || addr.town || addr.village);
  }

  if (addr.state || addr.province) {
    parts.push(addr.state || addr.province);
  }

  return parts.length > 0 ? parts.join(', ') : item.display_name || '';
};

// Update the debounced fetch predictions function
const debouncedFetchPredictions = debounce(async (input) => {
  if (!input || input.length < 2) {
    setPredictions([]);
    return;
  }

  const sanitizedInput = sanitizeInput(input);
  const processedInput = preprocessSearchTerm(sanitizedInput);
  
  try {
    await delay(API_CONFIG.REQUEST_DELAY); // Rate limiting

    const response = await fetch(
      `${API_CONFIG.NOMINATIM_API}/search?` + 
      `format=json&q=${encodeURIComponent(processedInput)}&limit=15&addressdetails=1`, {
        headers: API_CONFIG.headers,
        method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    if (!Array.isArray(data)) {
      console.error('Invalid response format');
      setPredictions([]);
      return;
    }

    // Process results
    const results = data.map(item => ({
      ...item,
      display_name: item.display_name || '',
      highlights: [processedInput]
    })).slice(0, 5);

    setPredictions(results);
  } catch (error) {
    console.error('Search error:', error);
    setPredictions([]);
  }
}, 500); // Increased debounce time

// Update highlight function to be more robust
const highlightMatch = (text: string, searchTerm: string) => {
  if (!text || !searchTerm) return text;
  try {
    const safeTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeTerm})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? 
        <span key={i} className="bg-amber-200 text-black font-medium">{part}</span> : 
        part
    );
  } catch (e) {
    return text;
  }
};

// -------------------------
// Subcomponent: AddressInput
// Input box for entering a location with suggestion dropdown
// -------------------------
const AddressInput = ({ address, onChange, predictions, onSelect, onReset, isLoading }) => (
  <div className="mb-4 relative" style={{ zIndex: 10000 }}>
    <div className="relative">
      <input
        type="text"
        value={address}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter location (city, address, or place)"
        className="w-full p-3 rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500 pr-24 
                 bg-white text-gray-900 placeholder-gray-400"
      />
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
        <button className="p-2 rounded-full hover:bg-gray-100" onClick={onReset} title="Reset everything">
          <RotateCcw className="w-5 h-5 text-gray-500" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100" onClick={onSelect} disabled={isLoading}>
          <Search className={`w-5 h-5 ${isLoading ? 'text-gray-300' : 'text-gray-500'}`} />
        </button>
      </div>
    </div>
    {predictions.length > 0 && (
      <div className="absolute z-[9999] w-full bg-white rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto border border-gray-200">
        {predictions.map((prediction, idx) => {
          const displayName = prediction.display_name || '';
          const [mainPart, ...secondaryParts] = displayName.split(',');
          
          return (
            <button
              key={`${prediction.place_id || idx}`}
              onClick={() => onSelect(prediction)}
              className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors relative"
            >
              <div className="font-medium text-gray-900">
                {highlightMatch(mainPart, address)}
              </div>
              {secondaryParts.length > 0 && (
                <div className="text-sm text-gray-500 truncate">
                  {highlightMatch(secondaryParts.join(','), address)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    )}
  </div>
);

// -------------------------
// Subcomponent: AmenityControls
// UI to choose number of amenities and toggle specific types
// -------------------------
const AmenityControls = ({ numAmenities, setNumAmenities, selectedAmenities, toggleAmenity, amenityColors }) => (
  <div className="mb-4">
    <div className="bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-md border border-white/20">
      <div className="flex flex-col gap-3">
        {/* Compact number input section */}
        <div className="flex items-center justify-center gap-2 bg-gray-50/80 rounded-lg p-2">
          <span className="text-sm font-medium text-gray-700">Show</span>
          <input
            type="number"
            min="1"
            max="20"
            value={numAmenities}
            onChange={(e) => setNumAmenities(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-14 px-2 py-1 rounded-md border border-gray-200 text-center text-gray-900 text-sm 
                     focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
          />
          <span className="text-sm font-medium text-gray-700">nearest</span>
        </div>

        {/* Compact grid of amenity buttons */}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(amenityColors).map(([type, color]) => (
            <button
              key={type}
              onClick={() => toggleAmenity(type)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
                ${selectedAmenities[type] 
                  ? 'shadow-sm' 
                  : 'hover:bg-gray-50'}
              `}
              style={{ 
                backgroundColor: selectedAmenities[type] ? color : 'white',
                border: `1px solid ${color}`,
              }}
            >
              {/* Checkbox */}
              <div className={`
                w-4 h-4 rounded-md border flex items-center justify-center
                transition-colors duration-200
              `}
                style={{ 
                  borderColor: selectedAmenities[type] ? 'white' : color,
                  backgroundColor: selectedAmenities[type] ? 'white' : 'transparent'
                }}>
                {selectedAmenities[type] && (
                  <div className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: color }} />
                )}
              </div>

              {/* Amenity name */}
              <span className={`
                text-sm font-medium truncate
                ${selectedAmenities[type] ? 'text-white' : 'text-gray-700'}
              `}>
                {type}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// -------------------------
// Subcomponent: AmenitiesList
// Displays the list of fetched amenities and their walking times
// -------------------------
const AmenitiesList = ({ routes, calculateTime }) => (
  <>
    {routes.length > 0 && (
      <div className="mt-4 bg-white rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4 !text-black">Nearest Amenities:</h2>
        {Object.entries(amenityColors).map(([amenityType, color]) => {
          // Filter and sort routes corresponding to each amenity type
          const amenityRoutes = routes
            .filter(route => route.type === amenityType)
            .sort((a, b) => (a.distance / 1000) - (b.distance / 1000));

          if (amenityRoutes.length === 0) return null;

          return (
            <div key={amenityType} className="mb-4">
              <h3 className="text-lg font-semibold mb-2 !text-black" style={{ color }}>
                {amenityType}
              </h3>
              {amenityRoutes.map((route, idx) => (
                <div key={idx} className="ml-4 mb-2">
                  <p className="!text-black" style={{ color }}>
                    {idx + 1}. {route.destination.name} - {(route.distance / 1000).toFixed(2)}km&nbsp;
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
// Manages overall state and integrates subcomponents
// -------------------------
const HousePlanner = () => {
  // State for geolocation, addresses, predictions, and map markers
  const { location: userLocation, error: locationError, isLoading: locationLoading } = useGeolocation();
  const [address, setAddress] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [amenityMarkers, setAmenityMarkers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState({
    'EV-Chargers': false,
    'Hospitals': false,
    'Schools': false,
    'Restaurants': false,
    'Supermarkets': false
  });
  const [numAmenities, setNumAmenities] = useState(5);

  // Add retry configuration
  const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000
  };

  // Add exponential backoff helper
  const wait = (attempt: number) => {
    const delay = Math.min(
      RETRY_CONFIG.maxDelay,
      RETRY_CONFIG.baseDelay * Math.pow(2, attempt)
    );
    return new Promise(resolve => setTimeout(resolve, delay));
  };

  // -------------------------
  // Simplified search function
  // -------------------------
  const searchAddress = async (searchText: string) => {
    if (!searchText || searchText.length < 2) {
      setPredictions([]);
      return;
    }

    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await wait(attempt);
        }

        const encodedAddress = encodeURIComponent(searchText);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=5&addressdetails=1`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'HousePlanner/1.0'
          }
        });

        if (response.status === 429 || response.status === 503) {
          console.warn(`Rate limited (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`);
          continue; // Try again after waiting
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!Array.isArray(data)) {
          console.error('Invalid response format:', data);
          setPredictions([]);
          return;
        }

        const formattedResults = data.map(item => ({
          ...item,
          display_name: item.display_name
        }));

        setPredictions(formattedResults);
        return; // Success, exit the retry loop

      } catch (error) {
        console.error(`Search attempt ${attempt + 1} failed:`, error);
        if (attempt === RETRY_CONFIG.maxRetries - 1) {
          setPredictions([]); // Clear predictions on final failure
        }
      }
    }
  };

  // Create a debounced search function
  const debouncedSearch = React.useMemo(
    () => debounce((searchValue: string) => {
      searchAddress(searchValue);
    }, 300),
    []
  );

  // Update the input change handler
  const handleInputChange = (value: string) => {
    setAddress(value);
    debouncedSearch(value);
  };

  // Add cleanup for debounced function
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Single handle prediction select function
  const handlePredictionSelect = (prediction: any) => {
    if (!prediction?.lat || !prediction?.lon) return;
    
    setAddress(formatAddress(prediction));
    setSelectedLocation([parseFloat(prediction.lat), parseFloat(prediction.lon)]);
    setMarkerPosition([parseFloat(prediction.lat), parseFloat(prediction.lon)]);
    setPredictions([]);
  };

  // -------------------------
  // Fetch nearby amenities using Overpass API
  // -------------------------
  const fetchNearbyAmenities = async (lat: number, lon: number, amenityType: string) => {
    // Increase radius to find more amenities initially
    let radius = 1.0; // 1 degree ~ 111km

    const query = `
      [out:json][timeout:25];
      (
        node[${amenityTags[amenityType]}](${lat - radius},${lon - radius},${lat + radius},${lon + radius});
        way[${amenityTags[amenityType]}](${lat - radius},${lon - radius},${lat + radius},${lon + radius});
        relation[${amenityTags[amenityType]}](${lat - radius},${lon - radius},${lat + radius},${lon + radius});
      );
      out body center qt 100;  // Request more results to ensure we get enough valid ones
    `;

    try {
      const response = await fetch(OVERPASS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) throw new Error('Overpass API request failed');
      
      const data = await response.json();
      if (!data.elements || !data.elements.length) return [];

      // Process and sort all elements by actual distance
      const amenities = data.elements
        .filter(element => {
          const elemLat = element.lat || element.center?.lat;
          const elemLon = element.lon || element.center?.lon;
          return elemLat && elemLon;
        })
        .map(element => {
          const elemLat = element.lat || element.center.lat;
          const elemLon = element.lon || element.center.lon;
          const distance = calculateDirectDistance(lat, lon, elemLat, elemLon);
          
          return {
            position: [elemLat, elemLon],
            name: element.tags.name || `${amenityType} (No name)`,
            tags: element.tags,
            distance,
            type: amenityType
          };
        })
        .sort((a, b) => a.distance - b.distance) // Sort by actual distance
        .slice(0, numAmenities); // Take only the nearest ones based on numAmenities setting

      return amenities;

    } catch (error) {
      console.error('Error fetching amenities:', error);
      return [];
    }
  };

  // -------------------------
  // Search for amenities based on current location and user selection.
  // -------------------------
  const searchAmenities = async () => {
    if (!selectedLocation) return;
    setIsLoading(true);
    const [lat, lon] = selectedLocation;
    setAmenityMarkers([]);
    setRoutes([]);

    const selectedTypes = Object.entries(selectedAmenities)
      .filter(([_, value]) => value)
      .map(([type]) => type);

    if (selectedTypes.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      const timestamp = Date.now();
      const processedAmenities = [];

      // Fetch and process amenities for each selected type
      for (const amenityType of selectedTypes) {
        const amenities = await fetchNearbyAmenities(lat, lon, amenityType);
        
        // Add type-specific information to each amenity
        const typeAmenities = amenities.map((amenity, index) => ({
          ...amenity,
          number: index + 1,
          id: `${timestamp}-${amenityType}-${index}`,
          color: amenityColors[amenityType]
        }));

        processedAmenities.push(...typeAmenities);
      }

      setAmenityMarkers(processedAmenities);

      // Fetch routes for the amenities
      for (const amenity of processedAmenities) {
        try {
          const route = await getRoute(selectedLocation, amenity.position);
          setRoutes(prev => [...prev, {
            ...route,
            type: amenity.type,
            color: amenity.color,
            destination: amenity
          }]);
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to get route for ${amenity.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------
  // Handlers for input, prediction selection, and map interactions
  // -------------------------
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    const newPosition = [lat, lng];
    setMarkerPosition(newPosition);
    setSelectedLocation(newPosition);
    
    try {
      const response = await fetch(
        `${NOMINATIM_API}/reverse?` + 
        `format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: API_CONFIG.headers }
      );

      if (!response.ok) throw new Error('Reverse geocoding failed');
      const data = await response.json();
      const formattedAddress = formatAddress(data);
      setAddress(formattedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch (error) {
      console.error('Error with reverse geocoding:', error);
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  };

  // Reset all state values to initial values
  const handleReset = () => {
    setSelectedLocation(null);
    setMarkerPosition(null);
    setAmenityMarkers([]);
    setRoutes([]);
    setAddress('');
    setPredictions([]);
    setSelectedAmenities({
      'EV-Chargers': false,
      'Hospitals': false,
      'Schools': false,
      'Restaurants': false,
      'Supermarkets': false
    });
    setNumAmenities(5);
  };

  // -------------------------
  // Effects to load geolocation and update amenities when selection changes
  // -------------------------
  useEffect(() => {
    if (selectedLocation && Object.values(selectedAmenities).some(v => v)) {
      searchAmenities();
    }
  }, [selectedLocation, selectedAmenities]);

  useEffect(() => {
    if (userLocation && !selectedLocation) {
      const [lat, lon] = userLocation;
      setSelectedLocation(userLocation);
      setMarkerPosition(userLocation);
      
      // Fetch address for initial location
      fetch(
        `${NOMINATIM_API}/reverse?` + 
        `format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        { headers: API_CONFIG.headers }
      )
        .then(res => res.json())
        .then(data => {
          const formattedAddress = formatAddress(data);
          setAddress(formattedAddress || `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        })
        .catch(() => {
          setAddress(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        });
    }
  }, [userLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-5 pointer-events-none" />
      
      {/* Enhanced header section */}
      <div className="relative w-full px-8 py-8 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-700" style={{ zIndex: 1000 }}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
        
        {/* Header content */}
        <div className="relative">
          <h1 className="text-center text-7xl font-bold mb-6 text-white/90" style={{
            fontFamily: "'Playfair Display', serif",
            textShadow: '0 2px 4px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1)'
          }}>
            House<span className="text-amber-300">Planner</span>
          </h1>

          {/* Status messages with glassmorphism */}
          {locationLoading && (
            <div className="max-w-2xl mx-auto mb-4">
              <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-lg
                            border border-white/20 text-center text-gray-600">
                Requesting location access...
              </div>
            </div>
          )}

          {/* Enhanced search box container */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-3 
                          border border-white/20 transition-all duration-300 hover:shadow-2xl">
              <AddressInput
                address={address}
                onChange={handleInputChange}
                predictions={predictions}
                onSelect={handlePredictionSelect}
                onReset={handleReset}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="container mx-auto px-8 py-8" style={{ zIndex: 1 }}>
        <div className="lg:grid lg:grid-cols-[450px_1fr] lg:gap-8">
          {/* Left sidebar */}
          <div className="lg:h-[calc(100vh-200px)] lg:overflow-y-auto">
            <AmenityControls
              numAmenities={numAmenities}
              setNumAmenities={setNumAmenities}
              selectedAmenities={selectedAmenities}
              toggleAmenity={(type) => setSelectedAmenities(prev => ({ ...prev, [type]: !prev[type] }))}
              amenityColors={amenityColors}
            />
            <AmenitiesList routes={routes} calculateTime={calculateTime} />
            {isLoading && (
              <div className="mt-4 bg-white rounded-lg p-4 text-center">
                Searching for nearby amenities...
              </div>
            )}
          </div>

          {/* Map container */}
          <div className="mt-8 lg:mt-0">
            <div className="h-[600px] lg:h-[calc(100vh-200px)] w-full rounded-3xl overflow-hidden
                          shadow-[0_8px_32px_rgba(0,0,0,0.15)] border-2 border-white/50
                          transition-transform duration-300 hover:scale-[1.002]">
              <MapComponent
                selectedLocation={selectedLocation}
                markerPosition={markerPosition}
                amenityMarkers={amenityMarkers}
                routes={routes}
                onMapClick={handleMapClick}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HousePlanner;
