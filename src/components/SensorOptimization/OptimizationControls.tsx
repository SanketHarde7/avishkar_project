'use client';

import React from 'react';
import { Sparkles, Loader2, Eye, EyeOff, Layers, Radio } from 'lucide-react';

interface OptimizationControlsProps {
  sensorCount: number;
  onSelectSensorCount: (count: number) => void;
  hourOffset: number;
  onSelectHourOffset: (hour: number) => void;
  networkMode: 'current' | 'optimized';
  onToggleNetworkMode: (mode: 'current' | 'optimized') => void;
  onRunOptimization: () => void;
  isOptimizing: boolean;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  showCoverageRings: boolean;
  onToggleCoverageRings: () => void;
  isFallback: boolean;
}

const BUDGET_OPTIONS = [1, 2, 3, 5, 10];
const FORECAST_HOURS = [
  { value: 0, label: '0h Now' },
  { value: 3, label: '+3h' },
  { value: 6, label: '+6h' },
  { value: 12, label: '+12h' },
  { value: 24, label: '+24h' },
];

export const OptimizationControls: React.FC<OptimizationControlsProps> = ({
  sensorCount,
  onSelectSensorCount,
  hourOffset,
  onSelectHourOffset,
  networkMode,
  onToggleNetworkMode,
  onRunOptimization,
  isOptimizing,
  showHeatmap,
  onToggleHeatmap,
  showCoverageRings,
  onToggleCoverageRings,
  isFallback,
}) => {
  return (
    <div className="space-y-4">
      {/* Network State Toggle (Current vs Optimized) */}
      <div className="bg-surface-raised/80 p-1 rounded-[6px] border border-border flex items-center">
        <button
          onClick={() => onToggleNetworkMode('current')}
          className={`flex-1 py-1.5 px-3 rounded-[4px] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
            networkMode === 'current'
              ? 'bg-surface text-text-primary border border-border-strong shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Current Network</span>
        </button>

        <button
          onClick={() => onToggleNetworkMode('optimized')}
          className={`flex-1 py-1.5 px-3 rounded-[4px] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            networkMode === 'optimized'
              ? 'bg-accent text-background border border-accent-hover shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Optimized Network</span>
        </button>
      </div>

      {/* Sensor Budget Control */}
      <div className="bg-surface p-3 rounded-[6px] border border-border">
        <div className="flex items-center justify-between mb-2">
          <label className="panel-label">Sensor Deployment Budget</label>
          <span className="text-xs font-mono font-bold text-accent">
            +{sensorCount} New Sensors
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {BUDGET_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => onSelectSensorCount(opt)}
              className={`py-1.5 text-xs font-mono font-semibold rounded-[4px] border transition-all ${
                sensorCount === opt
                  ? 'bg-accent/20 border-accent text-accent'
                  : 'bg-surface-raised border-border text-text-secondary hover:text-text-primary hover:border-border-strong'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Spatiotemporal Forecast Target Horizon */}
      <div className="bg-surface p-3 rounded-[6px] border border-border">
        <div className="flex items-center justify-between mb-2">
          <label className="panel-label">Target Forecast Field</label>
          <span className="text-[11px] text-text-muted font-mono">
            {hourOffset === 0 ? 'Current Baseline' : `T+${hourOffset}h Prediction`}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {FORECAST_HOURS.map((h) => (
            <button
              key={h.value}
              onClick={() => onSelectHourOffset(h.value)}
              className={`py-1 text-[11px] font-mono rounded-[4px] border transition-colors ${
                hourOffset === h.value
                  ? 'bg-surface-raised text-text-primary border-border-strong'
                  : 'bg-transparent border-transparent text-text-muted hover:text-text-secondary hover:bg-surface-raised/40'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Optimization CTA */}
      <button
        onClick={onRunOptimization}
        disabled={isOptimizing}
        className="w-full py-2.5 px-4 rounded-[6px] bg-accent hover:bg-accent-hover active:scale-[0.99] text-background font-semibold text-xs tracking-wide uppercase transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isOptimizing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analyzing Candidate Field…</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>Optimize Sensor Network</span>
          </>
        )}
      </button>

      {/* Map Layer Overlays */}
      <div className="flex items-center justify-between gap-2 p-2 bg-surface-raised/60 rounded-[6px] border border-border text-xs">
        <button
          onClick={onToggleHeatmap}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-[4px] transition-colors border ${
            showHeatmap
              ? 'bg-surface text-text-primary border-border-strong'
              : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
          title="Toggle PINN Continuous 2D Pollution Surface"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Pollution Field</span>
        </button>

        <button
          onClick={onToggleCoverageRings}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-[4px] transition-colors border ${
            showCoverageRings
              ? 'bg-surface text-text-primary border-border-strong'
              : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
          title="Toggle 3 km Monitoring Radius Circles"
        >
          {showCoverageRings ? (
            <Eye className="w-3.5 h-3.5 text-accent" />
          ) : (
            <EyeOff className="w-3.5 h-3.5" />
          )}
          <span>Coverage Rings</span>
        </button>
      </div>

      {/* Transparent Methodology Box */}
      <div className="p-3 bg-surface-raised/40 rounded-[6px] border border-border text-[11px] text-text-muted space-y-1 leading-relaxed">
        <div className="font-semibold text-text-secondary flex items-center justify-between">
          <span>Deterministic Scoring Formula</span>
          {isFallback && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Local Engine
            </span>
          )}
        </div>
        <p className="font-mono text-[10px] text-text-secondary">
          Priority = 0.40·Risk + 0.35·Gap + 0.25·Proxy − Redundancy
        </p>
        <p>
          Greedy spatial diversification enforces a 2.8 km exclusion radius between new sites to prevent clustering in a single hotspot.
        </p>
      </div>
    </div>
  );
};
