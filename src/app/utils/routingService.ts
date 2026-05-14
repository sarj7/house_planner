// -------------------------
// Helper Functions
// -------------------------

export type TravelMode = 'walking' | 'driving';

export interface RouteSummary {
  distance: number;
  duration: number;
  isEstimate: boolean;
}

export interface AmenityRoute {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  drivingDistance: number;
  drivingDuration: number;
  isEstimate: boolean;
  drivingIsEstimate: boolean;
}

export const AVERAGE_WALKING_SPEED_KMH = 5;

const AVERAGE_SPEEDS_KMH: Record<TravelMode, number> = {
  walking: AVERAGE_WALKING_SPEED_KMH,
  driving: 40,
};

// Helper to calculate direct distance (as the crow flies) between two points
export const calculateDirectDistance = (
  lat1: number, lon1: number, lat2: number, lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

// Estimate travel time in minutes based on distance and mode
export const calculateTime = (distanceKm: number, mode: TravelMode): number => {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  const speed = AVERAGE_SPEEDS_KMH[mode] ?? AVERAGE_SPEEDS_KMH.walking;
  return (distanceKm / speed) * 60;
};

export const calculateWalkingMinutesFromDistance = (distanceMeters?: number): number => {
  if (!Number.isFinite(distanceMeters) || (distanceMeters as number) <= 0) return 0;
  return Math.round(((distanceMeters as number) / 1000 / AVERAGE_WALKING_SPEED_KMH) * 60);
};

// -------------------------
// Route Fetching Function
// -------------------------

// Get a route between two points
export const getRoute = async (
  start: [number, number],
  end: [number, number]
): Promise<AmenityRoute> => {
  try {
    const response = await fetch('/api/route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ start, end }),
    });

    if (response.ok) {
      const data = await response.json();

      if (
        Array.isArray(data?.coordinates) &&
        Number.isFinite(data?.distance) &&
        Number.isFinite(data?.duration) &&
        Number.isFinite(data?.drivingDistance) &&
        Number.isFinite(data?.drivingDuration)
      ) {
        return {
          coordinates: data.coordinates,
          distance: data.distance,
          duration: calculateWalkingMinutesFromDistance(data.distance) * 60,
          drivingDistance: data.drivingDistance,
          drivingDuration: data.drivingDuration,
          isEstimate: Boolean(data.isEstimate),
          drivingIsEstimate: Boolean(data.drivingIsEstimate),
        };
      }
    }

    throw new Error('Route calculation failed');
  } catch (error) {
    console.error('Error fetching route:', error);

    // Keep estimated metrics, but do not fabricate a straight-line geometry.
    const directDistance = calculateDirectDistance(
      start[0], start[1], end[0], end[1]
    );

    const durationInSeconds = calculateWalkingMinutesFromDistance(directDistance) * 60;

    return {
      coordinates: [],
      distance: directDistance,
      duration: durationInSeconds,
      drivingDistance: directDistance,
      drivingDuration: calculateTime(directDistance / 1000, 'driving') * 60,
      isEstimate: true,
      drivingIsEstimate: true,
    };
  }
};
