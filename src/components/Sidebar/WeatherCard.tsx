'use client';

import React from 'react';
import { WeatherMetrics, PhysicsMetadata } from '@/types';

interface WeatherCardProps {
  weather: WeatherMetrics;
  physics: PhysicsMetadata;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, physics }) => {
  return (
    <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-neutral-100">Atmospheric conditions</div>
        <span className="text-[10px] text-neutral-500">Open-Meteo</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neutral-950/60 rounded-md p-2.5 border border-neutral-800/80">
          <div className="panel-label">Wind</div>
          <div className="text-base font-semibold text-neutral-100 mt-1 tnum">
            {weather.wind_speed_kmh}
            <span className="text-[11px] font-normal text-neutral-500 ml-1">km/h</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5 tnum">
            bearing {weather.wind_direction_deg}°
          </div>
        </div>

        <div className="bg-neutral-950/60 rounded-md p-2.5 border border-neutral-800/80">
          <div className="panel-label">Temp / RH</div>
          <div className="text-base font-semibold text-neutral-100 mt-1 tnum">
            {weather.temp_c}°C
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5 tnum">
            humidity {weather.humidity_pct || 52}%
          </div>
        </div>
      </div>

      {/* Wind vector components used by the advection term */}
      <div className="bg-neutral-950/60 rounded-md p-2.5 border border-neutral-800/80">
        <div className="flex items-center justify-between mb-1.5">
          <span className="panel-label">Wind vector (u, v)</span>
          <span className="text-[10px] text-neutral-600 font-mono">m/s</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono tnum">
          <div className="flex justify-between bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
            <span className="text-neutral-500">u</span>
            <span className="font-semibold text-neutral-200">{weather.u.toFixed(2)}</span>
          </div>
          <div className="flex justify-between bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
            <span className="text-neutral-500">v</span>
            <span className="font-semibold text-neutral-200">{weather.v.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* PDE coefficients */}
      <div className="flex items-center justify-between px-0.5 text-[11px] text-neutral-500 font-mono tnum">
        <span>
          D <span className="text-neutral-200 font-semibold">{physics.diffusion_coeff}</span>
        </span>
        <span>
          k <span className="text-neutral-200 font-semibold">{physics.decay_rate}</span>
        </span>
        <span className="text-neutral-600">advection–diffusion coefficients</span>
      </div>
    </div>
  );
};
