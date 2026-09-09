'use client';

import React from 'react';
import { Navigation } from 'lucide-react';

interface WindOverlayProps {
  windSpeedKmh: number;
  windDirectionDeg: number;
  u: number;
  v: number;
  locationLabel?: string;
}

export const WindOverlay: React.FC<WindOverlayProps> = ({
  windSpeedKmh,
  windDirectionDeg,
  u,
  v,
  locationLabel,
}) => {
  return (
    <div className="absolute top-3 left-3 z-[1000] bg-[#0f1117]/95 backdrop-blur-md border border-slate-700/80 text-white px-3.5 py-2.5 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.45)] pointer-events-auto select-none transition-all">
      <div className="flex items-center gap-2.5">
        <Navigation
          className="w-4 h-4 text-amber-400 transition-transform duration-500 flex-shrink-0 drop-shadow-sm"
          style={{ transform: `rotate(${windDirectionDeg}deg)` }}
        />
        <div className="text-xs leading-tight">
          <div className="font-bold text-white tnum flex items-center gap-1.5">
            <span className="text-sm tracking-tight">{windSpeedKmh} km/h</span>
            {locationLabel && (
              <span
                className="text-[9px] font-medium text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40 truncate max-w-[130px] shadow-sm"
                title={locationLabel}
              >
                {locationLabel}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-300 font-mono tnum mt-0.5 font-medium">
            {windDirectionDeg}° · u {u.toFixed(1)} · v {v.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
};
