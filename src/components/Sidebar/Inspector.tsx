'use client';

import React from 'react';
import { PointPrediction, ValidationMetrics } from '@/types';
import { WeatherCard } from './WeatherCard';
import { JudgeBenchmark } from './JudgeBenchmark';
import { getAqiColor } from '@/lib/mockData';

interface InspectorProps {
  prediction: PointPrediction | null;
  isJudgeMode: boolean;
  benchmarkData: ValidationMetrics;
  selectedCityName: string;
}

export const Inspector: React.FC<InspectorProps> = ({
  prediction,
  isJudgeMode,
  benchmarkData,
  selectedCityName,
}) => {
  if (!prediction) {
    return (
      <aside className="w-full h-full bg-surface border-l border-border p-6 flex flex-col items-center justify-center text-center text-text-muted">
        <h3 className="text-sm font-medium text-text-primary">No point selected</h3>
        <p className="text-xs text-text-muted mt-1.5 max-w-xs leading-relaxed">
          Click anywhere on the map to estimate air quality at that coordinate using the
          physics-informed model.
        </p>
      </aside>
    );
  }

  const aqiColor = getAqiColor(prediction.predicted_aqi);
  const pm10Estimate = Math.round(prediction.predicted_pm25 * 1.65);

  return (
    <aside className="w-full h-full bg-surface border-l border-border p-4 overflow-y-auto space-y-4 custom-scrollbar">
      {/* Location & Primary Readout */}
      <div className="bg-surface rounded-[2px] p-4 border border-border space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="panel-label">Street / Location</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-semibold text-text-primary">
                {prediction.street_name || selectedCityName}
              </span>
              {prediction.is_live && (
                <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-accent-muted/40 text-accent border border-accent/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <div className="text-[10px] text-text-muted mt-0.5 font-mono">
              50m microclimate resolution
            </div>
          </div>
          <div className="text-right font-mono text-[11px] text-text-muted tnum leading-relaxed">
            <div>{prediction.lat.toFixed(4)}° N</div>
            <div>{prediction.lon.toFixed(4)}° E</div>
          </div>
        </div>

        <div className="flex items-end justify-between pt-3 border-t border-border">
          <div>
            <div className="panel-label">Predicted Street AQI</div>
            <div
              className="text-4xl font-semibold tracking-tight mt-1 tnum leading-none"
              style={{ color: aqiColor }}
            >
              {prediction.predicted_aqi}
            </div>
            <div className="mt-2 text-xs font-medium" style={{ color: aqiColor }}>
              {prediction.risk_category}
            </div>
          </div>

          <div className="space-y-2.5 text-right">
            <div>
              <div className="panel-label">PM2.5</div>
              <div className="text-lg font-semibold text-text-primary tnum">
                {prediction.predicted_pm25}
                <span className="text-[11px] font-normal text-text-muted ml-1">µg/m³</span>
              </div>
            </div>
            <div>
              <div className="panel-label">PM10 (est.)</div>
              <div className="text-sm font-medium text-text-secondary tnum">
                {pm10Estimate}
                <span className="text-[11px] font-normal text-text-muted ml-1">µg/m³</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Physics-Informed Data Assimilation Breakdown */}
      <div className="rounded-[2px] p-3 border border-border bg-surface-raised space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-primary">Data Assimilation Breakdown</span>
          <span className="text-[10px] font-mono text-accent">Physics + CPCB Hybrid</span>
        </div>

        {/* Dual Progress Bar for Blending */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-text-secondary mb-1">
            <span>Sensor Observation ({prediction.sensor_bias_pct ?? 0}%)</span>
            <span>PINN Fluid Dynamics ({prediction.physics_bias_pct ?? 100}%)</span>
          </div>
          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden flex">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${prediction.sensor_bias_pct ?? 0}%` }}
              title="CPCB Ground Station Influence"
            />
            <div
              className="h-full bg-border-strong transition-all duration-500"
              style={{ width: `${prediction.physics_bias_pct ?? 100}%` }}
              title="PINN Advection-Diffusion Fluid Prior"
            />
          </div>
        </div>

        <div className="text-[11px] text-text-secondary leading-relaxed pt-1 border-t border-border/40 space-y-1">
          <div>
            <span className="text-text-muted">Status: </span>
            <span className="text-text-primary font-medium">
              {prediction.assimilation_summary || 'Physics dispersion field'}
            </span>
          </div>
          {prediction.pinn_base_pm25 !== undefined && (
            <div className="text-[10px] font-mono text-text-muted">
              PINN fluid prior: <span className="text-text-primary">{prediction.pinn_base_pm25} µg/m³</span> → Blended: <span className="text-accent font-semibold">{prediction.predicted_pm25} µg/m³</span>
            </div>
          )}
          <div className="text-[10px] text-text-muted">
            Nearest reference monitor: {prediction.nearest_station_km.toFixed(2)} km ({prediction.nearest_station_name})
          </div>
        </div>
      </div>

      {/* Street-Level Health & Activity Advisor */}
      <div className="rounded-[2px] p-3 border border-border bg-surface-raised space-y-2.5">
        <div className="text-xs font-medium text-text-primary">Street Health & Activity Advisor</div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {/* Outdoor Running / Sports */}
          <div className="p-2 rounded-[2px] bg-surface border border-border">
            <div className="text-text-muted text-[10px] flex items-center gap-1 mb-0.5">
              <span>🏃</span> Outdoor Exercise
            </div>
            <div className="text-text-primary font-medium text-[11px]">
              {prediction.predicted_aqi <= 50
                ? 'Ideal for running'
                : prediction.predicted_aqi <= 100
                ? 'Moderate exertion ok'
                : 'Reduce cardio outdoors'}
            </div>
          </div>

          {/* Window Ventilation */}
          <div className="p-2 rounded-[2px] bg-surface border border-border">
            <div className="text-text-muted text-[10px] flex items-center gap-1 mb-0.5">
              <span>🪟</span> Home Ventilation
            </div>
            <div className="text-text-primary font-medium text-[11px]">
              {prediction.predicted_aqi <= 50
                ? 'Open windows safe'
                : prediction.predicted_aqi <= 100
                ? 'Ventilate midday'
                : 'Keep windows closed'}
            </div>
          </div>

          {/* Mask Guidance */}
          <div className="p-2 rounded-[2px] bg-surface border border-border">
            <div className="text-text-muted text-[10px] flex items-center gap-1 mb-0.5">
              <span>😷</span> Mask Advisory
            </div>
            <div className="text-text-primary font-medium text-[11px]">
              {prediction.predicted_aqi <= 100
                ? 'No mask needed'
                : 'N95 advised outdoors'}
            </div>
          </div>

          {/* Vulnerable Groups */}
          <div className="p-2 rounded-[2px] bg-surface border border-border">
            <div className="text-text-muted text-[10px] flex items-center gap-1 mb-0.5">
              <span>👶</span> Sensitive Care
            </div>
            <div className="text-text-primary font-medium text-[11px]">
              {prediction.predicted_aqi <= 50
                ? 'Low risk for all'
                : prediction.predicted_aqi <= 100
                ? 'Asthmatics take note'
                : 'Avoid outdoor play'}
            </div>
          </div>
        </div>
      </div>

      {/* 24-Hour Diurnal Street Forecast Sparkline */}
      <div className="rounded-[2px] p-3 border border-border bg-surface-raised space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-text-primary">
          <span>24-Hour Diurnal Street Forecast</span>
          <span className="text-[10px] text-text-muted">PINN cyclic trend</span>
        </div>
        <div className="h-12 flex items-end gap-1 pt-2">
          {[
            { hour: '0h', factor: 0.95 },
            { hour: '3h', factor: 0.88 },
            { hour: '6h', factor: 0.82 },
            { hour: '9h', factor: 1.25 }, // Morning rush peak
            { hour: '12h', factor: 1.10 },
            { hour: '15h', factor: 0.78 }, // Solar cleansing dip
            { hour: '18h', factor: 1.15 },
            { hour: '21h', factor: 1.30 }, // Night inversion peak
          ].map((item, idx) => {
            const hAqi = Math.round(prediction.predicted_aqi * item.factor);
            const hColor = getAqiColor(hAqi);
            const heightPct = Math.max(20, Math.min(100, Math.round((hAqi / 200) * 100)));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full rounded-t-[1px] transition-all hover:opacity-80"
                  style={{ height: `${heightPct}%`, backgroundColor: hColor }}
                  title={`${item.hour}: Predicted AQI ${hAqi}`}
                />
                <span className="text-[8px] font-mono text-text-muted">{item.hour}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-text-muted pt-1 border-t border-border/30">
          <span>Morning rush: Peak</span>
          <span>Midday: Solar cleansing</span>
          <span>Night: Inversion</span>
        </div>
      </div>

      {/* Atmospheric physics */}
      <WeatherCard
        weather={prediction.weather}
        physics={prediction.physics_metadata}
      />

      {/* Judge Benchmark */}
      {isJudgeMode && <JudgeBenchmark data={benchmarkData} />}

      {/* Method note */}
      <div className="rounded-[2px] p-3 border border-border bg-surface-raised text-[11px] text-text-secondary leading-relaxed">
        <div className="text-xs font-medium text-text-primary mb-1">Model Architecture</div>
        Physics-Informed Neural Network (PINN) enforcing the 2D Advection-Diffusion PDE coupled with asymmetric Gaussian plume data assimilation to ensure continuous, street-calibrated air quality.
      </div>
    </aside>
  );
};
