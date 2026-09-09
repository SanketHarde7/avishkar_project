'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMapEvents, CircleMarker, useMap, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Station, GridPoint, PointPrediction } from '@/types';
import { StationMarkers } from './StationMarkers';
import { Column3DLayer } from './Column3DLayer';
import { HeatmapLayer } from './HeatmapLayer';
import { WindOverlay } from './WindOverlay';
import { Layers } from 'lucide-react';
import { StreetSearchBar } from '../Search/StreetSearchBar';

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
  userLocation?: [number, number] | null;
  onSelectCoordinates: (lat: number, lon: number) => void;
  onSelectStation: (station: Station) => void;
  onSelectStreet?: (lat: number, lon: number, name: string) => void;
  onDetectLocation?: () => void;
  isLocating?: boolean;
}

// Controller to smoothly update map view when center/zoom changes (e.g. switching cities or locating user)
const MapViewController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { animate: true, duration: 1.2 });
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
  userLocation,
  onSelectCoordinates,
  onSelectStation,
  onSelectStreet,
  onDetectLocation,
  isLocating = false,
}) => {
  const [layerMode, setLayerMode] = useState<'2d' | '25d' | 'both'>('both');

  return (
    <div className="relative w-full h-full bg-background select-none overflow-hidden">
      {/* Street & Neighborhood Search Bar HUD (Floating Center-Top) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-lg px-4 pointer-events-auto">
        <StreetSearchBar
          onSelectLocation={onSelectStreet || onSelectCoordinates}
          onDetectLocation={onDetectLocation || (() => {})}
          isLocating={isLocating}
        />
      </div>

      {/* Layer Mode Switcher HUD (2D Heatmap / 2.5D Columns / Hybrid) */}
      <div className="absolute top-4 right-4 z-[1000] flex items-center bg-surface/95 backdrop-blur-sm border border-border p-1 rounded-[6px] text-xs pointer-events-auto">
        <div className="flex items-center gap-1 px-1.5 text-text-muted">
          <Layers className="w-3.5 h-3.5 text-text-secondary" />
          <span className="hidden sm:inline text-[11px] font-medium">Layer:</span>
        </div>
        <button
          onClick={() => setLayerMode('2d')}
          className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
            layerMode === '2d'
              ? 'bg-surface-raised text-accent border border-border-strong'
              : 'text-text-muted hover:text-text-primary'
          }`}
          title="2D Continuous PINN Advection Heatmap"
        >
          2D Field
        </button>
        <button
          onClick={() => setLayerMode('25d')}
          className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
            layerMode === '25d'
              ? 'bg-surface-raised text-accent border border-border-strong'
              : 'text-text-muted hover:text-text-primary'
          }`}
          title="2.5D Extruded Vertical Columns (Height = Pollution)"
        >
          2.5D Columns
        </button>
        <button
          onClick={() => setLayerMode('both')}
          className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
            layerMode === 'both'
              ? 'bg-surface-raised text-accent border border-border-strong'
              : 'text-text-muted hover:text-text-primary'
          }`}
          title="Combined 2D Heatmap and 2.5D Columns"
        >
          Hybrid
        </button>
      </div>

      {/* Wind and Advection Vector HUD */}
      <WindOverlay
        windSpeedKmh={windSpeedKmh}
        windDirectionDeg={windDirectionDeg}
        u={u}
        v={v}
      />

      {/* Map Legend Overlay matching continuous color ramp */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-surface/95 backdrop-blur-sm border border-border text-text-primary p-3 rounded-[2px] text-xs space-y-1.5 pointer-events-auto">
        <div className="panel-label">Predicted AQI field</div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10b981]" />
          <span className="text-text-secondary tnum">0–50 Good</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#84cc16]" />
          <span className="text-text-secondary tnum">51–100 Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
          <span className="text-text-secondary tnum">101–150 Poor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f97316]" />
          <span className="text-text-secondary tnum">151–200 Unhealthy</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <span className="text-text-secondary tnum">201+ Severe</span>
        </div>

        {isJudgeMode && (
          <div className="pt-2 mt-1.5 border-t border-border">
            <div className="flex items-center gap-2 text-[11px] text-text-secondary">
              <span className="w-2 h-2 rounded-full border border-dashed border-text-muted bg-border-strong" />
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
        style={{ background: '#f2efe9' }}
      >
        <MapViewController center={center} zoom={zoom} />
        <MapClickHandler onSelect={onSelectCoordinates} />

        {/* Rich CARTO Voyager Light Basemap (Streets, Blue Water, Place Labels) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${process.env.NEXT_PUBLIC_CARTO_API_KEY || 'cb1_33jf_1_abaefa1200bd283175014d1c' ? `?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY || 'cb1_33jf_1_abaefa1200bd283175014d1c'}` : ''}`}
          subdomains={['a', 'b', 'c', 'd']}
          maxZoom={20}
        />

        {/* Smooth Continuous PINN Gradient Image Overlay */}
        {(layerMode === '2d' || layerMode === 'both') && <HeatmapLayer grid={grid} />}

        {/* 2D Flat CPCB Ground Truth Station Markers */}
        {layerMode === '2d' && (
          <StationMarkers
            stations={stations}
            isJudgeMode={isJudgeMode}
            onSelectStation={onSelectStation}
          />
        )}

        {/* 2.5D Extruded Isometric Station Columns (Height = Pollution) */}
        {(layerMode === '25d' || layerMode === 'both') && (
          <Column3DLayer
            stations={stations}
            onSelectStation={onSelectStation}
          />
        )}

        {/* User Geolocation Pin ("You Are Here") */}
        {userLocation && (
          <>
            <CircleMarker
              center={userLocation}
              radius={20}
              pathOptions={{
                color: '#0284c7',
                weight: 1.5,
                dashArray: '3, 3',
                fillColor: '#0284c7',
                fillOpacity: 0.15,
              }}
              interactive={false}
            />
            <CircleMarker
              center={userLocation}
              radius={6}
              pathOptions={{
                color: '#0f172a',
                weight: 2,
                fillColor: '#0284c7',
                fillOpacity: 1,
              }}
              interactive={false}
            />
          </>
        )}

        {/* Highlight User-Selected Inspection Coordinate — Precision Reticle */}
        {selectedPrediction && (
          <>
            <CircleMarker
              center={[selectedPrediction.lat, selectedPrediction.lon]}
              radius={18}
              pathOptions={{
                color: '#b45309',
                weight: 1.5,
                dashArray: '4, 4',
                fillColor: '#f59e0b',
                fillOpacity: 0.2,
              }}
              interactive={false}
            />
            <CircleMarker
              center={[selectedPrediction.lat, selectedPrediction.lon]}
              radius={6}
              pathOptions={{
                color: '#0f172a',
                weight: 2,
                fillColor: '#f59e0b',
                fillOpacity: 1,
              }}
            >
              {selectedPrediction.street_name && (
                <Tooltip permanent direction="top" offset={[0, -10]} opacity={0.95}>
                  <div className="bg-surface text-text-primary px-2 py-1 rounded-[2px] text-[11px] font-medium border border-accent/60 shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span>{selectedPrediction.street_name}</span>
                    <span className="font-mono text-accent font-semibold ml-1">AQI {selectedPrediction.predicted_aqi}</span>
                  </div>
                </Tooltip>
              )}
            </CircleMarker>
          </>
        )}
      </MapContainer>
    </div>
  );
};

