import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
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

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const fetchWithTimeout = async (url: string, body: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AMENITY_FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
  let body: { lat?: unknown; lon?: unknown; radius?: unknown; queryTag?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Amenity request body was not valid JSON.' }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lon = Number(body.lon);
  const radius = Number(body.radius);
  const queryTag = typeof body.queryTag === 'string' ? body.queryTag : '';

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
  const query = `
    [out:json][timeout:25];
    (
      node[${queryTag}](around:${safeRadius},${lat},${lon});
      way[${queryTag}](around:${safeRadius},${lat},${lon});
      relation[${queryTag}](around:${safeRadius},${lat},${lon});
    );
    out center;
  `;

  const encodedBody = `data=${encodeURIComponent(query)}`;
  const failures: string[] = [];

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(endpoint, encodedBody);
      const text = await response.text();

      if (!response.ok) {
        failures.push(`${endpoint} returned HTTP ${response.status}${text ? `: ${text.slice(0, 160)}` : ''}`);
        continue;
      }

      const data = JSON.parse(text);
      return NextResponse.json({
        elements: Array.isArray(data?.elements) ? data.elements : [],
        source: endpoint,
        radius: safeRadius,
      });
    } catch (error) {
      failures.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return NextResponse.json(
    {
      error: 'Amenity search could not reach the OpenStreetMap Overpass service.',
      details: failures.join(' | '),
    },
    { status: 502 }
  );
}
