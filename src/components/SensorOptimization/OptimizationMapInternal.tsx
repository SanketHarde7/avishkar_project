'use client';

import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Tooltip,
  Popup,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Station, GridPoint, SensorRecommendation } from '@/types';
import { HeatmapLayer } from '../Map/HeatmapLayer';

interface OptimizationMapInternalProps {
  center: [number, number];
  zoom: number;
  stations: Station[];
  grid: GridPoint[];
  recommendations: SensorRecommendation[];
  selectedRank: number | null;
  onSelectRecommendation: (rank: number) => void;
  networkMode: 'current' | 'optimized';
  showHeatmap: boolean;
  showCoverageRings: boolean;
  focusTarget: [number, number] | null;
}

// Controller to smoothly pan and zoom to target coordinates
const MapViewController: React.FC<{ focusTarget: [number, number] | null }> = ({ focusTarget }) => {
  const map = useMap();
  const lastTargetRef = React.useRef<[number, number] | null>(null);

  useEffect(() => {
    if (focusTarget) {
      const prev = lastTargetRef.current;
      if (!prev || Math.abs(prev[0] - focusTarget[0]) > 0.0005 || Math.abs(prev[1] - focusTarget[1]) > 0.0005) {
        lastTargetRef.current = focusTarget;
        map.flyTo(focusTarget, 13, { animate: true, duration: 1.0 });
      }
    }
  }, [focusTarget, map]);
  return null;
};

// Factory for numbered deployment badges
const createRecommendationIcon = (rank: number, isSelected: boolean) => {
  return L.divIcon({
    className: 'custom-recommendation-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: ${
          isSelected ? 'rgba(201, 162, 75, 0.45)' : 'rgba(201, 162, 75, 0.2)'
        }; filter: blur(2px);"></div>
        <div style="
          position: relative;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: -0.02em;
          box-shadow: 0 4px 12px rgba(0,0,0,0.6);
          transition: all 0.2s ease;
          background: ${isSelected ? '#c9a24b' : '#202226'};
          color: ${isSelected ? '#121316' : '#c9a24b'};
          border: 2px solid ${isSelected ? '#f3d38c' : '#c9a24b'};
          transform: ${isSelected ? 'scale(1.15)' : 'scale(1.0)'};
        ">
          ${String(rank).padStart(2, '0')}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

// Factory for existing physical station markers
const createExistingStationIcon = () => {
  return L.divIcon({
    className: 'custom-existing-station-marker',
    html: `
      <div style="
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #191a1e;
        border: 2px solid #9a9ea6;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <div style="width: 4px; height: 4px; border-radius: 50%; background: #9a9ea6;"></div>
      </div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

export const OptimizationMapInternal: React.FC<OptimizationMapInternalProps> = ({
  center,
  zoom,
  stations,
  grid,
  recommendations,
  selectedRank,
  onSelectRecommendation,
  networkMode,
  showHeatmap,
  showCoverageRings,
  focusTarget,
}) => {
  const activeStations = stations.filter((s) => s.status !== 'hidden_for_validation');
  const existingIcon = React.useMemo(() => createExistingStationIcon(), []);

  return (
    <div className="relative w-full h-full bg-background select-none overflow-hidden">
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        className="w-full h-full bg-background"
        minZoom={10}
        maxZoom={16}
      >
        <MapViewController focusTarget={focusTarget} />

        {/* Dark Matter CartoDB Base Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
          opacity={0.88}
        />

        {/* PINN Continuous Advection Heatmap Layer */}
        {showHeatmap && <HeatmapLayer grid={grid} visible={true} />}

        {/* 3 km Coverage Radius Rings */}
        {showCoverageRings && (
          <>
            {/* Baseline Station Coverage Circles (3 km radius) */}
            {activeStations.map((st) => (
              <Circle
                key={`coverage-base-${st.station_id}`}
                center={[st.lat, st.lon]}
                radius={3000}
                pathOptions={{
                  color: '#64748b',
                  weight: 1,
                  fillColor: '#64748b',
                  fillOpacity: networkMode === 'optimized' ? 0.04 : 0.08,
                  dashArray: '2, 3',
                }}
              />
            ))}

            {/* Recommended Sensor Coverage Circles (Only visible in Optimized mode) */}
            {networkMode === 'optimized' &&
              recommendations.map((rec) => {
                const isSelected = selectedRank === rec.rank;
                return (
                  <Circle
                    key={`coverage-rec-${rec.rank}`}
                    center={[rec.lat, rec.lon]}
                    radius={3000}
                    pathOptions={{
                      color: isSelected ? '#eab308' : '#c9a24b',
                      weight: isSelected ? 2 : 1.5,
                      fillColor: '#c9a24b',
                      fillOpacity: isSelected ? 0.22 : 0.14,
                      dashArray: '4, 4',
                    }}
                  />
                );
              })}
          </>
        )}

        {/* Existing Ground Stations */}
        {activeStations.map((st) => (
          <Marker
            key={`st-${st.station_id}`}
            position={[st.lat, st.lon]}
            icon={existingIcon}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
              <div className="bg-surface text-text-primary px-2.5 py-1.5 rounded-[2px] text-xs border border-border">
                <div className="font-semibold text-text-secondary">{st.name}</div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  Active CPCB Station · AQI {st.aqi} · {st.pm25} µg/m³
                </div>
              </div>
            </Tooltip>

            <Popup className="custom-leaflet-popup">
              <div className="p-1 min-w-[200px] text-text-primary font-sans text-xs">
                <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                  Active Monitoring Station
                </div>
                <div className="text-sm font-bold text-text-primary mt-0.5">{st.name}</div>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border">
                  <div>
                    <div className="text-text-muted text-[10px]">Recorded AQI</div>
                    <div className="text-base font-bold text-text-primary tnum">{st.aqi}</div>
                  </div>
                  <div>
                    <div className="text-text-muted text-[10px]">PM2.5</div>
                    <div className="text-base font-bold text-text-primary tnum">{st.pm25} µg/m³</div>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-text-muted">
                  Coordinates: {st.lat.toFixed(4)}°N, {st.lon.toFixed(4)}°E
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Recommended Deployment Locations (Shown when in Optimized mode) */}
        {networkMode === 'optimized' &&
          recommendations.map((rec) => {
            const isSelected = selectedRank === rec.rank;
            const recIcon = createRecommendationIcon(rec.rank, isSelected);

            return (
              <Marker
                key={`rec-${rec.rank}`}
                position={[rec.lat, rec.lon]}
                icon={recIcon}
                zIndexOffset={isSelected ? 1000 : 500}
                eventHandlers={{
                  click: () => onSelectRecommendation(rec.rank),
                }}
              >
                <Tooltip direction="top" offset={[0, -16]} opacity={0.98} permanent={isSelected}>
                  <div className="bg-surface text-text-primary px-2.5 py-1.5 rounded-[4px] text-xs border border-accent/60 shadow-lg">
                    <div className="font-bold flex items-center gap-1.5 text-accent">
                      <span>Recommendation #{String(rec.rank).padStart(2, '0')}</span>
                      <span className="bg-accent/20 px-1 py-0.5 rounded text-[10px] font-mono">
                        Score {rec.priority_score}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-secondary mt-0.5 tnum">
                      Predicted PM2.5: <span className="font-semibold text-text-primary">{rec.predicted_pm25} µg/m³</span> (AQI {rec.predicted_aqi})
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">
                      Nearest sensor: {rec.nearest_station_km} km away
                    </div>
                  </div>
                </Tooltip>

                <Popup className="custom-leaflet-popup">
                  <div className="p-1 min-w-[220px] text-text-primary font-sans text-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 bg-accent/20 text-accent font-bold rounded text-[10px]">
                        OPTIMAL SITE #{String(rec.rank).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-accent font-bold">
                        {rec.priority_score}/100
                      </span>
                    </div>

                    <div className="mt-2 text-sm font-bold text-text-primary">
                      {rec.lat.toFixed(4)}°N, {rec.lon.toFixed(4)}°E
                    </div>

                    <p className="mt-1 text-[11px] text-text-secondary leading-snug">
                      {rec.explanation}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border">
                      <div>
                        <div className="text-text-muted text-[10px]">Predicted PM2.5</div>
                        <div className="text-base font-bold text-text-primary tnum">
                          {rec.predicted_pm25} µg/m³
                        </div>
                      </div>
                      <div>
                        <div className="text-text-muted text-[10px]">Monitoring Gap</div>
                        <div className="text-base font-bold text-accent tnum">
                          {rec.nearest_station_km} km
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-1 border-t border-border text-[10px] text-text-muted flex justify-between">
                      <span>Nearest Station</span>
                      <span className="font-medium text-text-secondary">{rec.nearest_station_name}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};
