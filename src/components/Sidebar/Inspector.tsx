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
      <aside className="w-full h-full bg-neutral-950 border-l border-neutral-800 p-6 flex flex-col items-center justify-center text-center text-neutral-500">
        <h3 className="text-sm font-medium text-neutral-300">No point selected</h3>
        <p className="text-xs text-neutral-500 mt-1.5 max-w-xs leading-relaxed">
          Click anywhere on the map to estimate air quality at that coordinate using the
          physics-informed model.
        </p>
      </aside>
    );
  }

  const aqiColor = getAqiColor(prediction.predicted_aqi);
  const pm10Estimate = Math.round(prediction.predicted_pm25 * 1.65);

  return (
    <aside className="w-full h-full bg-neutral-950 border-l border-neutral-800 p-4 overflow-y-auto space-y-4 custom-scrollbar">
      {/* Location & Primary Readout */}
      <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="panel-label">Estimated point</div>
            <div className="text-sm font-semibold text-neutral-100 mt-0.5">
              {selectedCityName}
            </div>
          </div>
          <div className="text-right font-mono text-[11px] text-neutral-500 tnum leading-relaxed">
            <div>{prediction.lat.toFixed(4)}° N</div>
            <div>{prediction.lon.toFixed(4)}° E</div>
          </div>
        </div>

        <div className="flex items-end justify-between pt-3 border-t border-neutral-800">
          <div>
            <div className="panel-label">Predicted AQI</div>
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
              <div className="text-lg font-semibold text-neutral-100 tnum">
                {prediction.predicted_pm25}
                <span className="text-[11px] font-normal text-neutral-500 ml-1">µg/m³</span>
              </div>
            </div>
            <div>
              <div className="panel-label">PM10 (est.)</div>
              <div className="text-sm font-medium text-neutral-300 tnum">
                {pm10Estimate}
                <span className="text-[11px] font-normal text-neutral-500 ml-1">µg/m³</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spatial inference note */}
      <div className="rounded-lg p-3 border border-neutral-800 bg-neutral-900/60">
        <div className="text-xs font-medium text-neutral-200">Spatial inference</div>
        <div className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
          No sensor within{' '}
          <span className="text-neutral-200 font-mono tnum font-semibold">
            {prediction.nearest_station_km.toFixed(2)} km
          </span>{' '}
          — nearest is {prediction.nearest_station_name || 'ground station'}. This value is
          predicted by the continuous 2D field, not a station lookup.
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
      <div className="rounded-lg p-3 border border-neutral-800/70 bg-neutral-900/40 text-[11px] text-neutral-400 leading-relaxed">
        <div className="text-xs font-medium text-neutral-300 mb-1">Model</div>
        Physics-informed neural network trained with the 2D advection–diffusion equation as a
        soft constraint, so predicted dispersion remains physically consistent between sensors.
      </div>
    </aside>
  );
};
