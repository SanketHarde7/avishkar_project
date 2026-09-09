'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { MapContainer } from '@/components/Map/MapContainer';
import { Inspector } from '@/components/Sidebar/Inspector';
import { TimelineSlider } from '@/components/TimelineSlider';
import { UnderTheHoodView } from '@/components/Developer/UnderTheHoodView';
import { SensorOptimizationView } from '@/components/SensorOptimization/SensorOptimizationView';
import {
  CITIES,
  PUNE_STATIONS,
  BENCHMARK_METRICS,
  getPredictionForPoint,
  generateSpatialGrid,
} from '@/lib/mockData';
import {
  fetchStations,
  fetchGridSlice,
  predictPoint,
  fetchBenchmark,
} from '@/lib/api';
import { reverseGeocode } from '@/lib/geocoding';
import {
  CityOption,
  Station,
  PointPrediction,
  ForecastSlice,
  ValidationMetrics,
} from '@/types';
import { AlertCircle, CheckCircle2, MapPin, X } from 'lucide-react';

export default function DashboardPage() {
  // Global Viewport & Mode States
  const [activeTab, setActiveTab] = useState<'monitor' | 'sensor_optimization' | 'under_the_hood'>('monitor');
  const [selectedCity, setSelectedCity] = useState<CityOption>(CITIES[0]);
  const [currentHourOffset, setCurrentHourOffset] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // User Geolocation State
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationNotice, setLocationNotice] = useState<{ type: 'info' | 'success' | 'warn'; message: string } | null>(null);

  // Data States
  const [stations, setStations] = useState<Station[]>(PUNE_STATIONS);
  const [currentSlice, setCurrentSlice] = useState<ForecastSlice | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<ValidationMetrics>(BENCHMARK_METRICS);

  // Selected Spatial Point Prediction
  const [selectedPrediction, setSelectedPrediction] = useState<PointPrediction | null>(null);

  // Active Wind State for the Current Session / Inspected Location
  const [activeWind, setActiveWind] = useState<{
    windSpeedKmh: number;
    windDirectionDeg: number;
    u: number;
    v: number;
    locationLabel: string;
  }>({
    windSpeedKmh: 12.5,
    windDirectionDeg: 245,
    u: -3.14,
    v: -1.46,
    locationLabel: 'Pune Center',
  });

  // Ref to track if geolocation was auto-triggered
  const autoDetectTriggered = useRef<boolean>(false);

  // Helper to re-grid for given coordinates
  const updateGridForCoordinates = useCallback((lat: number, lon: number, hour: number, slice?: ForecastSlice | null) => {
    const u = slice?.u || -3.14;
    const v = slice?.v || -1.46;
    const dynamicGrid = generateSpatialGrid(hour, u, v, lat, lon);
    setCurrentSlice((prev) => {
      if (!prev) return null;
      return { ...prev, grid: dynamicGrid };
    });
  }, []);

  // Primary Geolocation Detector (with High Accuracy & Network Fallback)
  const detectUserLocation = useCallback(async (isSilent = false) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      if (!isSilent) {
        setLocationNotice({
          type: 'warn',
          message: 'Geolocation is not supported by your browser.',
        });
      }
      return;
    }

    setIsLocating(true);
    if (!isSilent) {
      setLocationNotice({
        type: 'info',
        message: 'Detecting your high-precision device location...',
      });
    }

    const getPosition = (enableHighAccuracy: boolean, timeoutMs: number): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy,
          timeout: timeoutMs,
          maximumAge: 30000,
        });
      });
    };

    let position: GeolocationPosition | null = null;

    // Step 1: Try high accuracy (GPS / precise WiFi triangulation)
    try {
      position = await getPosition(true, 10000);
    } catch (err: any) {
      console.warn('High accuracy geolocation timed out or unavailable, trying network fallback:', err);
      // Step 2: Fallback to standard network/IP geolocation if GPS timed out
      try {
        position = await getPosition(false, 8000);
      } catch (fallbackErr: any) {
        console.warn('Network geolocation also failed:', fallbackErr);
        setIsLocating(false);
        if (!isSilent) {
          setLocationNotice({
            type: 'warn',
            message: 'Location access is blocked or timed out. Search your city or area above.',
          });
        }
        return;
      }
    }

    if (!position) {
      setIsLocating(false);
      return;
    }

    const lat = parseFloat(position.coords.latitude.toFixed(4));
    const lon = parseFloat(position.coords.longitude.toFixed(4));
    setUserLocation([lat, lon]);
    setIsLocating(false);

    // Step 3: Reverse geocode coordinates across Pan-India to get actual human-readable name
    const addr = await reverseGeocode(lat, lon);
    const placeName = addr.name || `${lat.toFixed(3)}° N, ${lon.toFixed(3)}° E`;

    // Step 4: Update map viewport & selected city
    const customCity: CityOption = {
      id: `loc_${lat.toFixed(3)}_${lon.toFixed(3)}`,
      name: placeName,
      center: [lat, lon],
      zoom: 14,
      bounds: [
        [lat - 0.1, lon - 0.1],
        [lat + 0.1, lon + 0.1],
      ],
    };
    setSelectedCity(customCity);

    // Save in localStorage so returning visitors stay at their location
    try {
      localStorage.setItem('airaware_user_loc', JSON.stringify({ lat, lon, name: placeName }));
    } catch {}

    // Step 5: Execute instant physics inference for detected coordinate
    const livePred = await predictPoint(lat, lon, currentHourOffset);
    setSelectedPrediction({
      ...livePred,
      street_name: placeName,
    });
    if (livePred.weather) {
      setActiveWind({
        windSpeedKmh: livePred.weather.wind_speed_kmh,
        windDirectionDeg: livePred.weather.wind_direction_deg,
        u: livePred.weather.u,
        v: livePred.weather.v,
        locationLabel: placeName || 'Your Location',
      });
    }

    // Step 6: Generate dynamic PINN spatial heatmap grid centered on user coordinates
    updateGridForCoordinates(lat, lon, currentHourOffset, currentSlice);

    setLocationNotice({
      type: 'success',
      message: `Centered on your location: ${placeName}`,
    });

    // Auto-dismiss success notice after 5 seconds
    setTimeout(() => {
      setLocationNotice((prev) => (prev?.type === 'success' ? null : prev));
    }, 5000);
  }, [currentHourOffset, currentSlice, updateGridForCoordinates]);

  // Load initial data on mount & auto-detect location
  useEffect(() => {
    async function loadInitialData() {
      const [fetchedStations, initialSlice, initialBenchmark] = await Promise.all([
        fetchStations(),
        fetchGridSlice(0),
        fetchBenchmark(),
      ]);

      setStations(fetchedStations);
      setCurrentSlice(initialSlice);
      setBenchmarkData(initialBenchmark);

      // Clean up any stale stuck geolocation
      try {
        localStorage.removeItem('airaware_user_loc');
      } catch {}

      // Default initial inspection point: Shivajinagar, Pune
      const initialPrediction = getPredictionForPoint(18.5314, 73.8446, 0);
      setSelectedPrediction(initialPrediction);
      if (initialSlice) {
        setActiveWind({
          windSpeedKmh: initialSlice.wind_speed_kmh,
          windDirectionDeg: initialSlice.wind_direction_deg,
          u: initialSlice.u,
          v: initialSlice.v,
          locationLabel: 'Pune Center',
        });
      }
    }

    loadInitialData();
  }, []);

  // Live synchronization: auto-update 3D station bars & spatial heatmap every 2 minutes (120s)
  useEffect(() => {
    const liveSyncTimer = setInterval(async () => {
      try {
        console.log('[LiveSync] Fetching 2-minute live station and spatial grid update...');
        const [freshStations, freshSlice] = await Promise.all([
          fetchStations(),
          fetchGridSlice(currentHourOffset),
        ]);

        if (freshStations && freshStations.length > 0) {
          setStations(freshStations);
        }

        if (freshSlice && freshSlice.grid && freshSlice.grid.length > 0) {
          setCurrentSlice(freshSlice);
          if (freshSlice.wind_speed_kmh) {
            setActiveWind((prev) => ({
              ...prev,
              windSpeedKmh: freshSlice.wind_speed_kmh,
              windDirectionDeg: freshSlice.wind_direction_deg,
              u: freshSlice.u,
              v: freshSlice.v,
            }));
          }
        }

        // If a point is currently inspected, update its prediction to stay live-synced
        if (selectedPrediction) {
          const freshPred = await predictPoint(
            selectedPrediction.lat,
            selectedPrediction.lon,
            currentHourOffset
          );
          setSelectedPrediction((prev) => {
            if (!prev) return null;
            return {
              ...freshPred,
              street_name: prev.street_name,
            };
          });
        }
      } catch (err) {
        console.warn('[LiveSync] 2-minute live refresh failed:', err);
      }
    }, 120000); // 120,000 ms = 2 minutes

    return () => clearInterval(liveSyncTimer);
  }, [currentHourOffset, selectedPrediction]);

  // Handle forecast hour offset change
  const handleSelectHourOffset = useCallback(
    async (hour: number) => {
      setCurrentHourOffset(hour);
      const slice = await fetchGridSlice(hour);

      // Immediately sync city-wide wind vectors from the forecast slice
      if (slice && slice.wind_speed_kmh !== undefined) {
        setActiveWind((prev) => ({
          ...prev,
          windSpeedKmh: slice.wind_speed_kmh,
          windDirectionDeg: slice.wind_direction_deg,
          u: slice.u,
          v: slice.v,
        }));
      }

      // Use high-fidelity ONNX PINN spatial grid for Pune; generate dynamic grid for other cities
      const centerLat = selectedCity.center[0];
      const centerLon = selectedCity.center[1];
      const dynamicGrid = (selectedCity.id === 'pune' && slice.grid && slice.grid.length > 0)
        ? slice.grid
        : generateSpatialGrid(hour, slice.u, slice.v, centerLat, centerLon);
      setCurrentSlice({ ...slice, grid: dynamicGrid });

      // Update current inspection point prediction for the newly selected hour
      if (selectedPrediction) {
        const updated = await predictPoint(
          selectedPrediction.lat,
          selectedPrediction.lon,
          hour
        );
        setSelectedPrediction({
          ...updated,
          street_name: selectedPrediction.street_name,
        });
        if (updated.weather) {
          setActiveWind((prev) => ({
            ...prev,
            windSpeedKmh: updated.weather.wind_speed_kmh,
            windDirectionDeg: updated.weather.wind_direction_deg,
            u: updated.weather.u,
            v: updated.weather.v,
          }));
        }
      }
    },
    [selectedCity, selectedPrediction]
  );

  // Handle click on map canvas (reverse geocode clicked point across India)
  const handleSelectCoordinates = useCallback(
    async (lat: number, lon: number) => {
      const prediction = await predictPoint(lat, lon, currentHourOffset);
      setSelectedPrediction(prediction);
      if (prediction.weather) {
        setActiveWind({
          windSpeedKmh: prediction.weather.wind_speed_kmh,
          windDirectionDeg: prediction.weather.wind_direction_deg,
          u: prediction.weather.u,
          v: prediction.weather.v,
          locationLabel: 'Selected Point',
        });
      }

      // Asynchronously resolve locality name for precision inspector readout
      const addr = await reverseGeocode(lat, lon);
      setSelectedPrediction((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          street_name: addr.name,
        };
      });
      if (addr.name) {
        setActiveWind((prev) => ({
          ...prev,
          locationLabel: addr.name,
        }));
      }
    },
    [currentHourOffset]
  );

  // Handle click on specific station pin
  const handleSelectStation = useCallback(
    async (st: Station) => {
      const prediction = await predictPoint(st.lat, st.lon, currentHourOffset);
      setSelectedPrediction({
        ...prediction,
        street_name: st.name,
      });
      if (prediction.weather) {
        setActiveWind({
          windSpeedKmh: prediction.weather.wind_speed_kmh,
          windDirectionDeg: prediction.weather.wind_direction_deg,
          u: prediction.weather.u,
          v: prediction.weather.v,
          locationLabel: st.name,
        });
      }
    },
    [currentHourOffset]
  );

  // Handle selection of a specific street / neighborhood from Pan-India search
  const handleSelectStreet = useCallback(
    async (lat: number, lon: number, streetName: string) => {
      const newCity: CityOption = {
        id: `search_${lat.toFixed(3)}_${lon.toFixed(3)}`,
        name: streetName,
        center: [lat, lon],
        zoom: 14,
        bounds: [
          [lat - 0.1, lon - 0.1],
          [lat + 0.1, lon + 0.1],
        ],
      };
      setSelectedCity(newCity);

      // Regenerate dynamic grid for newly searched location
      updateGridForCoordinates(lat, lon, currentHourOffset, currentSlice);

      const pred = await predictPoint(lat, lon, currentHourOffset);
      setSelectedPrediction({
        ...pred,
        street_name: streetName,
      });
      if (pred.weather) {
        setActiveWind({
          windSpeedKmh: pred.weather.wind_speed_kmh,
          windDirectionDeg: pred.weather.wind_direction_deg,
          u: pred.weather.u,
          v: pred.weather.v,
          locationLabel: streetName,
        });
      }

      // Cache this search location as user preference
      try {
        localStorage.setItem('airaware_user_loc', JSON.stringify({ lat, lon, name: streetName }));
      } catch {}
    },
    [currentHourOffset, currentSlice, updateGridForCoordinates]
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-text-primary">
      {/* 3.1 Global Top Bar with Tab Switcher and Location Detection */}
      <Navbar
        selectedCity={selectedCity}
        onSelectCity={(city) => {
          setSelectedCity(city);
          handleSelectCoordinates(city.center[0], city.center[1]);
          updateGridForCoordinates(city.center[0], city.center[1], currentHourOffset, currentSlice);
        }}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onDetectLocation={() => detectUserLocation(false)}
        isLocating={isLocating}
      />

      {/* Non-intrusive Pan-India Location Toast / Notice */}
      {locationNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1100] max-w-md w-full px-4 animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto">
          <div
            className={`flex items-center justify-between gap-3 px-3.5 py-2 rounded-[6px] text-xs shadow-xl border backdrop-blur-md ${
              locationNotice.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800/80'
                : locationNotice.type === 'warn'
                ? 'bg-amber-950/90 text-amber-200 border-amber-800/80'
                : 'bg-surface/95 text-text-primary border-border'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {locationNotice.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              ) : locationNotice.type === 'warn' ? (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-accent animate-pulse flex-shrink-0" />
              )}
              <span className="truncate">{locationNotice.message}</span>
            </div>
            <button
              onClick={() => setLocationNotice(null)}
              className="text-text-muted hover:text-text-primary p-0.5 rounded transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content: Under-The-Hood, Sensor Optimization Planner, or Live Monitor Dashboard */}
      {activeTab === 'under_the_hood' ? (
        <main className="flex-1 overflow-hidden relative">
          <UnderTheHoodView onBackToMonitor={() => setActiveTab('monitor')} />
        </main>
      ) : activeTab === 'sensor_optimization' ? (
        <main className="flex-1 overflow-hidden relative">
          <SensorOptimizationView
            initialStations={stations}
            initialGrid={currentSlice?.grid || []}
            selectedCity={selectedCity}
            onBackToMonitor={() => setActiveTab('monitor')}
          />
        </main>
      ) : (
        <>
          {/* 3.2 Main Viewport Grid (Left 70% Map, Right 30% Sidebar) */}
          <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            {/* Interactive Map Canvas (70% width on desktop) */}
            <section className="flex-1 md:w-[70%] h-full relative overflow-hidden">
              <MapContainer
                center={selectedCity.center}
                zoom={selectedCity.zoom}
                bounds={selectedCity.bounds}
                stations={stations}
                grid={currentSlice?.grid || []}
                selectedPrediction={selectedPrediction}
                isJudgeMode={false}
                windSpeedKmh={activeWind.windSpeedKmh}
                windDirectionDeg={activeWind.windDirectionDeg}
                u={activeWind.u}
                v={activeWind.v}
                windLocationLabel={activeWind.locationLabel}
                userLocation={userLocation}
                onSelectCoordinates={handleSelectCoordinates}
                onSelectStation={handleSelectStation}
                onSelectStreet={handleSelectStreet}
                onDetectLocation={() => detectUserLocation(false)}
                isLocating={isLocating}
              />
            </section>

            {/* Inspector Sidebar (30% width on desktop) */}
            <section className="w-full md:w-[30%] md:min-w-[360px] md:max-w-[440px] h-full overflow-hidden border-t md:border-t-0 md:border-l border-border bg-surface z-10">
              <Inspector
                prediction={selectedPrediction}
                isJudgeMode={false}
                benchmarkData={benchmarkData}
                selectedCityName={selectedCity.name}
              />
            </section>
          </main>

          {/* 3.3 Bottom Spatiotemporal Timeline (Height: 64px) */}
          <TimelineSlider
            currentHourOffset={currentHourOffset}
            onSelectHourOffset={handleSelectHourOffset}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((prev) => !prev)}
          />
        </>
      )}
    </div>
  );
}
