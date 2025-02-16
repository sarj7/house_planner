'use client';

import React, { useState, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react'; // Remove RefreshCw
import { debounce } from 'lodash';
import dynamic from 'next/dynamic';
import { useGeolocation } from '../hooks/useGeolocation';
import { getRoute, calculateDirectDistance } from '../utils/routingService';

const MapComponent = dynamic(
  () => import('@/app/components/MapComponent'),
  { ssr: false }
);

// API endpoints
const NOMINATIM_API = 'https://nominatim.openstreetmap.org';
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Add multiple OSRM endpoints for better global coverage
const OSRM_ENDPOINTS = [
  'https://router.project-osrm.org/route/v1/walking',
  'https://routing.openstreetmap.de/routed-foot/route/v1/walking',
  'https://routing.openstreetmap.de/routed-car/route/v1/driving'
];

// Amenity type mappings
const amenityTags = {
  'EV-Chargers': 'amenity=charging_station',
  'Hospitals': 'amenity=hospital',
  'Schools': 'amenity=school',
  'Restaurants': 'amenity=restaurant',
  'Supermarkets': 'shop=supermarket'
};

// Add this color mapping after amenityTags
const amenityColors = {
  'EV-Chargers': '#2ecc71',    // Green
  'Hospitals': '#e74c3c',      // Red
  'Schools': '#3498db',        // Blue
  'Restaurants': '#f39c12',    // Orange
  'Supermarkets': '#9b59b6'    // Purple
};

// Add this color utility function after the amenityColors constant
const getColorGradient = (baseColor: string, distance: number, maxDistance: number) => {
  // Convert hex to RGB
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate opacity based on distance (closer = more opaque)
  const opacity = 0.3 + (0.7 * (distance / maxDistance));

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const HousePlanner = () => {
  // Add geolocation hook at the top of component
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

  // Fetch address predictions
  const fetchAddressPredictions = async (input) => {
    if (!input) {
      setPredictions([]);
      return;
    }

    try {
      const response = await fetch(
        `${NOMINATIM_API}/search?format=json&q=${input}&limit=5`
      );
      const data = await response.json();
      setPredictions(data);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setPredictions([]);
    }
  };

  const debouncedFetchPredictions = debounce(fetchAddressPredictions, 300);

  // Modified fetchNearbyAmenities function to search in all of Alberta
  const fetchNearbyAmenities = async (lat, lon, amenityType) => {
    // Ensure coordinates are within valid ranges
    const clampLongitude = (lon) => {
      while (lon > 180) lon -= 360;
      while (lon < -180) lon += 360;
      return lon;
    };

    // Dynamically adjust search radius based on location
    const getSearchRadius = (lat) => {
      const absLat = Math.abs(lat);
      // Larger radius for less populated areas (higher latitudes)
      if (absLat > 60) return 0.5;      // ~55km
      if (absLat > 45) return 0.35;     // ~39km
      return 0.25;                       // ~28km at equator
    };

    const radius = getSearchRadius(lat);
    const bbox = {
      south: Math.max(-90, Math.min(90, lat - radius)),
      north: Math.max(-90, Math.min(90, lat + radius)),
      west: clampLongitude(lon - radius),
      east: clampLongitude(lon + radius)
    };

    // Updated query format with timeout and proper spacing
    const query = `
      [out:json][timeout:25];
      (
        node[${amenityTags[amenityType]}](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way[${amenityTags[amenityType]}](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        relation[${amenityTags[amenityType]}](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      );
      out body center qt;`.trim();

    try {
      const response = await fetch(OVERPASS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        console.error('Overpass API Error:', await response.text());
        return []; // Return empty array instead of throwing
      }

      const data = await response.json();
      
      // Handle empty results
      if (!data.elements || data.elements.length === 0) {
        return [];
      }

      // Rest of the function remains the same
      const elements = data.elements.map(element => {
        const elementLat = element.lat || element.center.lat;
        const elementLon = element.lon || element.center.lon;
        const distance = calculateDistance(lat, lon, elementLat, elementLon);
        return { ...element, distance };
      }).sort((a, b) => a.distance - b.distance);

      // Take exactly the number of elements requested, if available
      const slicedElements = elements.slice(0, numAmenities);
      
      return slicedElements.map(element => ({
        position: [
          element.lat || element.center.lat,
          element.lon || element.center.lon
        ],
        type: amenityType,
        name: element.tags.name || 'Unnamed',
        distance: element.distance,
        tags: element.tags // Include all tags
      }));
    } catch (error) {
      console.error('Error fetching amenities:', error);
      return []; // Return empty array on error
    }
  };

  // Add this helper function to calculate distances
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  };

  // Modified route fetching with fallbacks
  const fetchRoute = async (start, end) => {
    try {
      const route = await getRoute(start, end);
      return route;
    } catch (error) {
      console.error('Route calculation error:', error);
      // Fallback to direct distance
      const distance = calculateDirectDistance(start[0], start[1], end[0], end[1]);
      return {
        path: [start, end],
        distance: distance * 1000,
        duration: distance * 720,
        isEstimate: true
      };
    }
  };

  // Decode polyline for route visualization
  const decodePolyline = (encoded) => {
    const points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
      let shift = 0, result = 0;
      let byte;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push([lat * 1e-5, lng * 1e-5]);
    }
    return points;
  };

  // Modified searchAmenities to handle global locations
  const searchAmenities = async () => {
    if (!selectedLocation) return;

    setIsLoading(true);
    const [lat, lon] = selectedLocation;
    setAmenityMarkers([]);
    setRoutes([]);

    // Fix: Get selected types from selectedAmenities
    const selectedTypes = Object.entries(selectedAmenities)
      .filter(([_, selected]) => selected)
      .map(([type]) => type);

    if (selectedTypes.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      const timestamp = Date.now();
      for (const amenityType of selectedTypes) {
        const amenities = await fetchNearbyAmenities(lat, lon, amenityType);
        
        if (amenities.length === 0) {
          continue;
        }

        const sortedAmenities = amenities
          .sort((a, b) => a.distance - b.distance)
          .map((amenity, index) => ({
            ...amenity,
            color: amenityColors[amenityType],
            number: index + 1,
            id: `${timestamp}-${amenityType}-${index}`
          }));

        setAmenityMarkers(prev => [...prev, ...sortedAmenities]);

        // Get routes sequentially to avoid overwhelming the routing service
        for (const amenity of sortedAmenities) {
          try {
            const route = await getRoute(selectedLocation, amenity.position);
            setRoutes(prev => [...prev, {
              ...route,
              type: amenityType,
              color: amenityColors[amenityType],
              destination: amenity
            }]);
          } catch (error) {
            console.error(`Failed to get route for ${amenity.name}:`, error);
            // Skip this amenity and try the next one
            continue;
          }
          // Add small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle address input change
  const handleAddressChange = (e) => {
    const value = e.target.value;
    setAddress(value);
    debouncedFetchPredictions(value);
  };

  // Handle prediction selection
  const handlePredictionSelect = (prediction) => {
    setAddress(prediction.display_name);
    const newLocation = [parseFloat(prediction.lat), parseFloat(prediction.lon)];
    setSelectedLocation(newLocation);
    setMarkerPosition(newLocation);
    setPredictions([]);
  };

  // Handle map click
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    const newPosition = [lat, lng];
    setMarkerPosition(newPosition);
    setSelectedLocation(newPosition);
    
    try {
      const response = await fetch(
        `${NOMINATIM_API}/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      setAddress(data.display_name);
    } catch (error) {
      console.error('Error with reverse geocoding:', error);
    }
  };

  // Search amenities when location or amenity selection changes
  useEffect(() => {
    if (selectedLocation && Object.values(selectedAmenities).some(v => v)) {
      searchAmenities();
    }
  }, [selectedLocation, selectedAmenities]);

  // Set initial location when geolocation is available
  useEffect(() => {
    if (userLocation && !selectedLocation) {
      setSelectedLocation(userLocation);
      setMarkerPosition(userLocation);
      
      // Reverse geocode the location to get address
      const [lat, lon] = userLocation;
      fetch(`${NOMINATIM_API}/reverse?format=json&lat=${lat}&lon=${lon}`)
        .then(res => res.json())
        .then(data => {
          setAddress(data.display_name || '');
        })
        .catch(error => {
          console.error('Error getting address:', error);
        });
    }
  }, [userLocation]);

  const handleReset = () => {
    // Reset all states with proper initial values
    setSelectedLocation(null);
    setMarkerPosition(null);
    setAmenityMarkers([]);
    setRoutes([]);
    setAddress(''); // Ensure this is an empty string, not undefined
    setPredictions([]);
    setSelectedAmenities({
      'EV-Chargers': false,
      'Hospitals': false,
      'Schools': false,
      'Restaurants': false,
      'Supermarkets': false
    });
    setNumAmenities(5); // Reset number of amenities to default
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-300 to-amber-700">
      <div className="container mx-auto px-4 py-8">
        <h1
          className="text-center text-6xl font-bold mb-8"
          style={{
            fontFamily: "'Playfair Display', serif",
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          HousePlanner
        </h1>

        {locationLoading && (
          <div className="max-w-2xl mx-auto mb-4 bg-white rounded-lg p-4 text-center">
            Requesting location access...
          </div>
        )}

        {locationError && (
          <div className="max-w-2xl mx-auto mb-4 bg-white rounded-lg p-4 text-center text-amber-600">
            {locationError === 'User denied Geolocation' 
              ? 'Location access was denied. Please enable location access or enter your location manually.'
              : 'Could not get your location. Please enter it manually.'}
          </div>
        )}

        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              value={address || ''} // Ensure value is never undefined
              onChange={handleAddressChange}
              placeholder="Enter any location worldwide" // Updated placeholder
              className="w-full p-3 rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500 pr-24 bg-white text-gray-900" // Increased right padding
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
              <button
                className="p-2 rounded-full hover:bg-gray-100"
                onClick={handleReset}
                title="Reset everything"
              >
                <RotateCcw className="w-5 h-5 text-gray-500" />
              </button>
              <button
                className="p-2 rounded-full hover:bg-gray-100"
                onClick={searchAmenities}
                disabled={isLoading}
              >
                <Search className={`w-5 h-5 ${isLoading ? 'text-gray-300' : 'text-gray-500'}`} />
              </button>
            </div>
          </div>

          {predictions.length > 0 && (
            <div className="absolute z-50 w-full bg-white rounded-lg shadow-lg mt-1">
              {predictions.map((prediction, index) => (
                <div
                  key={index}
                  className="p-2 hover:bg-gray-100 cursor-pointer text-gray-900"
                  onClick={() => handlePredictionSelect(prediction)}
                >
                  {prediction.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="max-w-2xl mx-auto mb-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <label className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg">
              <span className="text-lg text-gray-900">Show</span>
              <input
                type="number"
                min="1"
                max="20"
                value={numAmenities}
                onChange={(e) => setNumAmenities(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 rounded border text-center text-gray-900"
              />
              <span className="text-lg text-gray-900">nearest locations</span>
            </label>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {Object.keys(selectedAmenities).map((amenity) => (
              <label key={amenity} className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg">
                <input
                  type="checkbox"
                  checked={selectedAmenities[amenity]}
                  onChange={() =>
                    setSelectedAmenities(prev => ({
                      ...prev,
                      [amenity]: !prev[amenity]
                    }))
                  }
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="text-lg text-gray-900">{amenity}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto rounded-lg overflow-hidden shadow-lg border-4 border-white">
          <div className="h-[600px] w-full">
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

        {/* Replace the existing legend with simpler version */}
        <div className="max-w-4xl mx-auto mt-4 bg-white rounded-lg p-4">
          <div className="flex flex-wrap gap-6 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-black border-2 border-white shadow-sm"></div>
              <span className="text-sm font-medium text-black">Your Location</span>
            </div>
            {Object.entries(amenityColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-sm font-medium text-black">
                  {type} (numbered by proximity)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fix the amenities list syntax */}
        {routes.length > 0 && (
          <div className="max-w-4xl mx-auto mt-4 bg-white rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4 !text-black">Nearest Amenities:</h2>
            {Object.entries(amenityColors).map(([amenityType, color]) => {
              const amenityRoutes = routes.filter(route => route.type === amenityType);
              if (amenityRoutes.length === 0) return null;

              return (
                <div key={amenityType} className="mb-4">
                  <h3 className="text-lg font-semibold mb-2 !text-black" style={{ color }}>
                    {amenityType}
                  </h3>
                  {amenityRoutes.map((route, index) => (
                    <div key={index} className="ml-4 mb-2">
                      <p className="!text-black" style={{ color }}>
                        {route.destination.number}. {route.destination.name} -{' '}
                        {(route.distance / 1000).toFixed(2)}km (
                        {Math.round(route.duration / 60)} mins walking)
                        {route.isEstimate && ' *'}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {isLoading && (
          <div className="max-w-4xl mx-auto mt-4 bg-white rounded-lg p-4 text-center">
            Searching for nearby amenities...
          </div>
        )}
      </div>
    </div>
  );
};

export default HousePlanner;
