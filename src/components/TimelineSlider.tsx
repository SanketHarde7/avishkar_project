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
    <footer className="h-[64px] w-full bg-neutral-950 border-t border-neutral-800 px-6 flex items-center justify-between z-40 select-none">
      {/* Playback Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
            isPlaying
              ? 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700'
              : 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700'
          }`}
          title={isPlaying ? 'Pause forecast' : 'Play forecast'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        </button>

        <button
          onClick={() => onSelectHourOffset(0)}
          className="p-2 rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900 transition-colors"
          title="Reset to Now"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="hidden sm:block pl-1">
          <div className="text-xs font-medium text-neutral-200">Forecast</div>
          <div className="text-[11px] text-neutral-500">
            Advection–diffusion projection, next 24 h
          </div>
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="flex-1 max-w-xl mx-6">
        <div className="flex justify-between items-center relative">
          {/* Track */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-neutral-800 -translate-y-1/2 z-0" />

          {/* Progress */}
          {(() => {
            const index = FORECAST_SLICES.findIndex((s) => s.hour_offset === currentHourOffset);
            const percent = (index / (FORECAST_SLICES.length - 1)) * 100;
            return (
              <div
                className="absolute top-1/2 left-0 h-px bg-sky-400/80 -translate-y-1/2 z-0 transition-all duration-300"
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
                  className={`rounded-full transition-all duration-200 ${
                    isSelected
                      ? 'w-3 h-3 bg-sky-400 ring-2 ring-sky-400/25'
                      : 'w-2.5 h-2.5 bg-neutral-800 border border-neutral-600 group-hover:border-neutral-400'
                  }`}
                />
                <span
                  className={`text-[11px] mt-1.5 transition-colors tnum ${
                    isSelected
                      ? 'text-sky-300 font-semibold'
                      : 'text-neutral-500 group-hover:text-neutral-300'
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
          <div className="font-medium text-neutral-200 tnum">{currentSlice.label}</div>
        </div>
        <div className="h-5 w-px bg-neutral-800" />
        <div className="text-neutral-400 tnum">
          Wind {currentSlice.wind_speed_kmh} km/h
        </div>
      </div>
    </footer>
  );
};
