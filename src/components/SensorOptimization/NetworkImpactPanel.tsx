'use client';

import React from 'react';
import { SensorNetworkSummary } from '@/types';
import { ArrowRight, TrendingUp, ShieldCheck, Info } from 'lucide-react';

interface NetworkImpactPanelProps {
  summary: SensorNetworkSummary;
  networkMode: 'current' | 'optimized';
}

export const NetworkImpactPanel: React.FC<NetworkImpactPanelProps> = ({
  summary,
  networkMode,
}) => {
  const isOptimized = networkMode === 'optimized';

  return (
    <div className="bg-surface p-3.5 rounded-[6px] border border-border space-y-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
            Network Impact Analysis
          </h3>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <TrendingUp className="w-3 h-3" />
          <span>+{summary.coverage_improvement_pct}% Coverage</span>
        </div>
      </div>

      {/* Before / After Comparison Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Metric 1: Mean Monitoring Distance */}
        <div className="p-2.5 rounded-[4px] bg-surface-raised border border-border flex flex-col justify-between">
          <div className="text-[10px] text-text-muted font-medium">Mean Distance to Station</div>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono">
            <span
              className={`text-xs ${
                !isOptimized ? 'font-bold text-text-primary' : 'text-text-muted line-through'
              }`}
            >
              {summary.baseline_mean_nearest_sensor_km} km
            </span>
            {isOptimized && (
              <>
                <ArrowRight className="w-3 h-3 text-text-muted" />
                <span className="text-sm font-bold text-accent">
                  {summary.optimized_mean_nearest_sensor_km} km
                </span>
              </>
            )}
          </div>
          <div className="text-[9px] text-text-muted mt-1">Average grid observational gap</div>
        </div>

        {/* Metric 2: Maximum Spatial Void */}
        <div className="p-2.5 rounded-[4px] bg-surface-raised border border-border flex flex-col justify-between">
          <div className="text-[10px] text-text-muted font-medium">Max Monitoring Blindspot</div>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono">
            <span
              className={`text-xs ${
                !isOptimized ? 'font-bold text-text-primary' : 'text-text-muted line-through'
              }`}
            >
              {summary.baseline_max_distance_km} km
            </span>
            {isOptimized && (
              <>
                <ArrowRight className="w-3 h-3 text-text-muted" />
                <span className="text-sm font-bold text-accent">
                  {summary.optimized_max_distance_km} km
                </span>
              </>
            )}
          </div>
          <div className="text-[9px] text-text-muted mt-1">Furthest unmonitored point</div>
        </div>

        {/* Metric 3: Spatial Coverage <= 3km */}
        <div className="p-2.5 rounded-[4px] bg-surface-raised border border-border flex flex-col justify-between">
          <div className="text-[10px] text-text-muted font-medium">Grid Coverage (≤3km)</div>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono">
            <span
              className={`text-xs ${
                !isOptimized ? 'font-bold text-text-primary' : 'text-text-muted'
              }`}
            >
              {summary.baseline_coverage_pct}%
            </span>
            {isOptimized && (
              <>
                <ArrowRight className="w-3 h-3 text-text-muted" />
                <span className="text-sm font-bold text-emerald-400">
                  {summary.optimized_coverage_pct}%
                </span>
              </>
            )}
          </div>
          <div className="text-[9px] text-text-muted mt-1">Municipal territory monitored</div>
        </div>

        {/* Metric 4: High-Risk Area Monitored */}
        <div className="p-2.5 rounded-[4px] bg-surface-raised border border-border flex flex-col justify-between">
          <div className="text-[10px] text-text-muted font-medium">High Pollution Coverage</div>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono">
            <span className="text-xs text-text-muted">
              +{summary.high_risk_coverage_improvement_pct ?? 0}%
            </span>
            {isOptimized && (
              <span className="text-[10px] text-emerald-400 font-medium">expansion</span>
            )}
          </div>
          <div className="text-[9px] text-text-muted mt-1">Above-median PM2.5 zones</div>
        </div>
      </div>

      {/* Scientific Integrity Note */}
      <div className="flex items-start gap-1.5 text-[10px] text-text-muted leading-tight border-t border-border pt-2">
        <Info className="w-3 h-3 text-text-muted flex-shrink-0 mt-0.5" />
        <span>
          Metrics derived strictly from spatial grid geodetic distances across Pune municipal bounds. No speculative or synthetic accuracy numbers are shown.
        </span>
      </div>
    </div>
  );
};
