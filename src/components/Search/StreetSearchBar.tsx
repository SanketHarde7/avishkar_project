'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, X, Sparkles } from 'lucide-react';
import { searchPlacesPanIndia } from '@/lib/geocoding';

export interface StreetLocation {
  name: string;
  area: string;
  lat: number;
  lon: number;
  category: 'Commercial' | 'Residential' | 'Tech Park' | 'Industrial' | 'Transit' | 'Landmark' | 'City';
}

export const PAN_INDIA_PRESET_LOCATIONS: StreetLocation[] = [
  { name: 'FC Road (Fergusson College Road)', area: 'Deccan Gymkhana, Pune', lat: 18.5204, lon: 73.8402, category: 'Commercial' },
  { name: 'Connaught Place', area: 'Central Delhi, New Delhi', lat: 28.6315, lon: 77.2167, category: 'Commercial' },
  { name: 'Marine Drive & Nariman Point', area: 'South Mumbai, Maharashtra', lat: 18.9438, lon: 72.8232, category: 'Landmark' },
  { name: 'Hinjewadi IT Park', area: 'Pimpri-Chinchwad, Pune', lat: 18.5912, lon: 73.7389, category: 'Tech Park' },
  { name: 'MG Road & Brigade Road', area: 'Central Bengaluru, Karnataka', lat: 12.9756, lon: 77.6066, category: 'Commercial' },
  { name: 'Sector 62 IT Hub', area: 'Noida, Uttar Pradesh', lat: 28.6276, lon: 77.3639, category: 'Tech Park' },
  { name: 'Bandra Kurla Complex (BKC)', area: 'Bandra East, Mumbai', lat: 19.0657, lon: 72.8687, category: 'Commercial' },
  { name: 'Kothrud (Karve Road)', area: 'Kothrud, Pune', lat: 18.5074, lon: 73.8077, category: 'Residential' },
];

const QUICK_CHIPS = [
  { label: 'Pune', lat: 18.5204, lon: 73.8567, name: 'Pune, Maharashtra' },
  { label: 'Mumbai', lat: 19.0760, lon: 72.8777, name: 'Mumbai, Maharashtra' },
  { label: 'Delhi NCR', lat: 28.6139, lon: 77.2090, name: 'Delhi NCR' },
  { label: 'Bengaluru', lat: 12.9716, lon: 77.5946, name: 'Bengaluru, Karnataka' },
  { label: 'Nashik', lat: 19.9975, lon: 73.7898, name: 'Nashik, Maharashtra' },
  { label: 'Hinjewadi', lat: 18.5912, lon: 73.7389, name: 'Hinjewadi Phase 1, Pune' },
];

interface StreetSearchBarProps {
  onSelectLocation: (lat: number, lon: number, name: string) => void;
  onDetectLocation: () => void;
  isLocating?: boolean;
}

export const StreetSearchBar: React.FC<StreetSearchBarProps> = ({
  onSelectLocation,
  onDetectLocation,
  isLocating = false,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<StreetLocation[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Press "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter local presets or fallback to Pan-India Nominatim search
  useEffect(() => {
    if (!query.trim()) {
      setResults(PAN_INDIA_PRESET_LOCATIONS.slice(0, 6));
      return;
    }

    const q = query.toLowerCase().trim();
    const matched = PAN_INDIA_PRESET_LOCATIONS.filter(
      (loc) => loc.name.toLowerCase().includes(q) || loc.area.toLowerCase().includes(q)
    );

    // Search online via OpenStreetMap Nominatim across Pan-India
    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        const onlineResults = await searchPlacesPanIndia(query);
        if (onlineResults.length > 0) {
          setResults(onlineResults);
        } else if (matched.length > 0) {
          setResults(matched);
        } else {
          setResults([]);
        }
      } catch (e) {
        console.error('Pan-India Nominatim search failed:', e);
        setResults(matched);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (loc: StreetLocation) => {
    setQuery(loc.name);
    setIsOpen(false);
    onSelectLocation(loc.lat, loc.lon, `${loc.name}, ${loc.area}`);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-xl z-[1000]"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Search Input Box */}
      <div className="relative flex items-center bg-[#0f1117]/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.45)] transition-all focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/50">
        <div className="pl-3 pr-2 text-slate-400 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-300" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search any street, town, or city across India... (Press '/' to focus)"
          className="w-full py-2 bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none font-medium"
        />

        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="px-2 text-slate-400 hover:text-white transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="h-4 w-[1px] bg-slate-700 mx-1"></div>

        {/* GPS Button */}
        <button
          onClick={onDetectLocation}
          disabled={isLocating}
          className="px-3 py-1.5 mr-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-200 hover:text-amber-300 hover:bg-slate-800/90 rounded-[6px] transition-colors"
          title="Detect my current location"
        >
          <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
          <span className="hidden sm:inline">GPS</span>
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f1117]/98 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-[0_16px_40px_rgba(0,0,0,0.6)] overflow-hidden max-h-72 overflow-y-auto z-[1100]">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 border-b border-slate-800 flex items-center justify-between">
            <span>{query ? 'PAN-INDIA SEARCH RESULTS' : 'POPULAR CITIES & LOCALITIES'}</span>
            {isSearchingOnline && (
              <span className="flex items-center gap-1 text-amber-400">
                <Sparkles className="w-3 h-3 animate-pulse" />
                Geocoding...
              </span>
            )}
          </div>

          {results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              {isSearchingOnline
                ? 'Searching OpenStreetMap across India...'
                : 'No matching places found. Try typing a street, landmark, town, or city.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {results.map((loc, idx) => (
                <button
                  key={`${loc.name}-${idx}`}
                  onClick={() => handleSelect(loc)}
                  className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800/80 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors flex-shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                        {loc.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{loc.area}</div>
                    </div>
                  </div>
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 flex-shrink-0 ml-2">
                    {loc.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Select Neighborhood Chips */}
      <div
        className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar pb-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDetectLocation();
          }}
          className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-[6px] bg-[#0f1117]/95 border border-amber-500/50 text-amber-300 hover:bg-amber-500/20 shadow-[0_4px_14px_rgba(0,0,0,0.4)] transition-all whitespace-nowrap flex-shrink-0"
        >
          <Navigation className="w-2.5 h-2.5 text-amber-400" />
          <span>My Location</span>
        </button>

        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectLocation(chip.lat, chip.lon, chip.name);
            }}
            className="text-[10px] font-medium px-2.5 py-1 rounded-[6px] bg-[#0f1117]/95 border border-slate-700/90 text-slate-200 hover:text-amber-300 hover:border-amber-400/80 hover:bg-slate-800 shadow-[0_4px_14px_rgba(0,0,0,0.4)] transition-all whitespace-nowrap flex-shrink-0"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
};
