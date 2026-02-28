'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { Search, RotateCcw, Maximize2, Minimize2, LocateFixed } from 'lucide-react';
import clsx from 'clsx';

import { useGeolocation } from '../hooks/useGeolocation';
import { getRoute, calculateDirectDistance, calculateTime } from '../utils/routingService';
import AmenityControls from './AmenityControls';
import { Place } from '../types';
import DynamicMap from './DynamicMap';

const NOMINATIM_API = 'https://nominatim.openstreetmap.org';
const POSITIONSTACK_API = 'https://api.positionstack.com/v1';
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const POSITIONSTACK_ACCESS_KEY = process.env.NEXT_PUBLIC_POSITIONSTACK_ACCESS_KEY ?? '';

const DEFAULT_RADIUS = 2000;
const DEFAULT_NUM_AMENITIES = 5;
const ROUTE_REQUEST_DELAY = 120;

const amenityTags: Record<string, string> = {
  'EV-Chargers': 'amenity=charging_station',
  Hospitals: 'amenity=hospital',
  Schools: 'amenity=school',
  Restaurants: 'amenity=restaurant',
  Supermarkets: 'shop=supermarket',
};

const amenityColors: Record<string, string> = {
  'EV-Chargers': '#2f9d69',
  Hospitals: '#e25d4f',
  Schools: '#3a7ca5',
  Restaurants: '#d98d3a',
  Supermarkets: '#7d6b52',
};

const amenityOrder = Object.keys(amenityTags);

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
};

const getPositionstackResults = (payload: any): any[] => {
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getPositionstackErrorMessage = (payload: any) => {
  if (typeof payload?.error?.message === 'string') return payload.error.message;
  if (typeof payload?.error?.type === 'string') return payload.error.type;
  if (typeof payload?.error === 'string') return payload.error;
  return '';
};

const isPositionstackQuotaError = (payload: any, status?: number) => {
  if (status === 429) return true;
  const errorCode = Number(payload?.error?.code);
  const message = getPositionstackErrorMessage(payload);
  return (
    errorCode === 104 ||
    errorCode === 106 ||
    /quota|rate limit|limit reached|monthly limit|usage limit/i.test(message)
  );
};

class PositionstackError extends Error {
  isQuotaError: boolean;

  constructor(message: string, isQuotaError = false) {
    super(message);
    this.name = 'PositionstackError';
    this.isQuotaError = isQuotaError;
  }
}

interface PredictionOption {
  id: string;
  primaryText: string;
  secondaryText: string;
  label: string;
  source: 'positionstack' | 'nominatim';
  coordinates?: [number, number];
}

interface SearchResolution {
  label: string;
  coordinates: [number, number];
}

const formatAddress = (item: any) => {
  if (!item) return '';
  const addr = item.address || {};
  const parts = [
    addr.house_number && addr.road ? `${addr.house_number} ${addr.road}` : addr.road,
    addr.suburb || addr.neighbourhood,
    addr.city || addr.town || addr.village,
    addr.state || addr.province,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : item.display_name || '';
};

const formatAmenityAddress = (tags?: Record<string, any>) => {
  if (!tags) return '';
  if (tags['addr:full']) return tags['addr:full'];
  const street = tags['addr:street'];
  const houseNumber = tags['addr:housenumber'];
  const line1 = houseNumber && street ? `${houseNumber} ${street}` : street;
  const locality = tags['addr:city'] || tags['addr:town'] || tags['addr:village'];
  const region = tags['addr:state'];
  const postcode = tags['addr:postcode'];
  const parts = [line1, locality, region, postcode].filter(Boolean);
  return parts.join(', ');
};

const formatDistance = (distanceMeters: number) => {
  if (!Number.isFinite(distanceMeters)) return 'N/A';
  const km = distanceMeters / 1000;
  if (km < 10) return `${km.toFixed(2)} km`;
  return `${km.toFixed(1)} km`;
};

const formatDuration = (minutes: number) => {
  if (!Number.isFinite(minutes)) return 'N/A';
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
};

const getWalkingMinutes = (route: any) => {
  if (Number.isFinite(route?.duration)) return route.duration / 60;
  if (Number.isFinite(route?.distance)) return calculateTime(route.distance / 1000, 'walking');
  return 0;
};

const highlightMatch = (text: string, searchTerm: string) => {
  if (!text || !searchTerm) return text;
  const safeTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safeTerm})`, 'gi');
  return text.split(regex).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="rounded-sm bg-amber-200/80 px-1 text-slate-900">
        {part}
      </span>
    ) : (
      part
    )
  );
};

interface AddressInputProps {
  address: string;
  onChange: (value: string) => void;
  predictions: PredictionOption[];
  onSelect: (prediction: PredictionOption) => void;
  onDismissPredictions: () => void;
  onReset: () => void;
  onSearch: () => void;
  isSearching: boolean;
}

const AddressInput: React.FC<AddressInputProps> = ({
  address,
  onChange,
  predictions,
  onSelect,
  onDismissPredictions,
  onReset,
  onSearch,
  isSearching,
}) => {
  const hasPredictions = predictions.length > 0;

  return (
    <div className="relative z-20">
      <div className="relative">
        <input
          type="text"
          value={address}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch();
            if (e.key === 'Escape') {
              e.preventDefault();
              onDismissPredictions();
            }
          }}
          aria-label="Search for a place"
          placeholder="Search a city, address, or landmark"
          className="w-full rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 pr-24 text-sm text-slate-900 shadow-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-2">
          <button
            type="button"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            onClick={onReset}
            title="Reset everything"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 disabled:text-slate-300"
            onClick={onSearch}
            disabled={isSearching}
            title="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {hasPredictions && (
        <div className="predictions-dropdown absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 shadow-xl">
          {predictions.map((prediction, idx) => {
            return (
              <button
                key={`${prediction.id || idx}`}
                onClick={() => onSelect(prediction)}
                className="block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-amber-50"
                type="button"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {highlightMatch(prediction.primaryText, address)}
                </div>
                {prediction.secondaryText && (
                  <div className="mt-1 text-xs text-slate-500">
                    {highlightMatch(prediction.secondaryText, address)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface AmenitiesListProps {
  routes: any[];
}

const AmenitiesList: React.FC<AmenitiesListProps> = ({ routes }) => {
  if (!routes?.length) return null;
  const hasEstimates = routes.some((route) => route.isEstimate);

  return (
    <div className="mt-6 space-y-4 reveal reveal-delay-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-slate-500">
        <span className="h-2 w-2 rounded-full bg-amber-500"></span>
        <span>Nearest Amenities</span>
      </div>

      {amenityOrder.map((amenityType) => {
        const color = amenityColors[amenityType];
        const amenityRoutes = routes
          .filter((route) => route.type === amenityType)
          .sort((a, b) => a.distance - b.distance);

        if (!amenityRoutes.length) return null;

        return (
          <div key={amenityType} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }}></span>
              <h3 className="text-sm font-semibold text-slate-900">{amenityType}</h3>
            </div>
            <div className="mt-3 space-y-3">
              {amenityRoutes.map((route, idx) => {
                const walkingMinutes = getWalkingMinutes(route);
                const drivingMinutes = calculateTime(route.distance / 1000, 'driving');
                const address = formatAmenityAddress(route.destination?.tags);

                return (
                  <div
                    key={`${route.destination?.id || idx}`}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {idx + 1}. {route.destination?.name || 'Unknown'}
                      </div>
                      <div className="text-xs text-slate-500">{formatDistance(route.distance)}</div>
                    </div>
                    {address && <div className="mt-1 text-xs text-slate-500">{address}</div>}
                    <div className="mt-2 text-xs text-slate-600">
                      Walk {formatDuration(walkingMinutes)} | Drive {formatDuration(drivingMinutes)}
                      {route.isEstimate && <span className="ml-2 text-amber-600">Estimated</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {hasEstimates && (
        <p className="text-xs text-amber-700">
          Estimated times are used when routing is unavailable.
        </p>
      )}
    </div>
  );
};

const HousePlanner: React.FC = () => {
  const { location: userLocation, error: geolocationError } = useGeolocation();
  const [searchAddress, setSearchAddress] = useState('');
  const [confirmedSearchAddress, setConfirmedSearchAddress] = useState('');
  const [predictions, setPredictions] = useState<PredictionOption[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [amenityMarkers, setAmenityMarkers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [isLoadingAmenities, setIsLoadingAmenities] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [amenitiesError, setAmenitiesError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<Record<string, boolean>>(
    amenityOrder.reduce((acc, key) => ({ ...acc, [key]: false }), {})
  );
  const [numAmenities, setNumAmenities] = useState(DEFAULT_NUM_AMENITIES);
  const [isClient, setIsClient] = useState(false);
  const selectedAmenityCount = Object.values(selectedAmenities).filter(Boolean).length;
  const hasSelectedAmenities = selectedAmenityCount > 0;

  const mapRef = useRef<LeafletMap | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTokenRef = useRef(0);
  const reverseGeocodeTokenRef = useRef(0);
  const predictionAbortRef = useRef<AbortController | null>(null);
  const predictionRequestRef = useRef(0);
  const positionstackEnabledRef = useRef(Boolean(POSITIONSTACK_ACCESS_KEY));

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    document.body.classList.toggle('map-fullscreen-active', isMapFullscreen);
    return () => {
      document.body.classList.remove('map-fullscreen-active');
    };
  }, [isClient, isMapFullscreen]);

  const setLocationAndClear = useCallback((lat: number, lon: number) => {
    searchTokenRef.current += 1;
    reverseGeocodeTokenRef.current += 1;
    setSelectedLocation([lat, lon]);
    setMarkerPosition([lat, lon]);
    setAmenityMarkers([]);
    setRoutes([]);
    setAmenitiesError(null);
    setConfirmedSearchAddress('');
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    const token = reverseGeocodeTokenRef.current;
    const fallbackLabel = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: lat.toString(),
        lon: lon.toString(),
        zoom: '18',
        addressdetails: '1',
      });
      const resp = await fetch(`${NOMINATIM_API}/reverse?${params.toString()}`, {
        headers: NOMINATIM_HEADERS,
      });
      if (!resp.ok) throw new Error('Reverse geocoding failed');
      const data = await resp.json();
      if (token !== reverseGeocodeTokenRef.current) return;
      const nextAddress = formatAddress(data) || fallbackLabel;
      setSearchAddress(nextAddress);
      setConfirmedSearchAddress(nextAddress);
    } catch {
      if (token !== reverseGeocodeTokenRef.current) return;
      setSearchAddress(fallbackLabel);
      setConfirmedSearchAddress(fallbackLabel);
    }
  }, []);

  const searchPlaces = useCallback(async (searchText: string, limit = 6, signal?: AbortSignal) => {
    const params = new URLSearchParams({
      format: 'jsonv2',
      q: searchText,
      limit: limit.toString(),
      addressdetails: '1',
    });
    const res = await fetch(`${NOMINATIM_API}/search?${params.toString()}`, {
      headers: NOMINATIM_HEADERS,
      signal,
    });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? (data as Place[]) : [];
  }, []);

  const normalizeNominatimPredictions = useCallback((results: Place[]): PredictionOption[] => {
    return results.map((result, idx): PredictionOption => {
      const displayName = result.display_name || '';
      const [mainPart, ...secondaryParts] = displayName.split(',');
      const lat = Number(result.lat);
      const lon = Number(result.lon);

      return {
        id: String(result.place_id || `${displayName}-${idx}`),
        primaryText: mainPart?.trim() || displayName,
        secondaryText: secondaryParts.join(',').trim(),
        label: formatAddress(result) || displayName,
        source: 'nominatim' as const,
        coordinates: Number.isFinite(lat) && Number.isFinite(lon) ? ([lat, lon] as [number, number]) : undefined,
      };
    });
  }, []);

  const normalizePositionstackPredictions = useCallback(
    (results: any[]): PredictionOption[] => {
      return results.map((result: any, idx: number): PredictionOption => {
        const label = typeof result?.label === 'string' ? result.label : '';
        const primaryText =
          typeof result?.name === 'string' && result.name.trim()
            ? result.name.trim()
            : label.split(',')[0]?.trim() || label;
        const secondaryText =
          label && label.startsWith(primaryText)
            ? label.slice(primaryText.length).replace(/^,\s*/, '').trim()
            : '';
        const lat = Number(result?.latitude);
        const lon = Number(result?.longitude);

        return {
          id: String(result?.id || result?.label || `${primaryText}-${idx}`),
          primaryText,
          secondaryText,
          label: label || primaryText,
          source: 'positionstack' as const,
          coordinates: Number.isFinite(lat) && Number.isFinite(lon) ? ([lat, lon] as [number, number]) : undefined,
        };
      });
    },
    []
  );

  const searchPredictionsPositionstack = useCallback(
    async (searchText: string, signal?: AbortSignal) => {
      const params = new URLSearchParams({
        access_key: POSITIONSTACK_ACCESS_KEY,
        query: searchText,
        limit: '6',
      });

      const res = await fetch(`${POSITIONSTACK_API}/forward?${params.toString()}`, { signal });
      const data = await res.json().catch(() => null);
      const message = getPositionstackErrorMessage(data);

      if (!res.ok || message) {
        throw new PositionstackError(
          message || `Positionstack search failed: ${res.status}`,
          isPositionstackQuotaError(data, res.status)
        );
      }

      const results = getPositionstackResults(data);
      return normalizePositionstackPredictions(results);
    },
    [normalizePositionstackPredictions]
  );

  const searchPositionstackSingle = useCallback(
    async (query: string) => {
      const params = new URLSearchParams({
        access_key: POSITIONSTACK_ACCESS_KEY,
        query,
        limit: '1',
      });

      const res = await fetch(`${POSITIONSTACK_API}/forward?${params.toString()}`);
      const data = await res.json().catch(() => null);
      const message = getPositionstackErrorMessage(data);

      if (!res.ok || message) {
        throw new PositionstackError(
          message || `Positionstack search failed: ${res.status}`,
          isPositionstackQuotaError(data, res.status)
        );
      }

      const result = getPositionstackResults(data)[0] ?? null;
      const lat = Number(result?.latitude);
      const lon = Number(result?.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      const label =
        (typeof result?.label === 'string' && result.label) ||
        (typeof result?.name === 'string' && result.name) ||
        `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

      return {
        label,
        coordinates: [lat, lon] as [number, number],
      };
    },
    []
  );

  const handlePositionstackFailure = useCallback((error: unknown) => {
    if (error instanceof PositionstackError && error.isQuotaError) {
      positionstackEnabledRef.current = false;
      console.warn('Positionstack quota reached. Falling back to Nominatim search.');
      return;
    }

    if (error instanceof Error) {
      console.warn('Positionstack search failed. Falling back to Nominatim.', error.message);
    }
  }, []);

  const applyResolvedLocation = useCallback(
    ({ label, coordinates }: SearchResolution) => {
      const [lat, lon] = coordinates;
      setLocationAndClear(lat, lon);
      setSearchAddress(label);
      setConfirmedSearchAddress(label);
      setPredictions([]);
      setSearchError(null);
    },
    [setLocationAndClear]
  );

  const fetchPredictions = useCallback(
    async (searchText: string) => {
      if (!searchText || searchText.length < 2) {
        predictionAbortRef.current?.abort();
        setPredictions([]);
        return;
      }
      const requestId = ++predictionRequestRef.current;
      predictionAbortRef.current?.abort();
      const controller = new AbortController();
      predictionAbortRef.current = controller;

      try {
        let results: PredictionOption[] = [];

        if (positionstackEnabledRef.current) {
          try {
            results = await searchPredictionsPositionstack(searchText, controller.signal);
          } catch (error) {
            handlePositionstackFailure(error);
            results = [];
          }
        }

        if (!results.length) {
          results = normalizeNominatimPredictions(await searchPlaces(searchText, 6, controller.signal));
        }

        if (requestId !== predictionRequestRef.current) return;
        setPredictions(results);
      } catch {
        if (controller.signal.aborted || requestId !== predictionRequestRef.current) return;
        setPredictions([]);
      }
    },
    [handlePositionstackFailure, normalizeNominatimPredictions, searchPlaces, searchPredictionsPositionstack]
  );

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      predictionAbortRef.current?.abort();
    };
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setSearchAddress(value);
      setSearchError(null);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (!value || value.trim().length < 2) {
        predictionAbortRef.current?.abort();
        setPredictions([]);
        return;
      }
      searchTimeoutRef.current = setTimeout(() => {
        fetchPredictions(value.trim());
      }, 350);
    },
    [fetchPredictions]
  );

  const handlePredictionSelect = useCallback(
    async (prediction: PredictionOption) => {
      setIsSearchingAddress(true);
      setSearchError(null);
      try {
        if (prediction.coordinates) {
          applyResolvedLocation({
            label: prediction.label,
            coordinates: prediction.coordinates,
          });
          return;
        }

        setSearchError('Search failed. Please try again.');
      } catch {
        setSearchError('Search failed. Please try again.');
      } finally {
        setIsSearchingAddress(false);
      }
    },
    [applyResolvedLocation]
  );

  const handleDismissPredictions = useCallback(() => {
    setPredictions([]);
  }, []);

  const handleManualSearch = useCallback(async () => {
    const query = searchAddress.trim();
    if (!query) return;
    setIsSearchingAddress(true);
    setSearchError(null);
    try {
      let resolution: SearchResolution | null = null;

      if (positionstackEnabledRef.current) {
        try {
          resolution = await searchPositionstackSingle(query);
        } catch (error) {
          handlePositionstackFailure(error);
        }
      }

      if (resolution) {
        applyResolvedLocation(resolution);
        return;
      }

      const results = await searchPlaces(query, 1);
      if (!results.length || !results[0]?.lat || !results[0]?.lon) {
        setSearchError('No matches found. Try a broader search.');
        return;
      }
      const lat = Number(results[0].lat);
      const lon = Number(results[0].lon);
      applyResolvedLocation({
        label: formatAddress(results[0]) || `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        coordinates: [lat, lon],
      });
    } catch {
      setSearchError('Search failed. Please try again.');
    } finally {
      setIsSearchingAddress(false);
    }
  }, [applyResolvedLocation, handlePositionstackFailure, searchAddress, searchPlaces, searchPositionstackSingle]);

  const fetchNearbyAmenities = useCallback(
    async (lat: number, lon: number, amenityType: string) => {
      const queryTag = amenityTags[amenityType];
      const baseRadius = Math.max(radius, 500);
      const radii = [baseRadius, Math.min(baseRadius * 2, 50000), Math.min(baseRadius * 4, 50000)];

      const fetchData = async (searchRadius: number) => {
        const query = `
          [out:json][timeout:25];
          (
            node[${queryTag}](around:${searchRadius},${lat},${lon});
            way[${queryTag}](around:${searchRadius},${lat},${lon});
            relation[${queryTag}](around:${searchRadius},${lat},${lon});
          );
          out center;
        `;

        const response = await fetch(OVERPASS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
        });

        if (!response.ok) {
          const errorText = await response.text();
          const message = errorText.includes('Too Many Requests') || errorText.includes('rate limit')
            ? 'Amenity search is being rate limited. Please wait a moment and try again.'
            : 'Amenity search failed. Please try again.';
          throw new Error(message);
        }

        return response.json();
      };

      try {
        let data: any = null;
        for (const searchRadius of radii) {
          data = await fetchData(searchRadius);
          if (data?.elements?.length >= numAmenities) break;
        }

        if (!data?.elements?.length) return [];

        return data.elements
          .map((element: any) => {
            const elemLat = element.lat || element.center?.lat;
            const elemLon = element.lon || element.center?.lon;

            if (!elemLat || !elemLon || !element.tags) return null;

            const name =
              element.tags.name ||
              element.tags.brand ||
              element.tags.operator ||
              `${amenityType} (No name)`;

            return {
              position: [elemLat, elemLon],
              name,
              tags: element.tags,
              distance: calculateDirectDistance(lat, lon, elemLat, elemLon),
              type: amenityType,
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => a.distance - b.distance)
          .slice(0, numAmenities);
      } catch (error) {
        setAmenitiesError((error as Error).message);
        return [];
      }
    },
    [numAmenities, radius]
  );

  const performAmenitySearch = useCallback(async () => {
    if (!selectedLocation) return;
    const [lat, lon] = selectedLocation;
    const activeTypes = amenityOrder.filter((type) => selectedAmenities[type]);
    const token = ++searchTokenRef.current;

    setIsLoadingAmenities(true);
    setAmenityMarkers([]);
    setRoutes([]);
    setAmenitiesError(null);

    if (!activeTypes.length) {
      setIsLoadingAmenities(false);
      return;
    }

    try {
      const results = await Promise.all(
        activeTypes.map((type) => fetchNearbyAmenities(lat, lon, type))
      );

      if (token !== searchTokenRef.current) return;

      const markers = results.flatMap((amenities) => {
        return amenities.map((amenity: any, index: number) => {
          const id = `${amenity.type}-${amenity.position[0]}-${amenity.position[1]}-${index}`;
          return {
            ...amenity,
            id,
            number: index + 1,
            color: amenityColors[amenity.type],
          };
        });
      });

      setAmenityMarkers(markers);

      const routeResults: any[] = [];
      for (let i = 0; i < markers.length; i += 1) {
        const amenity = markers[i];
        const route = await getRoute(selectedLocation, amenity.position);
        if (token !== searchTokenRef.current) return;
        routeResults.push({
          ...route,
          type: amenity.type,
          color: amenity.color,
          destination: amenity,
        });
        if (i < markers.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, ROUTE_REQUEST_DELAY));
        }
      }

      setRoutes(routeResults);
    } catch (error) {
      setAmenitiesError((error as Error).message);
    } finally {
      if (token === searchTokenRef.current) {
        setIsLoadingAmenities(false);
      }
    }
  }, [fetchNearbyAmenities, selectedAmenities, selectedLocation]);

  const handleMapClick = useCallback(
    async (e: { latlng: { lat: number; lng: number } }) => {
      const { lat, lng } = e.latlng;
      setSearchError(null);
      setLocationAndClear(lat, lng);
      await reverseGeocode(lat, lng);
    },
    [reverseGeocode, setLocationAndClear]
  );

  const handleUseMyLocation = useCallback(async () => {
    if (!userLocation) return;
    const [lat, lon] = userLocation;
    setSearchError(null);
    setLocationAndClear(lat, lon);
    await reverseGeocode(lat, lon);
  }, [reverseGeocode, setLocationAndClear, userLocation]);

  const handleReset = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTokenRef.current += 1;
    predictionAbortRef.current?.abort();
    setSelectedLocation(null);
    setMarkerPosition(null);
    setAmenityMarkers([]);
    setRoutes([]);
    setSearchAddress('');
    setConfirmedSearchAddress('');
    setPredictions([]);
    setSelectedAmenities(amenityOrder.reduce((acc, key) => ({ ...acc, [key]: false }), {}));
    setNumAmenities(DEFAULT_NUM_AMENITIES);
    setRadius(DEFAULT_RADIUS);
    setAmenitiesError(null);
    setSearchError(null);
    setIsLoadingAmenities(false);
  }, []);

  const handleToggleAmenity = useCallback((type: string) => {
    setSelectedAmenities((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const toggleMapFullscreen = useCallback(() => {
    setIsMapFullscreen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (userLocation && !selectedLocation) {
      const [lat, lon] = userLocation;
      setLocationAndClear(lat, lon);
      reverseGeocode(lat, lon);
    }
  }, [reverseGeocode, selectedLocation, setLocationAndClear, userLocation]);

  useEffect(() => {
    if (selectedLocation && Object.values(selectedAmenities).some(Boolean)) {
      performAmenitySearch();
    }
  }, [performAmenitySearch, radius, selectedAmenities, selectedLocation]);

  useEffect(() => {
    if (!mapRef.current) return;
    const timeout = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 150);
    return () => clearTimeout(timeout);
  }, [isMapFullscreen]);

  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 px-3 py-3 sm:px-4 sm:py-4 lg:flex-row lg:gap-6 lg:px-6 lg:py-6">
        <aside
          className={clsx(
            'panel order-2 flex flex-col gap-4 overflow-visible p-4 sm:gap-5 sm:p-5 lg:order-1 lg:w-[400px] lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:p-6',
            {
              hidden: isMapFullscreen,
            }
          )}
        >
          <header className="space-y-2 reveal reveal-delay-1">
            <div className="text-[10px] uppercase tracking-[0.32em] text-slate-500 sm:text-[11px]">
              House Planner
            </div>
            <h1 className="font-display text-3xl leading-none text-slate-900 sm:text-4xl">
              Plan your area
            </h1>
            <p className="max-w-md text-sm leading-6 text-slate-600">
              Pick a home location, choose the amenities you care about, then compare nearby options.
            </p>
          </header>

          <section className="panel-section relative z-10 space-y-4 reveal reveal-delay-2">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                1. Choose a location
              </div>
              <p className="text-xs leading-5 text-slate-500">
                Search for an address, use your current location, or tap the map.
              </p>
            </div>
            {selectedLocation && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Selected location</div>
                <div className="mt-1 text-sm font-semibold leading-5 text-slate-900">
                  {confirmedSearchAddress || `${selectedLocation[0].toFixed(4)}, ${selectedLocation[1].toFixed(4)}`}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {selectedLocation[0].toFixed(4)}, {selectedLocation[1].toFixed(4)}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Search location
              </div>
              <AddressInput
                address={searchAddress}
                onChange={handleInputChange}
                predictions={predictions}
                onSelect={handlePredictionSelect}
                onDismissPredictions={handleDismissPredictions}
                onReset={handleReset}
                onSearch={handleManualSearch}
                isSearching={isSearchingAddress}
              />
            </div>
            {searchError && <p className="text-xs text-rose-600">{searchError}</p>}
            <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="btn-secondary flex min-h-11 items-center justify-center gap-2"
                disabled={!userLocation}
              >
                <LocateFixed className="h-4 w-4" />
                Use my location
              </button>
              {geolocationError && <span className="text-rose-600">{geolocationError}</span>}
            </div>
          </section>

          <section className="panel-section relative z-0 space-y-4 reveal reveal-delay-3">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                2. Choose what to compare
              </div>
              <p className="text-xs leading-5 text-slate-500">
                Set the search radius and select the amenities you want to see.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span>Radius</span>
                <span className="text-slate-700">{(radius / 1000).toFixed(1)} km</span>
              </div>
              <input
                type="range"
                min="500"
                max="5000"
                step="100"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <p className="text-xs leading-5 text-slate-500">
                Smaller radius shows closer options. Larger radius shows more choices.
              </p>
            </div>

            <AmenityControls
              numAmenities={numAmenities}
              setNumAmenities={setNumAmenities}
              selectedAmenities={selectedAmenities}
              toggleAmenity={handleToggleAmenity}
              amenityColors={amenityColors}
            />
          </section>

          {selectedLocation && (
            <section className="panel-section space-y-3 reveal reveal-delay-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  3. Search
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  Choose at least one amenity, then search nearby places.
                </p>
              </div>
              <button
                type="button"
                onClick={performAmenitySearch}
                disabled={isLoadingAmenities || !hasSelectedAmenities}
                className="btn-primary w-full"
              >
                {isLoadingAmenities ? 'Searching amenities...' : 'Find nearby amenities'}
              </button>
              {!hasSelectedAmenities && (
                <p className="text-xs text-slate-500">Select one or more amenity types to continue.</p>
              )}
            </section>
          )}

          {amenitiesError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {amenitiesError}
            </div>
          )}

          {routes.length > 0 && (
            <div className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Results
            </div>
          )}

          <AmenitiesList routes={routes} />
        </aside>

        <section className="relative order-1 flex-1 lg:order-2">
          <div className="mb-3 flex items-center justify-between gap-3 px-1 lg:hidden">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Map Preview</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {selectedLocation ? 'Tap markers to inspect routes' : 'Search or tap the map to begin'}
              </div>
            </div>
            <div className="rounded-full bg-white/85 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
              {amenityMarkers.length} pins
            </div>
          </div>
          <div
            className={clsx(
              'relative overflow-hidden lg:rounded-[2.25rem]',
              {
                'map-card map-stage h-[52svh] min-h-[360px] sm:h-[58svh] lg:h-[calc(100vh-3rem)]': !isMapFullscreen,
                'map-card-fullscreen fixed inset-0 z-50 h-screen w-screen': isMapFullscreen,
              }
            )}
          >
            {isClient ? (
              <DynamicMap
                selectedLocation={selectedLocation}
                amenityMarkers={amenityMarkers}
                radius={radius}
                setMapRef={(map: LeafletMap) => {
                  mapRef.current = map;
                }}
                onMapClick={handleMapClick}
                markerPosition={markerPosition}
                routes={routes}
                isLoading={isLoadingAmenities}
                isFullscreen={isMapFullscreen}
              />
            ) : (
              <div className="map-skeleton flex h-full items-center justify-center text-sm text-slate-500">
                Loading map...
              </div>
            )}
            <button
              onClick={toggleMapFullscreen}
              className="absolute right-3 top-3 z-[500] rounded-full bg-white/90 p-2.5 text-slate-700 shadow-md transition hover:bg-white sm:right-4 sm:top-4"
              title={isMapFullscreen ? 'Exit fullscreen' : 'View fullscreen map'}
              type="button"
            >
              {isMapFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HousePlanner;
