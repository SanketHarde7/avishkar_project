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
    <div className="absolute top-3 left-3 z-[1000] bg-surface/95 backdrop-blur-md border border-border text-text-primary px-3 py-2 rounded-[6px] shadow-md pointer-events-auto select-none">
      <div className="flex items-center gap-2.5">
        <Navigation
          className="w-3.5 h-3.5 text-accent transition-transform duration-500 flex-shrink-0"
          style={{ transform: `rotate(${windDirectionDeg}deg)` }}
        />
        <div className="text-xs leading-tight">
          <div className="font-bold text-text-primary tnum">{windSpeedKmh} km/h</div>
          <div className="text-[10px] text-text-muted font-mono tnum mt-0.5">
            {windDirectionDeg}° · u {u.toFixed(1)} · v {v.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
};
