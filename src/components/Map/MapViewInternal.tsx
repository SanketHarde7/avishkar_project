'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Station, GridPoint, PointPrediction } from '@/types';
import { StationMarkers } from './StationMarkers';
import { HeatmapLayer } from './HeatmapLayer';
import { WindOverlay } from './WindOverlay';

interface MapViewInternalProps {
  center: [number, number];
  zoom: number;
  stations: Station[];
  grid: GridPoint[];
  selectedPrediction: PointPrediction | null;
  isJudgeMode: boolean;
  windSpeedKmh: number;
  windDirectionDeg: number;
  u: number;
  v: number;
  onSelectCoordinates: (lat: number, lon: number) => void;
  onSelectStation: (station: Station) => void;
}

// Controller to smoothly update map view when center/zoom changes (e.g. switching cities)
const MapViewController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
};

// Map click listener hook to perform continuous spatial inference anywhere on canvas
const MapClickHandler: React.FC<{ onSelect: (lat: number, lon: number) => void }> = ({ onSelect }) => {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const MapViewInternal: React.FC<MapViewInternalProps> = ({
  center,
  zoom,
  stations,
  grid,
  selectedPrediction,
  isJudgeMode,
  windSpeedKmh,
  windDirectionDeg,
  u,
  v,
  onSelectCoordinates,
  onSelectStation,
}) => {
  return (
    <div className="relative w-full h-full bg-neutral-950 select-none overflow-hidden">
      {/* Wind and Advection Vector HUD */}
      <WindOverlay
        windSpeedKmh={windSpeedKmh}
        windDirectionDeg={windDirectionDeg}
        u={u}
        v={v}
      />

      {/* Map Legend Overlay matching continuous color ramp */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-neutral-900/90 backdrop-blur-sm border border-neutral-800 text-neutral-200 p-3 rounded-md shadow-lg text-xs space-y-1.5 pointer-events-auto">
        <div className="panel-label">Predicted AQI field</div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10b981]" />
          <span className="text-neutral-400 tnum">0–50 Good</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#84cc16]" />
          <span className="text-neutral-400 tnum">51–100 Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
          <span className="text-neutral-400 tnum">101–150 Poor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f97316]" />
          <span className="text-neutral-400 tnum">151–200 Unhealthy</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <span className="text-neutral-400 tnum">201+ Severe</span>
        </div>

        {isJudgeMode && (
          <div className="pt-2 mt-1.5 border-t border-neutral-800">
            <div className="flex items-center gap-2 text-[11px] text-neutral-300">
              <span className="w-2 h-2 rounded-full border border-dashed border-neutral-400 bg-neutral-700" />
              <span>Withheld test sensor</span>
            </div>
          </div>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        style={{ background: '#101012' }}
      >
        <MapViewController center={center} zoom={zoom} />
        <MapClickHandler onSelect={onSelectCoordinates} />

        {/* Reliable Keyless Esri World Dark Gray Basemap (No API key, No watermark) */}
        <TileLayer
          attribution='&copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />

        {/* Smooth Continuous PINN Gradient Image Overlay */}
        <HeatmapLayer grid={grid} />

        {/* CPCB Ground Truth Station Markers on top */}
        <StationMarkers
          stations={stations}
          isJudgeMode={isJudgeMode}
          onSelectStation={onSelectStation}
        />

        {/* Highlight User-Selected Inspection Coordinate */}
        {selectedPrediction && (
          <>
            <CircleMarker
              center={[selectedPrediction.lat, selectedPrediction.lon]}
              radius={20}
              pathOptions={{
                color: '#38bdf8',
                weight: 2,
                dashArray: '4, 4',
                fillColor: '#0284c7',
                fillOpacity: 0.25,
              }}
              interactive={false}
            />
            <CircleMarker
              center={[selectedPrediction.lat, selectedPrediction.lon]}
              radius={7}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                fillColor: '#38bdf8',
                fillOpacity: 1,
              }}
              interactive={false}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
};
