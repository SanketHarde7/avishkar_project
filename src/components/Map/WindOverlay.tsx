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
    <div className="absolute top-4 left-4 z-[1000] bg-surface/95 backdrop-blur-sm border border-border text-text-primary px-3 py-2 rounded-[2px] pointer-events-auto select-none">
      <div className="flex items-center gap-2.5">
        <Navigation
          className="w-3.5 h-3.5 text-text-secondary transition-transform duration-500"
          style={{ transform: `rotate(${windDirectionDeg}deg)` }}
        />
        <div className="text-xs leading-relaxed">
          <div className="font-medium text-text-primary tnum">{windSpeedKmh} km/h</div>
          <div className="text-[10px] text-text-muted font-mono tnum">
            {windDirectionDeg}° · u {u.toFixed(2)} · v {v.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};
