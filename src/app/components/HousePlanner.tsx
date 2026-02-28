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
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

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
  predictions: Place[];
  onSelect: (prediction: Place) => void;
  onReset: () => void;
  onSearch: () => void;
  isSearching: boolean;
}

const AddressInput: React.FC<AddressInputProps> = ({
  address,
  onChange,
  predictions,
  onSelect,
  onReset,
  onSearch,
  isSearching,
}) => (
  <div className="relative" style={{ zIndex: 10000 }}>
    <div className="relative">
      <input
        type="text"
        value={address}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch();
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

    {predictions?.length > 0 && (
      <div className="predictions-dropdown absolute mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl">
        {predictions.map((prediction, idx) => {
          const displayName = prediction.display_name || '';
          const [mainPart, ...secondaryParts] = displayName.split(',');
          return (
            <button
              key={`${prediction.place_id || idx}`}
              onClick={() => onSelect(prediction)}
              className="w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-amber-50"
              type="button"
            >
              <div className="text-sm font-semibold text-slate-900">
                {highlightMatch(mainPart, address)}
              </div>
              {secondaryParts.length > 0 && (
                <div className="mt-1 text-xs text-slate-500">
                  {highlightMatch(secondaryParts.join(','), address)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    )}
  </div>
);

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
  const [predictions, setPredictions] = useState<Place[]>([]);
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

  const mapRef = useRef<LeafletMap | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTokenRef = useRef(0);

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
    setSelectedLocation([lat, lon]);
    setMarkerPosition([lat, lon]);
    setAmenityMarkers([]);
    setRoutes([]);
    setAmenitiesError(null);
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
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
      setSearchAddress(formatAddress(data) || `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    } catch {
      setSearchAddress(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    }
  }, []);

  const searchPlaces = useCallback(async (searchText: string, limit = 6) => {
    const params = new URLSearchParams({
      format: 'jsonv2',
      q: searchText,
      limit: limit.toString(),
      addressdetails: '1',
    });
    const res = await fetch(`${NOMINATIM_API}/search?${params.toString()}`, {
      headers: NOMINATIM_HEADERS,
    });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? (data as Place[]) : [];
  }, []);

  const fetchPredictions = useCallback(
    async (searchText: string) => {
      if (!searchText || searchText.length < 2) {
        setPredictions([]);
        return;
      }
      try {
        const results = await searchPlaces(searchText, 6);
        setPredictions(results);
      } catch {
        setPredictions([]);
      }
    },
    [searchPlaces]
  );

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setSearchAddress(value);
      setSearchError(null);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (!value || value.trim().length < 2) {
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
    (prediction: Place) => {
      if (!prediction?.lat || !prediction?.lon) return;
      const lat = Number(prediction.lat);
      const lon = Number(prediction.lon);
      setSearchAddress(formatAddress(prediction));
      setPredictions([]);
      setSearchError(null);
      setLocationAndClear(lat, lon);
    },
    [setLocationAndClear]
  );

  const handleManualSearch = useCallback(async () => {
    const query = searchAddress.trim();
    if (!query) return;
    setIsSearchingAddress(true);
    setSearchError(null);
    try {
      const results = await searchPlaces(query, 1);
      if (!results.length) {
        setSearchError('No matches found. Try a broader search.');
        return;
      }
      handlePredictionSelect(results[0]);
    } catch {
      setSearchError('Search failed. Please try again.');
    } finally {
      setIsSearchingAddress(false);
    }
  }, [searchAddress, searchPlaces, handlePredictionSelect]);

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
    setSelectedLocation(null);
    setMarkerPosition(null);
    setAmenityMarkers([]);
    setRoutes([]);
    setSearchAddress('');
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
            'panel order-2 flex flex-col gap-4 overflow-visible p-4 sm:gap-5 sm:p-5 lg:order-1 lg:w-[420px] lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:p-6',
            {
              hidden: isMapFullscreen,
            }
          )}
        >
          <header className="space-y-3 reveal reveal-delay-1">
            <div className="text-[10px] uppercase tracking-[0.32em] text-slate-500 sm:text-[11px]">
              House Planner
            </div>
            <h1 className="font-display text-[2rem] leading-tight text-slate-900 sm:text-4xl">
              Design your daily radius
            </h1>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              Compare walking and driving access to essentials before you pick a place to live.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span className="rounded-full bg-white/80 px-3 py-2 shadow-sm">Tap map to drop home</span>
              <span className="rounded-full bg-white/80 px-3 py-2 shadow-sm">Review routes instantly</span>
            </div>
          </header>

          <section className="panel-section sticky top-3 z-20 space-y-3 reveal reveal-delay-2">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Search location
            </div>
            <AddressInput
              address={searchAddress}
              onChange={handleInputChange}
              predictions={predictions}
              onSelect={handlePredictionSelect}
              onReset={handleReset}
              onSearch={handleManualSearch}
              isSearching={isSearchingAddress}
            />
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
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50/85 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Radius</div>
                <div className="mt-1 font-semibold text-slate-900">{(radius / 1000).toFixed(1)} km</div>
              </div>
              <div className="rounded-2xl bg-slate-50/85 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Filters</div>
                <div className="mt-1 font-semibold text-slate-900">{selectedAmenityCount} active</div>
              </div>
              <div className="col-span-2 rounded-2xl bg-slate-50/85 px-3 py-3 sm:col-span-1">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Results</div>
                <div className="mt-1 font-semibold text-slate-900">{routes.length} routes ready</div>
              </div>
            </div>
          </section>

          {selectedLocation && (
            <section className="panel-section space-y-3 reveal reveal-delay-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span>Discovery radius</span>
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
              <p className="text-xs text-slate-500">
                Pull the radius tighter for walkable options or widen it to compare more.
              </p>
            </section>
          )}

          <section className="panel-section reveal reveal-delay-3">
            <AmenityControls
              numAmenities={numAmenities}
              setNumAmenities={setNumAmenities}
              selectedAmenities={selectedAmenities}
              toggleAmenity={handleToggleAmenity}
              amenityColors={amenityColors}
            />
          </section>

          {selectedLocation && (
            <section className="panel-section sticky bottom-3 space-y-2 reveal reveal-delay-4">
              <button
                type="button"
                onClick={performAmenitySearch}
                disabled={isLoadingAmenities || !selectedAmenityCount}
                className="btn-primary w-full"
              >
                {isLoadingAmenities ? 'Searching amenities...' : 'Find nearby amenities'}
              </button>
              <p className="text-xs text-slate-500">
                Changing amenity filters or counts refreshes the results automatically.
              </p>
            </section>
          )}

          {amenitiesError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {amenitiesError}
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
              'relative overflow-hidden',
              {
                'map-card h-[52svh] min-h-[360px] sm:h-[58svh] lg:h-[calc(100vh-3rem)]': !isMapFullscreen,
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
