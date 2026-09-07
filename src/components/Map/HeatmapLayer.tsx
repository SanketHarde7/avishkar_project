'use client';

import React, { useEffect, useState } from 'react';
import { ImageOverlay } from 'react-leaflet';
import { GridPoint } from '@/types';

interface HeatmapLayerProps {
  grid: GridPoint[];
  visible?: boolean;
}

// Bounding box for continuous PINN spatial field overlay across Pune
const PUNE_HEATMAP_BOUNDS: [[number, number], [number, number]] = [
  [18.45, 73.75],
  [18.65, 73.98],
];

/**
 * Color Ramp:
 * - 0 - 50 AQI: rgba(34, 197, 94, 0.6) (Green)
 * - 51 - 100 AQI: rgba(234, 179, 8, 0.65) (Yellow)
 * - 101 - 150 AQI: rgba(249, 115, 22, 0.7) (Orange)
 * - 151 - 200 AQI: rgba(239, 68, 68, 0.75) (Red)
 * - 201+ AQI: rgba(168, 85, 247, 0.8) (Purple)
 */
function getRampColor(aqi: number): { r: number; g: number; b: number; a: number } {
  if (aqi <= 50) {
    return { r: 34, g: 197, b: 94, a: 0.6 };
  } else if (aqi <= 100) {
    const t = (aqi - 50) / 50;
    return {
      r: Math.round(34 + (234 - 34) * t),
      g: Math.round(197 + (179 - 197) * t),
      b: Math.round(94 + (8 - 94) * t),
      a: 0.6 + (0.65 - 0.6) * t,
    };
  } else if (aqi <= 150) {
    const t = (aqi - 100) / 50;
    return {
      r: Math.round(234 + (249 - 234) * t),
      g: Math.round(179 + (115 - 179) * t),
      b: Math.round(8 + (22 - 8) * t),
      a: 0.65 + (0.7 - 0.65) * t,
    };
  } else if (aqi <= 200) {
    const t = (aqi - 150) / 50;
    return {
      r: Math.round(249 + (239 - 249) * t),
      g: Math.round(115 + (68 - 115) * t),
      b: Math.round(22 + (68 - 22) * t),
      a: 0.7 + (0.75 - 0.7) * t,
    };
  } else {
    const t = Math.min(1, (aqi - 200) / 90);
    return {
      r: Math.round(239 + (168 - 239) * t),
      g: Math.round(68 + (85 - 68) * t),
      b: Math.round(68 + (247 - 68) * t),
      a: 0.75 + (0.8 - 0.75) * t,
    };
  }
}

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ grid, visible = true }) => {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !grid || grid.length === 0) {
      setOverlayUrl(null);
      return;
    }

    const width = 640;
    const height = 640;

    // Offscreen rendering canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Buffer canvas for radial stamp accumulation
    const bufferCanvas = document.createElement('canvas');
    bufferCanvas.width = width;
    bufferCanvas.height = height;
    const bCtx = bufferCanvas.getContext('2d');
    if (!bCtx) return;

    const minLat = PUNE_HEATMAP_BOUNDS[0][0];
    const maxLat = PUNE_HEATMAP_BOUNDS[1][0];
    const minLon = PUNE_HEATMAP_BOUNDS[0][1];
    const maxLon = PUNE_HEATMAP_BOUNDS[1][1];

    // Radial distribution radius with overlap across neighbor nodes
    const radius = 95;

    // Render radial heat waves with Gaussian falloff
    grid.forEach((pt) => {
      const x = ((pt.lon - minLon) / (maxLon - minLon)) * width;
      const y = ((maxLat - pt.lat) / (maxLat - minLat)) * height;
      const c = getRampColor(pt.predicted_aqi);

      const grad = bCtx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`);
      grad.addColorStop(0.35, `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a * 0.75})`);
      grad.addColorStop(0.7, `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a * 0.3})`);
      grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);

      bCtx.fillStyle = grad;
      bCtx.beginPath();
      bCtx.arc(x, y, radius, 0, Math.PI * 2);
      bCtx.fill();
    });

    // Main canvas: draw buffer with Gaussian blur filter for fluid blending
    ctx.filter = 'blur(18px)';
    ctx.drawImage(bufferCanvas, 0, 0);
    ctx.filter = 'none';

    // Soft border feathering (vignette mask) so plume naturally dissipates
    ctx.globalCompositeOperation = 'destination-in';
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.28,
      width / 2,
      height / 2,
      width * 0.48
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 1)');
    vignette.addColorStop(0.85, 'rgba(0, 0, 0, 0.9)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';

    const dataUrl = canvas.toDataURL('image/png');
    setOverlayUrl(dataUrl);
  }, [grid, visible]);

  if (!visible || !overlayUrl) return null;

  return (
    <ImageOverlay
      key={overlayUrl}
      url={overlayUrl}
      bounds={PUNE_HEATMAP_BOUNDS}
      opacity={0.82}
      zIndex={10}
    />
  );
};
