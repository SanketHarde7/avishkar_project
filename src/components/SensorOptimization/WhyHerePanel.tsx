'use client';

import React from 'react';
import { SensorRecommendation } from '@/types';
import { HelpCircle, Crosshair, MapPin, CheckCircle2 } from 'lucide-react';

interface WhyHerePanelProps {
  recommendation: SensorRecommendation;
  onFocusOnMap: () => void;
}

export const WhyHerePanel: React.FC<WhyHerePanelProps> = ({
  recommendation,
  onFocusOnMap,
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
    pollution_risk_score,
    coverage_gap_score,
    information_value_score,
    explanation,
  } = recommendation;

  // Scale 0-1 scores to 0-100 integers
  const riskPct = Math.round(pollution_risk_score * 100);
  const gapPct = Math.round(coverage_gap_score * 100);
  const infoPct = Math.round(information_value_score * 100);

  return (
    <div className="bg-surface p-3.5 rounded-[6px] border border-border space-y-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
            Why Site #{String(rank).padStart(2, '0')}?
          </h3>
        </div>
        <button
          onClick={onFocusOnMap}
          className="flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover font-medium transition-colors"
          title="Center and zoom map to this site"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>Focus Map</span>
        </button>
      </div>

      {/* Coordinate & Reference */}
      <div className="flex items-center justify-between text-[11px] bg-surface-raised p-2 rounded-[4px] border border-border text-text-muted">
        <div className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-accent" />
          <span className="font-mono text-text-primary">
            {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
          </span>
        </div>
        <div className="text-right">
          <span className="font-mono font-bold text-accent">{nearest_station_km} km</span>
          <span className="ml-1 text-[10px]">void</span>
        </div>
      </div>

      {/* Factor Breakdown Bars */}
      <div className="space-y-2 text-xs">
        {/* Factor 1: Pollution Risk */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-text-secondary">Pollution Risk Factor</span>
            <span className="font-mono font-bold text-text-primary">{riskPct} / 100</span>
          </div>
          <div className="w-full h-1.5 bg-surface-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-300"
              style={{ width: `${riskPct}%` }}
            />
          </div>
        </div>

        {/* Factor 2: Spatial Monitoring Gap */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-text-secondary">Spatial Coverage Gap</span>
            <span className="font-mono font-bold text-text-primary">{gapPct} / 100</span>
          </div>
          <div className="w-full h-1.5 bg-surface-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${gapPct}%` }}
            />
          </div>
        </div>

        {/* Factor 3: Information Value Proxy */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-text-secondary">Information Value Proxy</span>
            <span className="font-mono font-bold text-text-primary">{infoPct} / 100</span>
          </div>
          <div className="w-full h-1.5 bg-surface-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${infoPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Narrative Urban-Planning Justification */}
      <div className="p-2.5 rounded-[4px] bg-accent/5 border border-accent/20 text-[11px] leading-relaxed text-text-secondary">
        <div className="font-semibold text-accent mb-0.5 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Municipal Recommendation Rationale</span>
        </div>
        <p>{explanation}</p>
      </div>

      {/* Context info */}
      <div className="text-[10px] text-text-muted flex justify-between pt-1">
        <span>Predicted Air Quality</span>
        <span className="font-medium text-text-secondary">
          AQI {predicted_aqi} · {predicted_pm25} µg/m³ PM2.5
        </span>
      </div>
    </div>
  );
};
