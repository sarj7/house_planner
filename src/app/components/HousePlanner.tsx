'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { debounce } from 'lodash';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(
  () => import('@/app/components/MapComponent'),
  { ssr: false }
);

// API endpoints
const NOMINATIM_API = 'https://nominatim.openstreetmap.org';
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const OSRM_API = 'https://router.project-osrm.org/route/v1/walking';

// Amenity type mappings
const amenityTags = {
  'EV-Chargers': 'amenity=charging_station',
  'Hospitals': 'amenity=hospital',
  'Schools': 'amenity=school',
  'Restaurants': 'amenity=restaurant',
  'Supermarkets': 'shop=supermarket'
};

const HousePlanner = () => {
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

  // Fetch address predictions
  const fetchAddressPredictions = async (input) => {
    if (!input) {
      setPredictions([]);
      return;
    }

    try {
      const response = await fetch(
        `${NOMINATIM_API}/search?format=json&q=${input}, Calgary, AB, Canada&limit=5&countrycodes=ca`
      );
      const data = await response.json();
      setPredictions(data);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setPredictions([]);
    }
  };

  const debouncedFetchPredictions = debounce(fetchAddressPredictions, 300);

  // Fetch nearby amenities
  const fetchNearbyAmenities = async (lat, lon, amenityType) => {
    const radius = 2000; // 2km radius
    const query = `
      [out:json][timeout:25];
      (
        node[${amenityTags[amenityType]}](around:${radius},${lat},${lon});
        way[${amenityTags[amenityType]}](around:${radius},${lat},${lon});
        relation[${amenityTags[amenityType]}](around:${radius},${lat},${lon});
      );
      out center;
    `;

    try {
      const response = await fetch(OVERPASS_API, {
        method: 'POST',
        body: query
      });
      const data = await response.json();
      return data.elements.map(element => ({
        position: [
          element.lat || element.center.lat,
          element.lon || element.center.lon
        ],
        type: amenityType,
        name: element.tags.name || 'Unnamed'
      }));
    } catch (error) {
      console.error('Error fetching amenities:', error);
      return [];
    }
  };

  // Fetch route between two points
  const fetchRoute = async (start, end) => {
    try {
      const response = await fetch(
        `${OSRM_API}/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full`
      );
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        const coordinates = decodePolyline(data.routes[0].geometry);
        return {
          path: coordinates,
          distance: data.routes[0].distance,
          duration: data.routes[0].duration
        };
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
    return null;
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

  // Search for amenities
  const searchAmenities = async () => {
    if (!selectedLocation) return;

    setIsLoading(true);
    const [lat, lon] = selectedLocation;
    setAmenityMarkers([]);
    setRoutes([]);

    const selectedTypes = Object.entries(selectedAmenities)
      .filter(([_, selected]) => selected)
      .map(([type]) => type);

    try {
      for (const amenityType of selectedTypes) {
        const amenities = await fetchNearbyAmenities(lat, lon, amenityType);
        setAmenityMarkers(prev => [...prev, ...amenities]);

        // Get routes for the 3 closest amenities of each type
        const closest = amenities.slice(0, 3);
        for (const amenity of closest) {
          const route = await fetchRoute(selectedLocation, amenity.position);
          if (route) {
            setRoutes(prev => [...prev, {
              ...route,
              type: amenityType,
              destination: amenity
            }]);
          }
        }
      }
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

        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              value={address}
              onChange={handleAddressChange}
              placeholder="Drop your Home Address"
              className="w-full p-3 rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500 pr-12 bg-white text-gray-900"
            />
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full hover:bg-gray-100"
              onClick={searchAmenities}
              disabled={isLoading}
            >
              <Search className={`w-5 h-5 ${isLoading ? 'text-gray-300' : 'text-gray-500'}`} />
            </button>
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

        <div className="max-w-2xl mx-auto mb-4 flex flex-wrap justify-center gap-4">
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

        <div className="max-w-4xl mx-auto rounded-lg overflow-hidden shadow-lg border-4 border-white">
          <div className="h-[600px] w-full">
            <MapComponent
              selectedLocation={selectedLocation}
              markerPosition={markerPosition}
              amenityMarkers={amenityMarkers}
              routes={routes}
              onMapClick={handleMapClick}
            />
          </div>
        </div>

        {routes.length > 0 && (
          <div className="max-w-4xl mx-auto mt-4 bg-white rounded-lg p-4">
            <h2 className="text-xl font-bold mb-2">Nearest Amenities:</h2>
            {routes.map((route, index) => (
              <div key={index} className="mb-2">
                <p>
                  {route.type}: {route.destination.name} -{' '}
                  {(route.distance / 1000).toFixed(2)}km (
                  {Math.round(route.duration / 60)} mins walking)
                </p>
              </div>
            ))}
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

