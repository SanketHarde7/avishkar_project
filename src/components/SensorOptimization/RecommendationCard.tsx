'use client';

import React from 'react';
import { SensorRecommendation } from '@/types';
import { MapPin, Navigation, AlertTriangle, ShieldAlert } from 'lucide-react';

interface RecommendationCardProps {
  recommendation: SensorRecommendation;
  isSelected: boolean;
  onSelect: () => void;
}

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  HIGH_POLLUTION: { label: 'High Pollution', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  LARGE_MONITORING_GAP: { label: 'Coverage Void', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  UNMONITORED_CORRIDOR: { label: 'Unmonitored', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  HIGH_INFORMATION_VALUE: { label: 'High Info Value', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  BALANCED_COVERAGE_PRIORITY: { label: 'Strategic Balance', color: 'bg-accent/20 text-accent border-accent/30' },
};

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  isSelected,
  onSelect,
}) => {
  const {
    rank,
    lat,
    lon,
    priority_score,
    predicted_pm25,
    predicted_aqi,
    nearest_station_km,
    nearest_station_name,
    reason_codes,
  } = recommendation;

  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-[6px] border transition-all cursor-pointer select-none relative ${
        isSelected
          ? 'bg-surface border-accent shadow-md ring-1 ring-accent/50'
          : 'bg-surface-raised/60 border-border hover:bg-surface-raised hover:border-border-strong'
      }`}
    >
      {/* Top Row: Rank Badge & Priority Score */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
              isSelected
                ? 'bg-accent text-background'
                : 'bg-surface border border-accent/60 text-accent'
            }`}
          >
            {String(rank).padStart(2, '0')}
          </div>
          <span className="text-xs font-semibold text-text-primary">
            Site #{String(rank).padStart(2, '0')}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
          <span>Score</span>
          <span>{priority_score}</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 my-2 py-2 border-y border-border/60 text-xs">
        <div>
          <div className="text-[10px] text-text-muted">Predicted PM2.5</div>
          <div className="font-mono font-bold text-text-primary mt-0.5">
            {predicted_pm25} µg/m³
            <span className="text-[10px] font-normal text-text-muted ml-1">
              (AQI {predicted_aqi})
            </span>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-text-muted">Nearest Station</div>
          <div className="font-mono font-bold text-accent mt-0.5">
            {nearest_station_km} km
          </div>
        </div>
      </div>

      {/* Location & Nearest Station Name */}
      <div className="text-[10px] text-text-muted flex items-center justify-between mt-1">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-text-muted" />
          <span className="font-mono">
            {lat.toFixed(4)}°, {lon.toFixed(4)}°
          </span>
        </div>
        <span className="truncate max-w-[130px]" title={nearest_station_name}>
          near {nearest_station_name}
        </span>
      </div>

      {/* Reason Badges */}
      <div className="flex flex-wrap gap-1 mt-2.5">
        {reason_codes.slice(0, 3).map((code) => {
          const badge = REASON_LABELS[code] || {
            label: code,
            color: 'bg-surface text-text-secondary border-border',
          };
          return (
            <span
              key={code}
              className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${badge.color}`}
            >
              {badge.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};
