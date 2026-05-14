import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

const ALLOWED_TAGS = new Set([
  'amenity=charging_station',
  'amenity=hospital',
  'amenity=school',
  'amenity=restaurant',
  'shop=supermarket',
]);

const AMENITY_FETCH_TIMEOUT_MS = 12000;
const MAX_SERVER_ELEMENTS = 1500;
const MAX_REQUESTED_AMENITIES = 100;
const MIN_SERVER_OUTPUT_ELEMENTS = 200;
const SERVER_OUTPUT_BUFFER_MULTIPLIER = 8;
const OVERPASS_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  Accept: 'application/json',
  'User-Agent': 'HousePlanner/1.0 (amenity search; contact: https://github.com/sarj7/house_planner)',
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const calculateDirectDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const earthRadiusMeters = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
};

const countValidElementsWithinRadius = (elements: any[], lat: number, lon: number, radius: number) => {
  return elements.filter((element) => {
    const elemLat = Number(element.lat ?? element.center?.lat);
    const elemLon = Number(element.lon ?? element.center?.lon);
    if (!Number.isFinite(elemLat) || !Number.isFinite(elemLon)) return false;
    return calculateDirectDistance(lat, lon, elemLat, elemLon) <= radius;
  }).length;
};

const fetchWithTimeout = async (url: string, body: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AMENITY_FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: 'POST',
      headers: OVERPASS_HEADERS,
      body,
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timed out after ${Math.round(AMENITY_FETCH_TIMEOUT_MS / 1000)}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export async function POST(request: NextRequest) {
  let body: {
    lat?: unknown;
    lon?: unknown;
    radius?: unknown;
    queryTag?: unknown;
    requestedCount?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Amenity request body was not valid JSON.' }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lon = Number(body.lon);
  const radius = Number(body.radius);
  const queryTag = typeof body.queryTag === 'string' ? body.queryTag : '';
  const requestedCount = Math.min(
    MAX_REQUESTED_AMENITIES,
    Math.max(1, Math.round(Number(body.requestedCount) || 1))
  );

  if (!isFiniteNumber(lat) || !isFiniteNumber(lon) || !isFiniteNumber(radius)) {
    return NextResponse.json(
      { error: 'Amenity request requires numeric lat, lon, and radius values.' },
      { status: 400 }
    );
  }

  if (!ALLOWED_TAGS.has(queryTag)) {
    return NextResponse.json({ error: `Amenity tag is not allowed: ${queryTag || '(empty)'}` }, { status: 400 });
  }

  const safeRadius = Math.min(50000, Math.max(500, Math.round(radius)));
  const desiredValidCount = Math.min(MAX_SERVER_ELEMENTS, requestedCount);
  const outputLimit = Math.min(
    MAX_SERVER_ELEMENTS,
    Math.max(MIN_SERVER_OUTPUT_ELEMENTS, requestedCount * SERVER_OUTPUT_BUFFER_MULTIPLIER)
  );
  const query = `
    [out:json][timeout:25];
    (
      node[${queryTag}](around:${safeRadius},${lat},${lon});
      way[${queryTag}](around:${safeRadius},${lat},${lon});
      relation[${queryTag}](around:${safeRadius},${lat},${lon});
    );
    out center ${outputLimit};
  `;

  const encodedBody = `data=${encodeURIComponent(query)}`;
  const failures: string[] = [];
  const emptyResponses: string[] = [];
  let firstEmptyResponse: {
    elements: any[];
    source: string;
    httpStatus: number;
    radius: number;
    capped: boolean;
    outputLimit?: number;
    providerRawCount: number;
    providerValidCount: number;
  } | null = null;
  let bestPartialResponse: {
    elements: any[];
    source: string;
    httpStatus: number;
    radius: number;
    capped: boolean;
    outputLimit?: number;
    providerRawCount: number;
    providerValidCount: number;
  } | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(endpoint, encodedBody);
      const text = await response.text();

      if (!response.ok) {
        failures.push(`${endpoint} returned HTTP ${response.status}${text ? `: ${text.slice(0, 160)}` : ''}`);
        continue;
      }

      const data = JSON.parse(text);
      const elements = Array.isArray(data?.elements) ? data.elements : [];
      const providerValidCount = countValidElementsWithinRadius(elements, lat, lon, safeRadius);
      const responsePayload = {
        elements,
        source: endpoint,
        httpStatus: response.status,
        radius: safeRadius,
        capped: true,
        outputLimit,
        providerRawCount: elements.length,
        providerValidCount,
      };

      if (!elements.length) {
        emptyResponses.push(`${endpoint} returned 0 elements`);
        firstEmptyResponse ??= responsePayload;
        continue;
      }

      if (providerValidCount >= desiredValidCount) {
        return NextResponse.json({
          ...responsePayload,
          requestedCount,
          desiredValidCount,
          providerFailureCount: failures.length,
          providerEmptyCount: emptyResponses.length,
          details: [...emptyResponses, ...failures].join(' | ') || undefined,
        });
      }

      bestPartialResponse =
        !bestPartialResponse || providerValidCount > bestPartialResponse.providerValidCount
          ? responsePayload
          : bestPartialResponse;

      failures.push(
        `${endpoint} returned ${providerValidCount} valid elements within radius, below the requested count ${desiredValidCount}`
      );
    } catch (error) {
      failures.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (bestPartialResponse) {
    return NextResponse.json({
      ...bestPartialResponse,
      requestedCount,
      desiredValidCount,
      providerFailureCount: failures.length,
      providerEmptyCount: emptyResponses.length,
      details: [...emptyResponses, ...failures].join(' | '),
    });
  }

  if (firstEmptyResponse) {
    return NextResponse.json({
      ...firstEmptyResponse,
      requestedCount,
      desiredValidCount,
      providerFailureCount: failures.length,
      providerEmptyCount: emptyResponses.length,
      details: [...emptyResponses, ...failures].join(' | '),
    });
  }

  return NextResponse.json(
    {
      error: 'Amenity search could not reach the OpenStreetMap Overpass service.',
      details: failures.join(' | '),
      source: OVERPASS_ENDPOINTS.join(', '),
    },
    { status: 502 }
  );
}
