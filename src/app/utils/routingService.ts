// -------------------------
// Constants & API Keys
// -------------------------
const GRAPHHOPPER_API_KEY = '4f0c6de0-af72-4b27-87d4-c1f4509ba88f'; // Free API key for demo
const MAPBOX_API_KEY = 'pk.your_mapbox_key_here'; // Add Mapbox API key (sign up at mapbox.com to get one)

// List of routing endpoints to try (all for foot/walking routes)
const ROUTING_ENDPOINTS = [
  {
    url: 'https://routing.openstreetmap.de/routed-foot/route/v1/walking',
    type: 'walking'
  },
  {
    url: 'https://api.openrouteservice.org/v2/directions/foot-walking',
    type: 'walking',
    headers: {
      'Authorization': '5b3ce3597851110001cf6248bb16200f88564bd18f3dd91b6fc56ad6' // Free API key
    }
  },
  {
    url: 'https://router.project-osrm.org/route/v1/foot',
    type: 'walking'
  }
];

// Average speeds in km/h for different travel modes
const SPEEDS = {
  walking: 5, // average walking speed
  driving: 30 // average urban driving speed
};

// -------------------------
// Helper Functions
// -------------------------

// Calculates the direct (straight line) distance between two coordinates using Haversine formula
export const calculateDirectDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth's radius in kilometers
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
           Math.cos(φ1) * Math.cos(φ2) *
           Math.sin(Δλ/2) * Math.sin(Δλ/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // distance in kilometers
  
  return Math.round(d * 1000) / 1000; // rounded to 3 decimal places
};

// Converts km distance into minutes based on mode of travel
export const calculateTime = (distanceKm: number, mode: 'walking' | 'driving') => {
  const speed = SPEEDS[mode];
  const timeInHours = distanceKm / speed;
  return timeInHours * 60; // return minutes
};

// -------------------------
// Route Fetching Function
// -------------------------

// Remove traffic-related types and logic, simplify getRoute
export const getRoute = async (start: [number, number], end: [number, number]) => {
  try {
    // Try OSRM first
    const osrmResponse = await fetch(
      `https://router.project-osrm.org/route/v1/driving/` +
      `${start[1]},${start[0]};${end[1]},${end[0]}?` +
      `overview=full&steps=true&geometries=geojson`
    );

    if (osrmResponse.ok) {
      const data = await osrmResponse.json();
      if (data.routes?.[0]) {
        const route = data.routes[0];
        return {
          path: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
          distance: route.distance,
          duration: route.duration,
          isEstimate: false
        };
      }
    }

    // Fallback to direct calculation
    const distance = calculateDirectDistance(start[0], start[1], end[0], end[1]);
    return {
      path: [start, end],
      distance: distance * 1000,
      duration: calculateTime(distance, 'driving') * 60,
      isEstimate: true
    };
  } catch (error) {
    console.error('Failed to get route:', error);
    throw error;
  }
};

// Rename existing getRoute to getRegularRoute
const getRegularRoute = async (start: [number, number], end: [number, number]) => {
  try {
    // Attempt 1: Use GraphHopper API (most reliable)
    const response = await fetch(
      `https://graphhopper.com/api/1/route?` + 
      `point=${start[0]},${start[1]}&` +
      `point=${end[0]},${end[1]}&` +
      `vehicle=foot&` +
      `points_encoded=false&` +
      `key=${GRAPHHOPPER_API_KEY}`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.paths && data.paths[0]) {
        // Convert coordinates from [lon, lat] to [lat, lon]
        const path = data.paths[0].points.coordinates.map(([lon, lat]) => [lat, lon]);
        return {
          path,
          distance: data.paths[0].distance,
          duration: data.paths[0].time / 1000, // time in seconds
          isEstimate: false
        };
      }
    }

    // Attempt 2: Try OSRM API if GraphHopper fails
    const osrmResponse = await fetch(
      `https://router.project-osrm.org/route/v1/foot/` +
      `${start[1]},${start[0]};${end[1]},${end[0]}?` +
      `overview=full&steps=true&geometries=geojson`
    );

    if (osrmResponse.ok) {
      const data = await osrmResponse.json();
      if (data.routes && data.routes[0]) {
        return {
          path: data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]),
          distance: data.routes[0].distance,
          duration: data.routes[0].duration,
          isEstimate: false
        };
      }
    }

    // Fallback: Use direct distance calculation if no API is available or failed
    const distance = calculateDirectDistance(start[0], start[1], end[0], end[1]);
    return {
      path: [start, end],
      distance: distance * 1000, // convert to meters
      duration: calculateTime(distance, 'walking') * 60, // convert minutes to seconds
      isEstimate: true
    };
  } catch (error) {
    console.error('Failed to get route:', error);
    throw error;
  }
};

// -------------------------
// Polyline Decoding Functions
// -------------------------
// Decodes a polyline string into an array of coordinates.
// The simple implementation is assumed to be defined here.
export const decodePolyline = (str: string) => {
  // ...existing decodePolyline implementation...
};

// More detailed polyline decoder for complex geometries.
const decodeGeometry = (str: string, normalized = false): [number, number][] => {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const factor = normalized ? 1e5 : 1;

  while (index < str.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += ((result & 1) ? ~(result >> 1) : (result >> 1)) / factor;

    result = 0;
    shift = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += ((result & 1) ? ~(result >> 1) : (result >> 1)) / factor;

    points.push([lat, lng]);
  }

  return points;
};
