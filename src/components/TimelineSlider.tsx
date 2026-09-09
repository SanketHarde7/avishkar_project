'use client';

import React, { useEffect } from 'react';
import { FORECAST_SLICES } from '@/lib/mockData';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface TimelineSliderProps {
  currentHourOffset: number;
  onSelectHourOffset: (hour: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  currentHourOffset,
  onSelectHourOffset,
  isPlaying,
  onTogglePlay,
}) => {
  const currentSlice =
    FORECAST_SLICES.find((s) => s.hour_offset === currentHourOffset) || FORECAST_SLICES[0];

  // Auto-play animation step effect
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      onSelectHourOffset(
        FORECAST_SLICES[
          (FORECAST_SLICES.findIndex((s) => s.hour_offset === currentHourOffset) + 1) %
            FORECAST_SLICES.length
        ].hour_offset
      );
    }, 2400);

    return () => clearInterval(timer);
  }, [isPlaying, currentHourOffset, onSelectHourOffset]);

  return (
    <footer className="h-[64px] w-full bg-surface border-t border-border px-6 flex items-center justify-between z-40 select-none">
      {/* Playback Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          className="flex items-center justify-center w-8 h-8 rounded-[6px] bg-surface-raised border border-border text-text-primary hover:border-border-strong hover:bg-surface transition-colors duration-150"
          title={isPlaying ? 'Pause forecast' : 'Play forecast'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        </button>

        <button
          onClick={() => onSelectHourOffset(0)}
          className="p-2 rounded-[6px] text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors duration-150"
          title="Reset to Now"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="hidden sm:block pl-1">
          <div className="text-xs font-medium text-text-primary">Forecast</div>
          <div className="text-[11px] text-text-muted">
            Advection–diffusion projection, next 24 h
          </div>
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="flex-1 max-w-xl mx-6">
        <div className="flex justify-between items-center relative">
          {/* Track */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-border -translate-y-1/2 z-0" />

          {/* Progress */}
          {(() => {
            const index = FORECAST_SLICES.findIndex((s) => s.hour_offset === currentHourOffset);
            const percent = (index / (FORECAST_SLICES.length - 1)) * 100;
            return (
              <div
                className="absolute top-1/2 left-0 h-px bg-accent -translate-y-1/2 z-0 transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            );
          })()}

          {/* Steps */}
          {FORECAST_SLICES.map((slice) => {
            const isSelected = slice.hour_offset === currentHourOffset;
            return (
              <button
                key={slice.hour_offset}
                onClick={() => onSelectHourOffset(slice.hour_offset)}
                className="relative z-10 flex flex-col items-center group focus:outline-none"
              >
                <div
                  className={`rounded-full transition-all duration-150 ${
                    isSelected
                      ? 'w-3 h-3 bg-accent ring-2 ring-accent/20'
                      : 'w-2.5 h-2.5 bg-surface-raised border border-border-strong group-hover:border-text-muted'
                  }`}
                />
                <span
                  className={`text-[11px] mt-1.5 transition-colors duration-150 tnum ${
                    isSelected
                      ? 'text-accent font-semibold'
                      : 'text-text-muted group-hover:text-text-secondary'
                  }`}
                >
                  {slice.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Frame Readout */}
      <div className="hidden lg:flex items-center gap-4 text-xs">
        <div className="text-right">
          <div className="panel-label">Frame</div>
          <div className="font-medium text-text-primary tnum">{currentSlice.label}</div>
        </div>
        <div className="h-5 w-px bg-border" />
        <div className="text-text-secondary tnum">
          Wind {currentSlice.wind_speed_kmh} km/h
        </div>
      </div>
    </footer>
  );
};
