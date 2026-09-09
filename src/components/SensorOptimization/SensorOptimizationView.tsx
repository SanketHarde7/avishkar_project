'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Station,
  GridPoint,
  SensorOptimizationResponse,
  SensorRecommendation,
  CityOption,
} from '@/types';
import { fetchSensorOptimization } from '@/lib/api';
import { OptimizationMap } from './OptimizationMap';
import { OptimizationControls } from './OptimizationControls';
import { NetworkImpactPanel } from './NetworkImpactPanel';
import { RecommendationCard } from './RecommendationCard';
import { WhyHerePanel } from './WhyHerePanel';
import {
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  Layers,
  MapPin,
  RefreshCw,
  Sliders,
} from 'lucide-react';

interface SensorOptimizationViewProps {
  initialStations?: Station[];
  initialGrid?: GridPoint[];
  selectedCity?: CityOption;
  onBackToMonitor?: () => void;
}

export const SensorOptimizationView: React.FC<SensorOptimizationViewProps> = ({
  initialStations = [],
  initialGrid = [],
  selectedCity,
  onBackToMonitor,
}) => {
  // Optimizer configuration states
  const [sensorCount, setSensorCount] = useState<number>(3);
  const [hourOffset, setHourOffset] = useState<number>(0);
  const [networkMode, setNetworkMode] = useState<'current' | 'optimized'>('optimized');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showCoverageRings, setShowCoverageRings] = useState<boolean>(true);

  // Optimization data states
  const [optimizationData, setOptimizationData] = useState<SensorOptimizationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive selection state
  const [selectedRank, setSelectedRank] = useState<number>(1);
  const [focusTarget, setFocusTarget] = useState<[number, number] | null>(null);

  // Cache to avoid duplicate network requests: key = `${hourOffset}_${sensorCount}`
  const cacheRef = useRef<Record<string, SensorOptimizationResponse>>({});

  // Map center & zoom for Pune
  const mapCenter: [number, number] = selectedCity?.center || [18.5204, 73.8567];
  const mapZoom: number = selectedCity?.zoom || 12;

  // Execute optimization request
  const runOptimization = useCallback(
    async (countToRun: number, hourToRun: number) => {
      const cacheKey = `${hourToRun}_${countToRun}`;
      if (cacheRef.current[cacheKey]) {
        setOptimizationData(cacheRef.current[cacheKey]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchSensorOptimization(
          countToRun,
          hourToRun,
          initialGrid,
          initialStations
        );
        cacheRef.current[cacheKey] = response;
        setOptimizationData(response);

        // Ensure selected rank is within bounds
        setSelectedRank((prev) => {
          if (prev > response.recommended_count || prev < 1) return 1;
          return prev;
        });
      } catch (err) {
        console.error('Optimization error:', err);
        setError('Failed to compute sensor placement optimization.');
      } finally {
        setIsLoading(false);
      }
    },
    [initialGrid, initialStations]
  );

  // Initial load
  useEffect(() => {
    runOptimization(sensorCount, hourOffset);
  }, [sensorCount, hourOffset, runOptimization]);

  // Handle clicking a recommendation card or map pin
  const handleSelectRecommendation = useCallback(
    (rank: number) => {
      setSelectedRank(rank);
      const rec = optimizationData?.recommendations.find((r) => r.rank === rank);
      if (rec) {
        setFocusTarget([rec.lat, rec.lon]);
      }
    },
    [optimizationData]
  );

  // Get current recommendation for "Why Here?" deep dive
  const currentRecommendation: SensorRecommendation | undefined =
    optimizationData?.recommendations.find((r) => r.rank === selectedRank) ||
    optimizationData?.recommendations[0];

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden select-none">
      {/* 1. Header Bar */}
      <div className="h-[52px] bg-surface border-b border-border px-4 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBackToMonitor && (
            <button
              onClick={onBackToMonitor}
              className="p-1.5 rounded-[4px] hover:bg-surface-raised text-text-secondary hover:text-text-primary transition-colors border border-border"
              title="Return to Live Monitor"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-text-primary tracking-tight">
                Smart Sensor Network Optimizer
              </h2>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-accent/20 text-accent border border-accent/40">
                Decision Support
              </span>
              {optimizationData?.is_fallback ? (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Local Mode
                </span>
              ) : (
                <span className="hidden sm:inline text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PINN Engine Connected
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted hidden md:block">
              Optimal placement of additional monitoring stations using spatial pollution risk and network coverage analysis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="hidden lg:flex items-center gap-2 bg-surface-raised px-2.5 py-1 rounded-[4px] border border-border text-text-secondary">
            <MapPin className="w-3.5 h-3.5 text-accent" />
            <span>Pune Municipal Territory</span>
            <span className="text-border-strong">·</span>
            <span>{optimizationData?.network_summary.existing_station_count || 13} Active Stations</span>
          </div>
        </div>
      </div>

      {/* 2. Main Content Split View (70% Map, 30% Sidebar) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left: Interactive Map Canvas */}
        <section className="flex-1 md:w-[70%] h-full relative overflow-hidden bg-background">
          <OptimizationMap
            center={mapCenter}
            zoom={mapZoom}
            stations={initialStations}
            grid={initialGrid}
            recommendations={optimizationData?.recommendations || []}
            selectedRank={selectedRank}
            onSelectRecommendation={handleSelectRecommendation}
            networkMode={networkMode}
            showHeatmap={showHeatmap}
            showCoverageRings={showCoverageRings}
            focusTarget={focusTarget}
          />

          {/* Floating Map Status Overlay */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-surface/90 backdrop-blur-sm px-3 py-2 rounded-[6px] border border-border shadow-lg text-xs pointer-events-auto">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="font-semibold text-text-primary">
                {networkMode === 'optimized'
                  ? `Optimized Network: +${optimizationData?.recommended_count || sensorCount} Recommended Sites`
                  : `Current Network: ${optimizationData?.network_summary.existing_station_count || 13} Active Stations`}
              </span>
            </div>
            <div className="text-[11px] text-text-muted mt-0.5 font-mono">
              Coverage Ring Radius: 3.0 km · Pune Grid (144 Cells)
            </div>
          </div>
        </section>

        {/* Right: Technical Decision-Support Sidebar */}
        <section className="w-full md:w-[30%] md:min-w-[370px] md:max-w-[440px] h-full overflow-y-auto border-t md:border-t-0 md:border-l border-border bg-surface custom-scrollbar p-4 space-y-4 z-10">
          {/* Controls Panel */}
          <OptimizationControls
            sensorCount={sensorCount}
            onSelectSensorCount={(count) => {
              setSensorCount(count);
              runOptimization(count, hourOffset);
            }}
            hourOffset={hourOffset}
            onSelectHourOffset={(hour) => {
              setHourOffset(hour);
              runOptimization(sensorCount, hour);
            }}
            networkMode={networkMode}
            onToggleNetworkMode={setNetworkMode}
            onRunOptimization={() => runOptimization(sensorCount, hourOffset)}
            isOptimizing={isLoading}
            showHeatmap={showHeatmap}
            onToggleHeatmap={() => setShowHeatmap((prev) => !prev)}
            showCoverageRings={showCoverageRings}
            onToggleCoverageRings={() => setShowCoverageRings((prev) => !prev)}
            isFallback={Boolean(optimizationData?.is_fallback)}
          />

          {/* Network Impact Metrics */}
          {optimizationData && (
            <NetworkImpactPanel
              summary={optimizationData.network_summary}
              networkMode={networkMode}
            />
          )}

          {/* Selected Site "Why Here?" Deep Dive */}
          {currentRecommendation && (
            <WhyHerePanel
              recommendation={currentRecommendation}
              onFocusOnMap={() => {
                setFocusTarget([
                  currentRecommendation.lat,
                  currentRecommendation.lon,
                ]);
              }}
            />
          )}

          {/* Ranked Recommendation Cards List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="panel-label">
                Ranked Deployment Locations ({optimizationData?.recommendations.length || 0})
              </label>
              <span className="text-[10px] text-text-muted">
                Click to inspect
              </span>
            </div>

            <div className="space-y-2">
              {(optimizationData?.recommendations || []).map((rec) => (
                <RecommendationCard
                  key={`rec-card-${rec.rank}`}
                  recommendation={rec}
                  isSelected={selectedRank === rec.rank}
                  onSelect={() => handleSelectRecommendation(rec.rank)}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SensorOptimizationView;
