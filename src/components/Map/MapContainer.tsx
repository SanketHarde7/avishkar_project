'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Station, GridPoint, PointPrediction } from '@/types';
import { Loader2 } from 'lucide-react';

interface MapContainerProps {
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

// Dynamically import Leaflet with SSR disabled to prevent `window is not defined`
const DynamicMapViewInternal = dynamic(
  () => import('./MapViewInternal').then((mod) => mod.MapViewInternal),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-950 text-neutral-500 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        <div className="text-xs font-medium text-neutral-400">Loading map…</div>
      </div>
    ),
  }
);

export const MapContainer: React.FC<MapContainerProps> = (props) => {
  return <DynamicMapViewInternal {...props} />;
};

export default MapContainer;
