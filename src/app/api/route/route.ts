import { NextRequest, NextResponse } from 'next/server';

const OPENROUTE_API_URL = 'https://api.openrouteservice.org/v2/directions/foot-walking/geojson';
const OSRM_API_URL = 'https://router.project-osrm.org/route/v1/foot';
const OPENROUTE_API_KEY =
  process.env.OPENROUTE_API_KEY ?? process.env.NEXT_PUBLIC_OPENROUTE_API_KEY ?? '';

interface RouteResult {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  isEstimate: boolean;
}

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

const getOpenRouteRoute = async (start: [number, number], end: [number, number]): Promise<RouteResult | null> => {
  if (!OPENROUTE_API_KEY) return null;

  const response = await fetch(OPENROUTE_API_URL, {
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
  });

  if (!response.ok) {
    throw new Error(`OpenRoute request failed: ${response.status}`);
  }

  const data = await response.json();
  const feature = Array.isArray(data?.features) ? data.features[0] : null;
  const summary = feature?.properties?.summary;
  const coordinates = feature?.geometry?.coordinates;

  if (!feature || !summary || !Array.isArray(coordinates)) {
    throw new Error('OpenRoute response was missing route data.');
  }

  return {
    coordinates,
    distance: Number(summary.distance) || 0,
    duration: Number(summary.duration) || 0,
    isEstimate: false,
  };
};

const getOsrmRoute = async (start: [number, number], end: [number, number]): Promise<RouteResult> => {
  const params = new URLSearchParams({
    alternatives: 'false',
    overview: 'full',
    geometries: 'geojson',
    steps: 'false',
  });
  const response = await fetch(
    `${OSRM_API_URL}/${start[1]},${start[0]};${end[1]},${end[0]}?${params.toString()}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error(`OSRM request failed: ${response.status}`);
  }

  const data = await response.json();
  const route = Array.isArray(data?.routes) ? data.routes[0] : null;
  const coordinates = route?.geometry?.coordinates;

  if (!route || !Array.isArray(coordinates)) {
    throw new Error('OSRM response was missing route data.');
  }

  return {
    coordinates,
    distance: Number(route.distance) || 0,
    duration: Number(route.duration) || 0,
    isEstimate: false,
  };
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
    try {
      const openRouteResult = await getOpenRouteRoute(start, end);
      if (openRouteResult) {
        return NextResponse.json(openRouteResult);
      }
    } catch (error) {
      console.warn(
        'OpenRoute routing failed, falling back to OSRM.',
        error instanceof Error ? error.message : error
      );
    }

    const osrmResult = await getOsrmRoute(start, end);
    return NextResponse.json(osrmResult);
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
