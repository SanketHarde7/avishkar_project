'use client';

import React from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Station } from '@/types';
import { getAqiColor } from '@/lib/mockData';

interface Column3DLayerProps {
  stations: Station[];
  visible?: boolean;
  onSelectStation?: (station: Station) => void;
}

// Compute darker and lighter shades for 3D column facets
function getFacetShades(hexColor: string) {
  return {
    top: hexColor,
    front: hexColor,
    side: hexColor,
  };
}

export const Column3DLayer: React.FC<Column3DLayerProps> = ({
  stations,
  visible = true,
  onSelectStation,
}) => {
  if (!visible || !stations || stations.length === 0) return null;

  return (
    <>
      {stations.map((st) => {
        const color = getAqiColor(st.aqi);
        // Column height: 30px up to 105px proportional to AQI
        const heightPx = Math.max(30, Math.min(105, Math.round(st.aqi * 0.42 + 20)));
        const isWithheld = st.status === 'hidden_for_validation';

        // 2.5D Isometric extruded column markup
        const iconHtml = `
          <div class="column-3d-wrapper" style="position: relative; width: 44px; height: ${heightPx + 24}px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; cursor: pointer;">
            <!-- Column Top Value Cap -->
            <div style="
              width: 32px;
              height: 18px;
              background: ${color};
              border: 1.5px solid #0f172a;
              border-radius: 9999px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-size: 10px;
              font-weight: 700;
              font-family: monospace;
              letter-spacing: -0.02em;
              box-shadow: 0 3px 8px rgba(0,0,0,0.35);
              text-shadow: 0 1px 2px rgba(0,0,0,0.7);
              z-index: 10;
              transform: translateY(6px);
            ">
              ${st.aqi}
            </div>

            <!-- Vertical Extruded Prism Body -->
            <div style="
              width: 14px;
              height: ${heightPx}px;
              background: linear-gradient(90deg, ${color}cc 0%, ${color} 45%, ${color}ee 100%);
              border-left: 1px solid rgba(0,0,0,0.2);
              border-right: 1px solid rgba(0,0,0,0.45);
              opacity: 0.95;
              transition: height 0.3s ease;
              box-shadow: -2px 2px 6px rgba(0,0,0,0.25);
            "></div>

            <!-- Ground Base Anchor Shadow -->
            <div style="
              width: 22px;
              height: 7px;
              background: radial-gradient(ellipse at center, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0) 70%);
              border-radius: 50%;
              margin-top: -3px;
            "></div>

            ${isWithheld ? `
              <div style="
                position: absolute;
                bottom: -16px;
                background: #0f172a;
                border: 1px solid #334155;
                color: #f8fafc;
                font-size: 9px;
                font-weight: 600;
                padding: 1px 5px;
                border-radius: 2px;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              ">Holdout</div>
            ` : ''}
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-25d-column-icon',
          iconSize: [44, heightPx + 24],
          iconAnchor: [22, heightPx + 20],
        });

        return (
          <Marker
            key={`column-${st.station_id}`}
            position={[st.lat, st.lon]}
            icon={customIcon}
            eventHandlers={{
              click: () => onSelectStation?.(st),
            }}
          >
            <Tooltip direction="top" offset={[0, -(heightPx + 15)]} opacity={0.95}>
              <div className="bg-surface text-text-primary px-2.5 py-1.5 rounded-[2px] text-xs border border-border">
                <div className="font-semibold flex items-center gap-1.5">
                  <span>{st.name}</span>
                  {isWithheld && (
                    <span className="text-text-muted text-[10px] px-1 py-0.2 rounded bg-surface-raised border border-border">
                      Holdout
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-text-muted mt-0.5 tnum">
                  AQI <span className="font-semibold text-text-primary">{st.aqi}</span> (Height: {heightPx}m equivalent) · PM2.5{' '}
                  <span className="font-semibold text-text-primary">{st.pm25} µg/m³</span>
                </div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
};
