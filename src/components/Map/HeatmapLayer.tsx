'use client';

import React, { useEffect, useState } from 'react';
import { ImageOverlay } from 'react-leaflet';
import { GridPoint } from '@/types';

interface HeatmapLayerProps {
  grid: GridPoint[];
  visible?: boolean;
}

// Bounding box for continuous spatial field overlay across Pune
const PUNE_HEATMAP_BOUNDS: [[number, number], [number, number]] = [
  [18.45, 73.75],
  [18.65, 73.98],
];

/**
 * Continuous Color & Severity-Scaled Alpha Ramp (Tuned for light basemap contrast):
 * - 0 - 50 AQI: rgb(34, 197, 94) (Green) translucent wash (alpha ~0.18 - 0.26)
 * - 51 - 100 AQI: rgb(234, 179, 8) (Yellow) (alpha ~0.26 - 0.44)
 * - 101 - 150 AQI: rgb(249, 115, 22) (Orange) (alpha ~0.44 - 0.62)
 * - 151 - 200 AQI: rgb(239, 68, 68) (Red) (alpha ~0.62 - 0.78)
 * - 201+ AQI: rgb(168, 85, 247) (Purple) vivid focus (alpha ~0.78 - 0.88)
 */
function getRampColor(aqi: number): { r: number; g: number; b: number; a: number } {
  if (aqi <= 50) {
    const t = Math.max(0, Math.min(1, aqi / 50));
    return {
      r: 34,
      g: 197,
      b: 94,
      a: 0.18 + (0.26 - 0.18) * t,
    };
  } else if (aqi <= 100) {
    const t = (aqi - 50) / 50;
    return {
      r: Math.round(34 + (234 - 34) * t),
      g: Math.round(197 + (179 - 197) * t),
      b: Math.round(94 + (8 - 94) * t),
      a: 0.26 + (0.44 - 0.26) * t,
    };
  } else if (aqi <= 150) {
    const t = (aqi - 100) / 50;
    return {
      r: Math.round(234 + (249 - 234) * t),
      g: Math.round(179 + (115 - 179) * t),
      b: Math.round(8 + (22 - 8) * t),
      a: 0.44 + (0.62 - 0.44) * t,
    };
  } else if (aqi <= 200) {
    const t = (aqi - 150) / 50;
    return {
      r: Math.round(249 + (239 - 249) * t),
      g: Math.round(115 + (68 - 115) * t),
      b: Math.round(22 + (68 - 22) * t),
      a: 0.62 + (0.78 - 0.62) * t,
    };
  } else {
    const t = Math.min(1, (aqi - 200) / 100);
    return {
      r: Math.round(239 + (168 - 239) * t),
      g: Math.round(68 + (85 - 68) * t),
      b: Math.round(68 + (247 - 68) * t),
      a: 0.78 + (0.88 - 0.78) * t,
    };
  }
}

/**
 * Smoothstep function for natural rectangular edge feathering
 */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ grid, visible = true }) => {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !grid || grid.length === 0) {
      setOverlayUrl(null);
      return;
    }

    const minLat = PUNE_HEATMAP_BOUNDS[0][0];
    const maxLat = PUNE_HEATMAP_BOUNDS[1][0];
    const minLon = PUNE_HEATMAP_BOUNDS[0][1];
    const maxLon = PUNE_HEATMAP_BOUNDS[1][1];

    // Downsampled canvas grid (160x160) for fast, frame-rate safe execution
    // Leaflet's ImageOverlay upscales with bilinear smoothing across the viewport
    const width = 160;
    const height = 160;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Precompute normalized positions [0, 1] for all input grid points
    const points = grid.map((pt) => ({
      x: (pt.lon - minLon) / (maxLon - minLon),
      y: (maxLat - pt.lat) / (maxLat - minLat),
      aqi: pt.predicted_aqi,
    }));

    const numPoints = points.length;
    const kNeighbors = Math.min(8, numPoints);

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Scratch buffers for k-nearest neighbor selection
    const bestDist = new Float32Array(kNeighbors);
    const bestAqi = new Float32Array(kNeighbors);

    // 15% rectangular edge feathering margin
    const featherMargin = 0.15;

    let pixelIdx = 0;
    for (let py = 0; py < height; py++) {
      const v = py / (height - 1);
      const distY = Math.min(v, 1 - v);
      const featherY = smoothstep(0, featherMargin, distY);

      for (let px = 0; px < width; px++) {
        const u = px / (width - 1);
        const distX = Math.min(u, 1 - u);
        const featherX = smoothstep(0, featherMargin, distX);

        // Combined natural rectangular edge feather
        const feather = featherX * featherY;

        if (feather <= 0.001) {
          // Fully transparent outside/at the bounding box edge
          data[pixelIdx] = 0;
          data[pixelIdx + 1] = 0;
          data[pixelIdx + 2] = 0;
          data[pixelIdx + 3] = 0;
          pixelIdx += 4;
          continue;
        }

        // Find k-nearest grid points for local IDW interpolation
        bestDist.fill(Infinity);
        let exactAqi: number | null = null;

        for (let i = 0; i < numPoints; i++) {
          const dx = u - points[i].x;
          const dy = v - points[i].y;
          const d2 = dx * dx + dy * dy;

          if (d2 < 1e-8) {
            exactAqi = points[i].aqi;
            break;
          }

          if (d2 < bestDist[kNeighbors - 1]) {
            let j = kNeighbors - 2;
            while (j >= 0 && d2 < bestDist[j]) {
              bestDist[j + 1] = bestDist[j];
              bestAqi[j + 1] = bestAqi[j];
              j--;
            }
            bestDist[j + 1] = d2;
            bestAqi[j + 1] = points[i].aqi;
          }
        }

        let interpolatedAqi: number;
        if (exactAqi !== null) {
          interpolatedAqi = exactAqi;
        } else {
          let weightSum = 0;
          let aqiWeightSum = 0;
          for (let k = 0; k < kNeighbors; k++) {
            // Power parameter p = 2 (inverse squared distance)
            const w = 1 / bestDist[k];
            aqiWeightSum += w * bestAqi[k];
            weightSum += w;
          }
          interpolatedAqi = weightSum > 0 ? aqiWeightSum / weightSum : 0;
        }

        const color = getRampColor(interpolatedAqi);
        data[pixelIdx] = color.r;
        data[pixelIdx + 1] = color.g;
        data[pixelIdx + 2] = color.b;
        data[pixelIdx + 3] = Math.round(color.a * feather * 255);

        pixelIdx += 4;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    setOverlayUrl(dataUrl);
  }, [grid, visible]);

  if (!visible || !overlayUrl) return null;

  return (
    <ImageOverlay
      key={overlayUrl}
      url={overlayUrl}
      bounds={PUNE_HEATMAP_BOUNDS}
      opacity={0.62}
      zIndex={10}
    />
  );
};
