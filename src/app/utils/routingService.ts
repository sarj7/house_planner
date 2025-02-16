const GRAPHHOPPER_API_KEY = '4f0c6de0-af72-4b27-87d4-c1f4509ba88f'; // Free API key for demo

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

// Haversine distance calculation
export const calculateDirectDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const getRoute = async (start: [number, number], end: [number, number]) => {
  try {
    // Try GraphHopper first (most reliable)
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
        const path = data.paths[0].points.coordinates.map(([lon, lat]) => [lat, lon]);
        return {
          path,
          distance: data.paths[0].distance,
          duration: data.paths[0].time / 1000,
          isEstimate: false
        };
      }
    }

    // If GraphHopper fails, try OSRM
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

    throw new Error('No routing service available');
  } catch (error) {
    console.error('Failed to get route:', error);
    throw error;
  }
};

// Polyline decoder
export const decodePolyline = (str: string) => {
  // ...existing decodePolyline implementation...
};

// More accurate polyline decoder for detailed paths
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
