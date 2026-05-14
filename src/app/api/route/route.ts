import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

type TravelMode = 'walking' | 'driving';

interface RouteResult {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  isEstimate: boolean;
  failureReason?: string;
}

const OPENROUTE_URLS: Record<TravelMode, string> = {
  walking: 'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
  driving: 'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
};

const OSRM_PROFILES: Record<TravelMode, string> = {
  walking: 'foot',
  driving: 'driving',
};

const OSRM_API_BASE_URL = 'https://router.project-osrm.org/route/v1';
const OPENROUTE_API_KEY =
  process.env.OPENROUTE_API_KEY ?? process.env.NEXT_PUBLIC_OPENROUTE_API_KEY ?? '';
const ENABLE_OPENROUTE = process.env.ENABLE_OPENROUTE === 'true';
const ROUTE_FETCH_TIMEOUT_MS = 6500;
const AVERAGE_WALKING_SPEED_KMH = 5;
const AVERAGE_DRIVING_SPEED_KMH = 40;

class RouteProviderError extends Error {
  provider: string;
  mode: TravelMode;
  status?: number;

  constructor(provider: string, mode: TravelMode, message: string, status?: number) {
    super(message);
    this.name = 'RouteProviderError';
    this.provider = provider;
    this.mode = mode;
    this.status = status;
  }
}

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const calculateDirectDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const earthRadiusMeters = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const estimateRoute = (start: [number, number], end: [number, number], mode: TravelMode): RouteResult => {
  const distance = calculateDirectDistance(start[0], start[1], end[0], end[1]);
  const speed = mode === 'walking' ? AVERAGE_WALKING_SPEED_KMH : AVERAGE_DRIVING_SPEED_KMH;
  return {
    coordinates: [],
    distance,
    duration: (distance / 1000 / speed) * 3600,
    isEstimate: true,
  };
};

const isCoordinatePair = (value: unknown): value is [number, number] => {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1])
  );
};

const getOpenRouteRoute = async (
  start: [number, number],
  end: [number, number],
  mode: TravelMode
): Promise<RouteResult | null> => {
  if (!OPENROUTE_API_KEY) return null;

  const response = await fetchWithTimeout(OPENROUTE_URLS[mode], {
    method: 'POST',
    headers: {
      Authorization: OPENROUTE_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json, application/geo+json',
    },
    body: JSON.stringify({
      coordinates: [
        [start[1], start[0]],
        [end[1], end[0]],
      ],
    }),
    cache: 'no-store',
  }, ROUTE_FETCH_TIMEOUT_MS);

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new RouteProviderError(
      'OpenRouteService',
      mode,
      `OpenRouteService ${mode} request failed with HTTP ${response.status}${details ? `: ${details.slice(0, 180)}` : ''}`,
      response.status
    );
  }

  const data = await response.json();
  const feature = Array.isArray(data?.features) ? data.features[0] : null;
  const summary = feature?.properties?.summary;
  const coordinates = feature?.geometry?.coordinates;

  if (!feature || !summary || !Array.isArray(coordinates)) {
    throw new RouteProviderError('OpenRouteService', mode, `OpenRouteService ${mode} response was missing route data.`);
  }

  return {
    coordinates,
    distance: Number(summary.distance) || 0,
    duration: Number(summary.duration) || 0,
    isEstimate: false,
  };
};

const getOsrmRoute = async (
  start: [number, number],
  end: [number, number],
  mode: TravelMode
): Promise<RouteResult> => {
  const params = new URLSearchParams({
    alternatives: 'false',
    overview: 'full',
    geometries: 'geojson',
    steps: 'false',
  });
  const profile = OSRM_PROFILES[mode];
  const response = await fetchWithTimeout(
    `${OSRM_API_BASE_URL}/${profile}/${start[1]},${start[0]};${end[1]},${end[0]}?${params.toString()}`,
    { cache: 'no-store' },
    ROUTE_FETCH_TIMEOUT_MS
  );

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new RouteProviderError(
      'OSRM',
      mode,
      `OSRM ${mode} request failed with HTTP ${response.status}${details ? `: ${details.slice(0, 180)}` : ''}`,
      response.status
    );
  }

  const data = await response.json();
  const route = Array.isArray(data?.routes) ? data.routes[0] : null;
  const coordinates = route?.geometry?.coordinates;

  if (!route || !Array.isArray(coordinates)) {
    throw new RouteProviderError('OSRM', mode, `OSRM ${mode} response was missing route data.`);
  }

  return {
    coordinates,
    distance: Number(route.distance) || 0,
    duration: Number(route.duration) || 0,
    isEstimate: false,
  };
};

const getRouteForMode = async (
  start: [number, number],
  end: [number, number],
  mode: TravelMode
): Promise<RouteResult> => {
  const failures: string[] = [];
  if (ENABLE_OPENROUTE) {
    try {
      const openRouteResult = await getOpenRouteRoute(start, end, mode);
      if (openRouteResult) return openRouteResult;
      failures.push('OpenRouteService skipped because OPENROUTE_API_KEY is not configured.');
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
      console.warn(
        `OpenRoute ${mode} routing failed, falling back to OSRM.`,
        error instanceof Error ? error.message : error
      );
    }
  }

  try {
    return await getOsrmRoute(start, end, mode);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
    console.warn(`OSRM ${mode} routing failed; using estimated ${mode} route.`, failures.join(' | '));
    const estimate = estimateRoute(start, end, mode);
    return {
      ...estimate,
      failureReason: failures.join(' | '),
    } as RouteResult;
  }
};

export async function POST(request: NextRequest) {
  let body: { start?: unknown; end?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { start, end } = body;
  if (!isCoordinatePair(start) || !isCoordinatePair(end)) {
    return NextResponse.json({ error: 'Expected start and end as [lat, lon].' }, { status: 400 });
  }

  try {
    const [walkingRoute, drivingRoute] = await Promise.all([
      getRouteForMode(start, end, 'walking'),
      getRouteForMode(start, end, 'driving'),
    ]);

    return NextResponse.json({
      coordinates: walkingRoute.coordinates,
      distance: walkingRoute.distance,
      duration: walkingRoute.duration,
      drivingDistance: drivingRoute.distance,
      drivingDuration: drivingRoute.duration,
      isEstimate: walkingRoute.isEstimate,
      drivingIsEstimate: drivingRoute.isEstimate,
      routingWarning: [walkingRoute.failureReason, drivingRoute.failureReason].filter(Boolean).join(' | ') || undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Routing request failed.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
