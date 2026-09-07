'use client';

import React from 'react';
import { Navigation } from 'lucide-react';

interface WindOverlayProps {
  windSpeedKmh: number;
  windDirectionDeg: number;
  u: number;
  v: number;
}

export const WindOverlay: React.FC<WindOverlayProps> = ({
  windSpeedKmh,
  windDirectionDeg,
  u,
  v,
}) => {
  return (
    <div className="absolute top-4 left-4 z-[1000] bg-neutral-900/90 backdrop-blur-sm border border-neutral-800 text-neutral-200 px-3 py-2 rounded-md shadow-lg pointer-events-auto select-none">
      <div className="flex items-center gap-2.5">
        <Navigation
          className="w-3.5 h-3.5 text-sky-300 transition-transform duration-500"
          style={{ transform: `rotate(${windDirectionDeg}deg)` }}
        />
        <div className="text-xs leading-relaxed">
          <div className="font-medium text-neutral-100 tnum">{windSpeedKmh} km/h</div>
          <div className="text-[10px] text-neutral-500 font-mono tnum">
            {windDirectionDeg}° · u {u.toFixed(2)} · v {v.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};
