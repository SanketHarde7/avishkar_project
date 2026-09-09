'use client';

import React from 'react';
import { CITIES } from '@/lib/mockData';
import { CityOption } from '@/types';
import { LocateFixed, Activity, Cpu, Loader2, Network } from 'lucide-react';

interface NavbarProps {
  selectedCity: CityOption;
  onSelectCity: (city: CityOption) => void;
  activeTab: 'monitor' | 'sensor_optimization' | 'under_the_hood';
  onSelectTab: (tab: 'monitor' | 'sensor_optimization' | 'under_the_hood') => void;
  onDetectLocation: () => void;
  isLocating?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedCity,
  onSelectCity,
  activeTab,
  onSelectTab,
  onDetectLocation,
  isLocating = false,
}) => {
  return (
    <header className="h-[56px] w-full bg-surface border-b border-border px-4 flex items-center justify-between z-50 select-none">
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <div>
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-[15px] font-semibold tracking-tight text-text-primary">
              AirAware
            </h1>
            <span className="hidden md:inline text-[11px] text-text-muted">
              Physics-Informed Urban Air Intelligence
            </span>
          </div>
        </div>
      </div>

      {/* Center: Top Level Tab Switcher (Live Monitor vs Sensor Optimization vs Under-the-Hood) */}
      <div className="flex items-center bg-surface-raised p-1 rounded-[6px] border border-border text-xs">
        <button
          onClick={() => onSelectTab('monitor')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-[4px] font-medium transition-colors ${
            activeTab === 'monitor'
              ? 'bg-surface text-accent border border-border-strong shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Live Monitor</span>
        </button>

        <button
          onClick={() => onSelectTab('sensor_optimization')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-[4px] font-medium transition-colors ${
            activeTab === 'sensor_optimization'
              ? 'bg-surface text-accent border border-border-strong shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Sensor Optimization</span>
          <span className="text-[9px] font-semibold tracking-wider uppercase px-1 py-0.2 rounded bg-accent/20 text-accent border border-accent/30 hidden lg:inline">
            Planner
          </span>
        </button>

        <button
          onClick={() => onSelectTab('under_the_hood')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-[4px] font-medium transition-colors ${
            activeTab === 'under_the_hood'
              ? 'bg-surface text-accent border border-border-strong shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Under the Hood</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        </button>
      </div>

      {/* Right: Controls & Location Detection */}
      <div className="flex items-center gap-2">
        {/* Detect My Location Button */}
        <button
          id="detect-location-btn"
          onClick={onDetectLocation}
          disabled={isLocating}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-accent-muted/40 hover:bg-accent-muted/60 text-accent border border-accent/40 hover:border-accent/60 text-xs font-medium transition-colors disabled:opacity-50"
          title="Detect my current location and estimate live local AQI"
        >
          {isLocating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LocateFixed className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">
            {isLocating ? 'Locating...' : 'My Location'}
          </span>
        </button>

        {/* City Selector */}
        <div className="flex items-center bg-surface-raised border border-border rounded-[6px] px-2 py-1.5 text-xs text-text-secondary hover:border-border-strong transition-colors">
          <select
            value={selectedCity.id}
            onChange={(e) => {
              const city = CITIES.find((c) => c.id === e.target.value);
              if (city) onSelectCity(city);
            }}
            className="bg-transparent text-text-primary font-medium focus:outline-none cursor-pointer pr-1 max-w-[160px] truncate"
            title={selectedCity.name}
          >
            {!CITIES.some((c) => c.id === selectedCity.id) && (
              <option value={selectedCity.id} className="bg-surface text-text-primary">
                📍 {selectedCity.name}
              </option>
            )}
            {CITIES.map((c) => (
              <option key={c.id} value={c.id} className="bg-surface text-text-primary">
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
