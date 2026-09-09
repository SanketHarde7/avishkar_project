'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Station, GridPoint, SensorRecommendation } from '@/types';
import { Loader2 } from 'lucide-react';

interface OptimizationMapProps {
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

const DynamicOptimizationMapInternal = dynamic(
  () =>
    import('./OptimizationMapInternal').then(
      (mod) => mod.OptimizationMapInternal
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-background text-text-muted gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-accent" />
        <div className="text-xs font-medium text-text-secondary tracking-wide">
          Rendering spatial optimization map…
        </div>
      </div>
    ),
  }
);

export const OptimizationMap: React.FC<OptimizationMapProps> = (props) => {
  return <DynamicOptimizationMapInternal {...props} />;
};

export default OptimizationMap;
