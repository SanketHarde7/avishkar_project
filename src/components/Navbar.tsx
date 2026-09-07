'use client';

import React from 'react';
import { CITIES } from '@/lib/mockData';
import { CityOption } from '@/types';
import { FlaskConical } from 'lucide-react';

interface NavbarProps {
  selectedCity: CityOption;
  onSelectCity: (city: CityOption) => void;
  isJudgeMode: boolean;
  onToggleJudgeMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedCity,
  onSelectCity,
  isJudgeMode,
  onToggleJudgeMode,
}) => {
  return (
    <header className="h-[56px] w-full bg-neutral-950 border-b border-neutral-800 px-4 flex items-center justify-between z-50 select-none">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-sky-400/90" />
        <div>
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-[15px] font-semibold tracking-tight text-neutral-100">
              AirAware
            </h1>
            <span className="hidden sm:inline text-[11px] text-neutral-500">
              Continuous Air Quality Intelligence
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* City Selector */}
        <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-md px-2.5 py-1.5 text-xs text-neutral-300 hover:border-neutral-700 transition-colors">
          <select
            value={selectedCity.id}
            onChange={(e) => {
              const city = CITIES.find((c) => c.id === e.target.value);
              if (city) onSelectCity(city);
            }}
            className="bg-transparent text-neutral-200 font-medium focus:outline-none cursor-pointer pr-1"
          >
            {CITIES.map((c) => (
              <option key={c.id} value={c.id} className="bg-neutral-900 text-neutral-200">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Validation Mode Toggle */}
        <button
          id="judge-mode-toggle"
          onClick={onToggleJudgeMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isJudgeMode
              ? 'bg-sky-500/15 text-sky-300 border border-sky-500/40'
              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          <span>Validation</span>
          {isJudgeMode && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
        </button>
      </div>
    </header>
  );
};
