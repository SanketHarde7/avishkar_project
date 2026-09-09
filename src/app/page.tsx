'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { MapContainer } from '@/components/Map/MapContainer';
import { Inspector } from '@/components/Sidebar/Inspector';
import { TimelineSlider } from '@/components/TimelineSlider';
import { UnderTheHoodView } from '@/components/Developer/UnderTheHoodView';
import {
  CITIES,
  PUNE_STATIONS,
  BENCHMARK_METRICS,
  getPredictionForPoint,
} from '@/lib/mockData';
import {
  fetchStations,
  fetchGridSlice,
  predictPoint,
  fetchBenchmark,
} from '@/lib/api';
import {
  CityOption,
  Station,
  PointPrediction,
  ForecastSlice,
  ValidationMetrics,
} from '@/types';

export default function DashboardPage() {
  // Global Viewport & Mode States
  const [activeTab, setActiveTab] = useState<'monitor' | 'under_the_hood'>('monitor');
  const [selectedCity, setSelectedCity] = useState<CityOption>(CITIES[0]);
  const [currentHourOffset, setCurrentHourOffset] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // User Geolocation State
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Data States
  const [stations, setStations] = useState<Station[]>(PUNE_STATIONS);
  const [currentSlice, setCurrentSlice] = useState<ForecastSlice | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<ValidationMetrics>(BENCHMARK_METRICS);

  // Selected Spatial Point Prediction (Initialized to Shivajinagar coordinate)
  const [selectedPrediction, setSelectedPrediction] = useState<PointPrediction | null>(null);

  // Load initial data on mount
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

      // Default selected inspection point: Shivajinagar, Pune
      const initialPrediction = getPredictionForPoint(18.5314, 73.8446, 0);
      setSelectedPrediction(initialPrediction);
    }

    loadInitialData();
  }, []);

  // Handle forecast hour offset change
  const handleSelectHourOffset = useCallback(
    async (hour: number) => {
      setCurrentHourOffset(hour);
      const slice = await fetchGridSlice(hour);
      setCurrentSlice(slice);

      // Update current inspection point prediction for the newly selected hour
      if (selectedPrediction) {
        const updated = await predictPoint(
          selectedPrediction.lat,
          selectedPrediction.lon,
          hour
        );
        setSelectedPrediction(updated);
      }
    },
    [selectedPrediction]
  );

  // Handle click on map canvas
  const handleSelectCoordinates = useCallback(
    async (lat: number, lon: number) => {
      const prediction = await predictPoint(lat, lon, currentHourOffset);
      setSelectedPrediction(prediction);
    },
    [currentHourOffset]
  );

  // Handle click on specific station pin
  const handleSelectStation = useCallback(
    async (st: Station) => {
      const prediction = await predictPoint(st.lat, st.lon, currentHourOffset);
      setSelectedPrediction(prediction);
    },
    [currentHourOffset]
  );

  // Handle selection of a specific street / neighborhood from search
  const handleSelectStreet = useCallback(
    async (lat: number, lon: number, streetName: string) => {
      setSelectedCity((prev) => ({
        ...prev,
        name: streetName,
        center: [lat, lon],
        zoom: 15,
      }));
      const pred = await predictPoint(lat, lon, currentHourOffset);
      setSelectedPrediction({
        ...pred,
        street_name: streetName,
      });
    },
    [currentHourOffset]
  );

  // User Geolocation Detection Handler ("My Location")
  const handleDetectLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(4));
        const lon = parseFloat(position.coords.longitude.toFixed(4));
        setUserLocation([lat, lon]);
        setIsLocating(false);

        // Center map on user location
        setSelectedCity((prev) => ({
          ...prev,
          name: 'Your Current Location',
          center: [lat, lon],
          zoom: 14,
        }));

        // Execute instant on-demand live PINN point prediction
        const livePred = await predictPoint(lat, lon, currentHourOffset);
        setSelectedPrediction({
          ...livePred,
          street_name: 'Your Current Location',
        });
      },
      (err) => {
        console.warn('Geolocation failed or denied, centering on central Pune:', err);
        setIsLocating(false);
        // Graceful fallback to Shivajinagar, Pune
        handleSelectCoordinates(18.5314, 73.8446);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, [currentHourOffset, handleSelectCoordinates]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-text-primary">
      {/* 3.1 Global Top Bar with Tab Switcher and Location Detection */}
      <Navbar
        selectedCity={selectedCity}
        onSelectCity={(city) => {
          setSelectedCity(city);
          handleSelectCoordinates(city.center[0], city.center[1]);
        }}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onDetectLocation={handleDetectLocation}
        isLocating={isLocating}
      />

      {/* Main Content: Either Under-The-Hood Developer View or Live Monitor Dashboard */}
      {activeTab === 'under_the_hood' ? (
        <main className="flex-1 overflow-hidden relative">
          <UnderTheHoodView onBackToMonitor={() => setActiveTab('monitor')} />
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
                stations={stations}
                grid={currentSlice?.grid || []}
                selectedPrediction={selectedPrediction}
                isJudgeMode={false}
                windSpeedKmh={currentSlice?.wind_speed_kmh || 12.5}
                windDirectionDeg={currentSlice?.wind_direction_deg || 245}
                u={currentSlice?.u || -3.14}
                v={currentSlice?.v || -1.46}
                userLocation={userLocation}
                onSelectCoordinates={handleSelectCoordinates}
                onSelectStation={handleSelectStation}
                onSelectStreet={handleSelectStreet}
                onDetectLocation={handleDetectLocation}
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
