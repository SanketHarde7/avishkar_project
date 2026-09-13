'use client';

import React, { useEffect, useState } from 'react';
import { ImageOverlay } from 'react-leaflet';
import { GridPoint, Station } from '@/types';

interface HeatmapLayerProps {
  grid?: GridPoint[];
  stations?: Station[];
  bounds?: [[number, number], [number, number]];
  visible?: boolean;
  windSpeedKmh?: number;
  windDirectionDeg?: number;
  u?: number;
  v?: number;
  center?: [number, number];
}

// Fallback bounding box for Pune metropolitan area
const DEFAULT_HEATMAP_BOUNDS: [[number, number], [number, number]] = [
  [18.38, 73.68],
  [18.68, 74.02],
];

/**
 * Continuous Color Ramp calibrated to official CPCB severity breakpoints:
 * - 0 - 50 AQI: #10b981 (Emerald Green - Good)
 * - 51 - 100 AQI: #84cc16 (Lime Green - Satisfactory)
 * - 101 - 200 AQI: #eab308 (Yellow/Amber - Moderate)
 * - 201 - 300 AQI: #f97316 (Orange - Poor)
 * - 301 - 400 AQI: #ef4444 (Red - Very Poor)
 * - 401+ AQI: #881337 (Deep Maroon - Severe)
 */
function getRampColor(aqi: number): { r: number; g: number; b: number; a: number } {
  if (aqi <= 50) {
    const t = Math.max(0, Math.min(1, aqi / 50));
    return {
      r: Math.round(16 + (132 - 16) * t),
      g: Math.round(185 + (204 - 185) * t),
      b: Math.round(129 + (22 - 129) * t),
      a: 0.52 + (0.60 - 0.52) * t,
    };
  } else if (aqi <= 100) {
    const t = (aqi - 50) / 50;
    return {
      r: Math.round(132 + (234 - 132) * t),
      g: Math.round(204 + (179 - 204) * t),
      b: Math.round(22 + (8 - 22) * t),
      a: 0.60 + (0.68 - 0.60) * t,
    };
  } else if (aqi <= 200) {
    const t = (aqi - 100) / 100;
    return {
      r: Math.round(234 + (249 - 234) * t),
      g: Math.round(179 + (115 - 179) * t),
      b: Math.round(8 + (22 - 8) * t),
      a: 0.68 + (0.76 - 0.68) * t,
    };
  } else if (aqi <= 300) {
    const t = (aqi - 200) / 100;
    return {
      r: Math.round(249 + (239 - 249) * t),
      g: Math.round(115 + (68 - 115) * t),
      b: Math.round(22 + (68 - 22) * t),
      a: 0.76 + (0.84 - 0.76) * t,
    };
  } else if (aqi <= 400) {
    const t = (aqi - 300) / 100;
    return {
      r: Math.round(239 + (136 - 239) * t),
      g: Math.round(68 + (19 - 68) * t),
      b: Math.round(68 + (55 - 68) * t),
      a: 0.84 + (0.90 - 0.84) * t,
    };
  } else {
    return {
      r: 136,
      g: 19,
      b: 55,
      a: 0.92,
    };
  }
}

/**
 * Cubic Hermite smoothstep for natural organic atmospheric dissipation
 */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({
  grid,
  stations,
  visible = true,
  bounds: propBounds,
  windSpeedKmh = 10,
  windDirectionDeg = 245,
  u = 2.0,
  v = 0.0,
  center,
}) => {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [activeBounds, setActiveBounds] = useState<[[number, number], [number, number]]>(DEFAULT_HEATMAP_BOUNDS);

  useEffect(() => {
    if (!visible) {
      setOverlayUrl(null);
      return;
    }

    // Assemble all reference observations (ground truth stations + continuous PINN grid)
    interface PointData {
      lat: number;
      lon: number;
      aqi: number;
      weight: number;
    }

    const allPoints: PointData[] = [];

    if (stations && stations.length > 0) {
      for (const st of stations) {
        allPoints.push({
          lat: st.lat,
          lon: st.lon,
          aqi: st.aqi,
          weight: 2.2, // Higher weight for calibrated physical ground sensors
        });
      }
    }

    if (grid && grid.length > 0) {
      for (const pt of grid) {
        allPoints.push({
          lat: pt.lat,
          lon: pt.lon,
          aqi: pt.predicted_aqi,
          weight: 1.0,
        });
      }
    }

    if (allPoints.length === 0) {
      setOverlayUrl(null);
      return;
    }

    // Calculate core data limits
    const lats = allPoints.map((p) => p.lat);
    const lons = allPoints.map((p) => p.lon);
    const rawMinLat = Math.min(...lats);
    const rawMaxLat = Math.max(...lats);
    const rawMinLon = Math.min(...lons);
    const rawMaxLon = Math.max(...lons);

    // Expand bounding box with generous 28% natural breathing margin
    // This guarantees that the organic atmospheric falloff decays completely to 0 alpha BEFORE reaching canvas borders
    const latMargin = Math.max(0.045, (rawMaxLat - rawMinLat) * 0.28);
    const lonMargin = Math.max(0.055, (rawMaxLon - rawMinLon) * 0.28);
    const minLat = rawMinLat - latMargin;
    const maxLat = rawMaxLat + latMargin;
    const minLon = rawMinLon - lonMargin;
    const maxLon = rawMaxLon + lonMargin;

    const centerLat = center ? center[0] : (rawMinLat + rawMaxLat) / 2;
    const centerLon = center ? center[1] : (rawMinLon + rawMaxLon) / 2;

    const resolvedBounds: [[number, number], [number, number]] = [
      [minLat, minLon],
      [maxLat, maxLon],
    ];
    setActiveBounds(resolvedBounds);

    // High definition 260x260 canvas with bilinear smoothing across Leaflet map
    const width = 260;
    const height = 260;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Unit wind direction vector for dynamic physical advection elongation
    const speed = Math.sqrt(u * u + v * v);
    const uNorm = speed > 0.1 ? u / speed : 1.0;
    const vNorm = speed > 0.1 ? v / speed : 0.0;
    const cosLat = Math.cos((centerLat * Math.PI) / 180);

    const numPoints = allPoints.length;
    let pixelIdx = 0;

    for (let py = 0; py < height; py++) {
      const vPos = py / (height - 1);
      const lat = maxLat - vPos * (maxLat - minLat);

      for (let px = 0; px < width; px++) {
        const uPos = px / (width - 1);
        const lon = minLon + uPos * (maxLon - minLon);

        // Calculate minimum distance to any observation point
        let minD = 1e9;
        let wSum = 0;
        let totW = 0;

        for (let i = 0; i < numPoints; i++) {
          const pt = allPoints[i];
          const dy = (lat - pt.lat) * 111.0;
          const dx = (lon - pt.lon) * 111.0 * cosLat;
          const d = Math.sqrt(dx * dx + dy * dy);

          if (d < minD) {
            minD = d;
          }

          // Wind advection coordinate transformation (elongates downwind plume)
          const dDown = dx * uNorm + dy * vNorm;
          const dCross = -dx * vNorm + dy * uNorm;

          let dEff: number;
          if (dDown > 0) {
            // Downwind plume dispersion corridor
            dEff = Math.sqrt(dCross * dCross + (dDown / 1.45) * (dDown / 1.45));
          } else {
            // Sharper upwind boundary
            dEff = Math.sqrt(dCross * dCross + (dDown * 1.35) * (dDown * 1.35));
          }

          const w = pt.weight / Math.pow(dEff + 0.38, 2.1);
          wSum += pt.aqi * w;
          totW += w;
        }

        // Distance from metropolitan network center
        const dyC = (lat - centerLat) * 111.0;
        const dxC = (lon - centerLon) * 111.0 * cosLat;
        const dCenter = Math.sqrt(dxC * dxC + dyC * dyC);

        // Organic atmospheric envelope:
        // Connected urban core retains full continuous opacity;
        // Outer boundaries dissolve smoothly to zero with zero rectangular borders
        const covD = minD <= 4.0 ? minD : Math.min(minD, Math.max(0, dCenter - 8.5));
        if (covD >= 6.8) {
          data[pixelIdx] = 0;
          data[pixelIdx + 1] = 0;
          data[pixelIdx + 2] = 0;
          data[pixelIdx + 3] = 0;
          pixelIdx += 4;
          continue;
        }

        const falloff = covD <= 3.2 ? 1.0 : 1.0 - smoothstep(3.2, 6.8, covD);
        if (falloff <= 0.005) {
          data[pixelIdx] = 0;
          data[pixelIdx + 1] = 0;
          data[pixelIdx + 2] = 0;
          data[pixelIdx + 3] = 0;
          pixelIdx += 4;
          continue;
        }

        const interpolatedAqi = totW > 0 ? wSum / totW : 35;
        const color = getRampColor(interpolatedAqi);

        data[pixelIdx] = color.r;
        data[pixelIdx + 1] = color.g;
        data[pixelIdx + 2] = color.b;
        data[pixelIdx + 3] = Math.round(color.a * falloff * 255);

        pixelIdx += 4;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    setOverlayUrl(dataUrl);
  }, [grid, stations, visible, propBounds, u, v, center]);

  if (!visible || !overlayUrl) return null;

  return (
    <ImageOverlay
      key="continuous-pinn-heatmap"
      url={overlayUrl}
      bounds={activeBounds}
      opacity={0.72}
      zIndex={10}
    />
  );
};
