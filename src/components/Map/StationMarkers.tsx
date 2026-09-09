'use client';

import React from 'react';
import { CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { Station } from '@/types';
import { getAqiColor } from '@/lib/mockData';

interface StationMarkersProps {
  stations: Station[];
  isJudgeMode: boolean;
  onSelectStation?: (station: Station) => void;
}

export const StationMarkers: React.FC<StationMarkersProps> = ({
  stations,
  isJudgeMode,
  onSelectStation,
}) => {
  return (
    <>
      {stations.map((st) => {
        const isHiddenValidation = st.status === 'hidden_for_validation';
        const aqiColor = getAqiColor(st.aqi);

        // Highlight withheld validation stations with dashed border in Judge Mode
        const markerOptions = isHiddenValidation && isJudgeMode
          ? {
              color: '#0f172a',
              weight: 2,
              dashArray: '4, 3',
              fillColor: '#475569',
              fillOpacity: 0.95,
              radius: 9,
            }
          : {
              color: '#0f172a',
              weight: 2,
              fillColor: aqiColor,
              fillOpacity: 0.95,
              radius: 8,
            };

        return (
          <CircleMarker
            key={st.station_id}
            center={[st.lat, st.lon]}
            pathOptions={markerOptions}
            eventHandlers={{
              click: () => onSelectStation?.(st),
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <div className="bg-surface text-text-primary px-2.5 py-1.5 rounded-[2px] text-xs border border-border">
                <div className="font-semibold flex items-center gap-1.5">
                  <span>{st.name}</span>
                  {isHiddenValidation && isJudgeMode && (
                    <span className="text-text-secondary text-[10px] px-1.5 py-0.5 rounded-[2px] border border-border-strong bg-surface-raised">
                      Holdout
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-text-muted mt-0.5 tnum">
                  AQI <span className="font-semibold text-text-primary">{st.aqi}</span> · PM2.5{' '}
                  <span className="font-semibold text-text-primary">{st.pm25} µg/m³</span>
                </div>
              </div>
            </Tooltip>

            <Popup className="custom-leaflet-popup">
              <div className="p-1 min-w-[200px] text-text-primary font-sans">
                <div className="text-[10px] font-medium text-text-muted">
                  CPCB ground station
                </div>
                <div className="text-sm font-bold text-text-primary mt-0.5">{st.name}</div>

                {isHiddenValidation && isJudgeMode && (
                  <div className="my-2 p-1.5 bg-surface-raised rounded-[2px] border border-border text-xs text-text-secondary font-medium">
                    <strong>Validation sensor:</strong> withheld during training to independently
                    measure generalization accuracy.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border text-xs">
                  <div>
                    <div className="text-text-muted">Recorded AQI</div>
                    <div className="text-base font-bold tnum" style={{ color: aqiColor }}>
                      {st.aqi}
                    </div>
                  </div>
                  <div>
                    <div className="text-text-muted">PM2.5</div>
                    <div className="text-base font-bold text-text-primary tnum">{st.pm25} µg/m³</div>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-text-muted flex justify-between">
                  <span>Status</span>
                  <span className="font-semibold capitalize text-text-secondary">
                    {isHiddenValidation ? 'Evaluation holdout' : 'Active'}
                  </span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
};
