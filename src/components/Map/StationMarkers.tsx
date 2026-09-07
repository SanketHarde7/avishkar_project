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
              color: '#e5e5e5',
              weight: 2.5,
              dashArray: '4, 3',
              fillColor: '#a3a3a3',
              fillOpacity: 0.95,
              radius: 10,
            }
          : {
              color: '#0a0a0a',
              weight: 1.5,
              fillColor: aqiColor,
              fillOpacity: 0.9,
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
              <div className="bg-neutral-900 text-neutral-200 px-2.5 py-1.5 rounded-md text-xs shadow-lg border border-neutral-700">
                <div className="font-semibold flex items-center gap-1.5">
                  <span>{st.name}</span>
                  {isHiddenValidation && isJudgeMode && (
                    <span className="text-neutral-400 text-[10px] px-1.5 py-0.5 rounded border border-neutral-600">
                      Holdout
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5 tnum">
                  AQI <span className="font-semibold text-neutral-100">{st.aqi}</span> · PM2.5{' '}
                  <span className="font-semibold text-neutral-100">{st.pm25} µg/m³</span>
                </div>
              </div>
            </Tooltip>

            <Popup className="custom-leaflet-popup">
              <div className="p-1 min-w-[200px] text-neutral-900 font-sans">
                <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  CPCB Ground Station
                </div>
                <div className="text-sm font-bold text-neutral-900 mt-0.5">{st.name}</div>

                {isHiddenValidation && isJudgeMode && (
                  <div className="my-2 p-1.5 bg-neutral-100 rounded border border-neutral-200 text-xs text-neutral-700 font-medium">
                    <strong>Validation sensor:</strong> withheld during training to independently
                    measure generalization accuracy.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-neutral-200 text-xs">
                  <div>
                    <div className="text-neutral-500">Recorded AQI</div>
                    <div className="text-base font-bold tnum" style={{ color: aqiColor }}>
                      {st.aqi}
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-500">PM2.5</div>
                    <div className="text-base font-bold text-neutral-800 tnum">{st.pm25} µg/m³</div>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-neutral-500 flex justify-between">
                  <span>Status</span>
                  <span className="font-semibold capitalize text-neutral-700">
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
