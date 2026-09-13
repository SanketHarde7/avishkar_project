'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMapEvents, CircleMarker, useMap, Tooltip, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Station, GridPoint, PointPrediction } from '@/types';
import { StationMarkers } from './StationMarkers';
import { Column3DLayer } from './Column3DLayer';
import { HeatmapLayer } from './HeatmapLayer';
import { WindOverlay } from './WindOverlay';
import { Layers } from 'lucide-react';
import { StreetSearchBar } from '../Search/StreetSearchBar';
import { getAqiColor } from '@/lib/mockData';

interface MapViewInternalProps {
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]];
  stations: Station[];
  grid: GridPoint[];
  selectedPrediction: PointPrediction | null;
  isJudgeMode: boolean;
  windSpeedKmh: number;
  windDirectionDeg: number;
  u: number;
  v: number;
  windLocationLabel?: string;
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
  const lastTargetRef = React.useRef<{ lat: number; lon: number; zoom: number } | null>(null);

  useEffect(() => {
    const [targetLat, targetLon] = center;
    const prev = lastTargetRef.current;

    // Only animate if the center coordinate actually changed from the last requested programmatic target
    const isNewCoord = !prev || Math.abs(prev.lat - targetLat) > 0.001 || Math.abs(prev.lon - targetLon) > 0.001;
    const isNewZoom = !prev || prev.zoom !== zoom;

    if (isNewCoord || isNewZoom) {
      lastTargetRef.current = { lat: targetLat, lon: targetLon, zoom };
      map.flyTo([targetLat, targetLon], zoom, { animate: true, duration: 1.0 });
    }
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
  bounds,
  stations,
  grid,
  selectedPrediction,
  isJudgeMode,
  windSpeedKmh,
  windDirectionDeg,
  u,
  v,
  windLocationLabel,
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
      {/* Wind and Advection Vector HUD (Top Left, no collision with zoom buttons) */}
      <WindOverlay
        windSpeedKmh={windSpeedKmh}
        windDirectionDeg={windDirectionDeg}
        u={u}
        v={v}
        locationLabel={windLocationLabel}
      />

      {/* Street & Neighborhood Search Bar HUD (Floating Center-Top, bounded away from left/right widgets) */}
      <div className="absolute top-3 left-[140px] right-[150px] sm:left-[155px] sm:right-[170px] md:left-[170px] md:right-[210px] lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-md z-[1000] pointer-events-auto">
        <StreetSearchBar
          onSelectLocation={onSelectStreet || onSelectCoordinates}
          onDetectLocation={onDetectLocation || (() => { })}
          isLocating={isLocating}
        />
      </div>

      {/* Layer Mode Switcher HUD (2D Heatmap / 2.5D Columns / Hybrid) */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center bg-[#0f1117]/95 backdrop-blur-md border border-slate-700/80 p-1 rounded-lg text-xs pointer-events-auto shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
        <div className="hidden lg:flex items-center gap-1 px-2 text-slate-300 font-semibold">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px]">Layer:</span>
        </div>
        <button
          onClick={() => setLayerMode('2d')}
          className={`px-2.5 py-1 rounded-[6px] font-semibold transition-all text-xs ${layerMode === '2d'
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          title="2D Continuous PINN Advection Heatmap"
        >
          <span className="hidden sm:inline">2D Field</span>
          <span className="sm:hidden">2D</span>
        </button>
        <button
          onClick={() => setLayerMode('25d')}
          className={`px-2.5 py-1 rounded-[6px] font-semibold transition-all text-xs ${layerMode === '25d'
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          title="2.5D Extruded Vertical Columns (Height = Pollution)"
        >
          <span className="hidden sm:inline">2.5D Columns</span>
          <span className="sm:hidden">3D</span>
        </button>
        <button
          onClick={() => setLayerMode('both')}
          className={`px-2.5 py-1 rounded-[6px] font-semibold transition-all text-xs ${layerMode === 'both'
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          title="Combined 2D Heatmap and 2.5D Columns"
        >
          Hybrid
        </button>
      </div>

      {/* Map Legend Overlay matching continuous color ramp */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-[#0f1117]/95 backdrop-blur-md border border-slate-700/80 text-white p-3 rounded-lg text-xs space-y-1.5 pointer-events-auto shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
        <div className="text-[10px] font-bold text-slate-300 tracking-wide uppercase">Predicted AQI field</div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-sm" />
          <span className="text-slate-200 font-medium tnum">0–50 Good</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#84cc16] shadow-sm" />
          <span className="text-slate-200 font-medium tnum">51–100 Satisfactory</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] shadow-sm" />
          <span className="text-slate-200 font-medium tnum">101–200 Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] shadow-sm" />
          <span className="text-slate-200 font-medium tnum">201–300 Poor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-sm" />
          <span className="text-slate-200 font-medium tnum">301–400 Very Poor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#881337] shadow-sm" />
          <span className="text-slate-200 font-medium tnum">401+ Severe</span>
        </div>

        {isJudgeMode && (
          <div className="pt-2 mt-1.5 border-t border-slate-700">
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-400 bg-slate-700" />
              <span>Withheld test sensor</span>
            </div>
          </div>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        style={{ background: '#f2efe9' }}
      >
        <ZoomControl position="bottomright" />
        <MapViewController center={center} zoom={zoom} />
        <MapClickHandler onSelect={onSelectCoordinates} />

        {/* Rich CARTO Voyager Light Basemap (Streets, Blue Water, Place Labels) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          // below statement may be wrong so please reverify that and in root env file enter the api as NEXT_PUBLIC_CARTO_API_KEY=api_key and if 
          // still errr then use condition as { : || ?}...
          url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${process.env.NEXT_PUBLIC_CARTO_API_KEY}`}
          subdomains={['a', 'b', 'c', 'd']}
          maxZoom={20}
        />

        {/* Smooth Continuous PINN Gradient Image Overlay */}
        {(layerMode === '2d' || layerMode === 'both') && (
          <HeatmapLayer
            grid={grid}
            bounds={bounds}
            stations={stations}
            windSpeedKmh={windSpeedKmh}
            windDirectionDeg={windDirectionDeg}
            u={u}
            v={v}
            center={center}
          />
        )}

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
        {selectedPrediction && (() => {
          const reticleColor = getAqiColor(selectedPrediction.predicted_aqi);
          return (
            <>
              <CircleMarker
                center={[selectedPrediction.lat, selectedPrediction.lon]}
                radius={18}
                pathOptions={{
                  color: reticleColor,
                  weight: 2,
                  dashArray: '4, 4',
                  fillColor: reticleColor,
                  fillOpacity: 0.22,
                }}
                interactive={false}
              />
              <CircleMarker
                center={[selectedPrediction.lat, selectedPrediction.lon]}
                radius={6}
                pathOptions={{
                  color: '#0f172a',
                  weight: 2,
                  fillColor: reticleColor,
                  fillOpacity: 1,
                }}
              >
                {selectedPrediction.street_name && (
                  <Tooltip permanent direction="top" offset={[0, -10]} opacity={0.95}>
                    <div
                      className="bg-surface text-text-primary px-2.5 py-1 rounded-[4px] text-[11px] font-medium shadow-xl flex items-center gap-1.5 whitespace-nowrap"
                      style={{ border: `1px solid ${reticleColor}80` }}
                    >
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: reticleColor }} />
                      <span>{selectedPrediction.street_name}</span>
                      <span className="font-mono font-bold ml-1" style={{ color: reticleColor }}>
                        AQI {selectedPrediction.predicted_aqi}
                      </span>
                    </div>
                  </Tooltip>
                )}
              </CircleMarker>
            </>
          );
        })()}
      </MapContainer>
    </div>
  );
};

