'use client';

import React from 'react';
import { WeatherMetrics, PhysicsMetadata } from '@/types';

interface WeatherCardProps {
  weather: WeatherMetrics;
  physics: PhysicsMetadata;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, physics }) => {
  return (
    <div className="bg-surface rounded-[2px] p-4 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-text-primary">Atmospheric conditions</div>
        <span className="text-[10px] text-text-muted">Open-Meteo</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-raised rounded-[2px] p-2.5 border border-border">
          <div className="panel-label">Wind</div>
          <div className="text-base font-semibold text-text-primary mt-1 tnum">
            {weather.wind_speed_kmh}
            <span className="text-[11px] font-normal text-text-muted ml-1">km/h</span>
          </div>
          <div className="text-[11px] text-text-muted mt-0.5 tnum">
            bearing {weather.wind_direction_deg}°
          </div>
        </div>

        <div className="bg-surface-raised rounded-[2px] p-2.5 border border-border">
          <div className="panel-label">Temp / RH</div>
          <div className="text-base font-semibold text-text-primary mt-1 tnum">
            {weather.temp_c}°C
          </div>
          <div className="text-[11px] text-text-muted mt-0.5 tnum">
            humidity {weather.humidity_pct || 52}%
          </div>
        </div>
      </div>

      {/* Wind vector components used by the advection term */}
      <div className="bg-surface-raised rounded-[2px] p-2.5 border border-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="panel-label">Wind vector (u, v)</span>
          <span className="text-[10px] text-text-muted font-mono">m/s</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono tnum">
          <div className="flex justify-between bg-surface px-2 py-1 rounded-[2px] border border-border">
            <span className="text-text-muted">u</span>
            <span className="font-semibold text-text-primary">{weather.u.toFixed(2)}</span>
          </div>
          <div className="flex justify-between bg-surface px-2 py-1 rounded-[2px] border border-border">
            <span className="text-text-muted">v</span>
            <span className="font-semibold text-text-primary">{weather.v.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* PDE coefficients */}
      <div className="flex items-center justify-between px-0.5 text-[11px] text-text-muted font-mono tnum">
        <span>
          D <span className="text-text-primary font-semibold">{physics.diffusion_coeff}</span>
        </span>
        <span>
          k <span className="text-text-primary font-semibold">{physics.decay_rate}</span>
        </span>
        <span className="text-text-muted">advection–diffusion coefficients</span>
      </div>
    </div>
  );
};
