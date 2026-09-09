'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, X, Sparkles } from 'lucide-react';

export interface StreetLocation {
  name: string;
  area: string;
  lat: number;
  lon: number;
  category: 'Commercial' | 'Residential' | 'Tech Park' | 'Industrial' | 'Transit';
}

export const PUNE_PRESET_LOCATIONS: StreetLocation[] = [
  { name: 'FC Road (Fergusson College Road)', area: 'Deccan Gymkhana', lat: 18.5204, lon: 73.8402, category: 'Commercial' },
  { name: 'JM Road (Jangali Maharaj Road)', area: 'Shivajinagar', lat: 18.5262, lon: 73.8475, category: 'Commercial' },
  { name: 'Kothrud (Karve Statue & Paud Rd)', area: 'Kothrud', lat: 18.5074, lon: 73.8077, category: 'Residential' },
  { name: 'Karve Road (Near Garware College)', area: 'Erandwane', lat: 18.5042, lon: 73.8291, category: 'Commercial' },
  { name: 'Hinjewadi Phase 1 (Wipro Circle)', area: 'Hinjewadi IT Park', lat: 18.5912, lon: 73.7389, category: 'Tech Park' },
  { name: 'Hinjewadi Phase 2 & 3', area: 'Hinjewadi Phase 3', lat: 18.5840, lon: 73.7020, category: 'Tech Park' },
  { name: 'Baner High Street', area: 'Baner', lat: 18.5642, lon: 73.7769, category: 'Commercial' },
  { name: 'Viman Nagar (Near Phoenix Mall)', area: 'Viman Nagar', lat: 18.5679, lon: 73.9143, category: 'Commercial' },
  { name: 'Koregaon Park (North Main Road)', area: 'Koregaon Park', lat: 18.5362, lon: 73.8940, category: 'Residential' },
  { name: 'Aundh (Parihar Chowk)', area: 'Aundh', lat: 18.5580, lon: 73.8075, category: 'Commercial' },
  { name: 'Magarpatta Cybercity', area: 'Hadapsar', lat: 18.5147, lon: 73.9268, category: 'Tech Park' },
  { name: 'Kharadi (EON Free Zone)', area: 'Kharadi', lat: 18.5518, lon: 73.9512, category: 'Tech Park' },
  { name: 'Swargate Bus Terminal & Chowk', area: 'Swargate', lat: 18.5018, lon: 73.8586, category: 'Transit' },
  { name: 'Kalyani Nagar (Cerebrum IT Park)', area: 'Kalyani Nagar', lat: 18.5482, lon: 73.9034, category: 'Commercial' },
  { name: 'Senapati Bapat Road (ICC Towers)', area: 'SB Road', lat: 18.5322, lon: 73.8298, category: 'Commercial' },
  { name: 'Pashan (Panchawati & Lake)', area: 'Pashan', lat: 18.5410, lon: 73.7928, category: 'Residential' },
  { name: 'Bhosari MIDC (Industrial Hub)', area: 'Bhosari', lat: 18.6247, lon: 73.8488, category: 'Industrial' },
  { name: 'Wakad (Datta Mandir Chowk)', area: 'Wakad', lat: 18.5985, lon: 73.7652, category: 'Residential' },
  { name: 'Katraj (Dairy & Bharati Vidyapeeth)', area: 'Katraj', lat: 18.4575, lon: 73.8677, category: 'Residential' },
  { name: 'Savitribai Phule Pune University', area: 'Ganeshkhind', lat: 18.5529, lon: 73.8260, category: 'Residential' },
  { name: 'Bavdhan (Chandani Chowk Junction)', area: 'Bavdhan', lat: 18.5098, lon: 73.7745, category: 'Residential' },
  { name: 'Camp (MG Road & East Street)', area: 'Pune Cantonment', lat: 18.5167, lon: 73.8790, category: 'Commercial' },
];

const QUICK_CHIPS = [
  { label: 'FC Road', lat: 18.5204, lon: 73.8402, name: 'FC Road, Deccan Gymkhana' },
  { label: 'Kothrud', lat: 18.5074, lon: 73.8077, name: 'Kothrud (Karve Statue)' },
  { label: 'Hinjewadi', lat: 18.5912, lon: 73.7389, name: 'Hinjewadi Phase 1' },
  { label: 'Viman Nagar', lat: 18.5679, lon: 73.9143, name: 'Viman Nagar' },
  { label: 'Baner', lat: 18.5642, lon: 73.7769, name: 'Baner High Street' },
  { label: 'Aundh', lat: 18.5580, lon: 73.8075, name: 'Aundh (Parihar Chowk)' },
  { label: 'Magarpatta', lat: 18.5147, lon: 73.9268, name: 'Magarpatta Cybercity' },
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

  // Filter local presets or fallback to Nominatim
  useEffect(() => {
    if (!query.trim()) {
      setResults(PUNE_PRESET_LOCATIONS.slice(0, 6));
      return;
    }

    const q = query.toLowerCase().trim();
    const matched = PUNE_PRESET_LOCATIONS.filter(
      (loc) => loc.name.toLowerCase().includes(q) || loc.area.toLowerCase().includes(q)
    );

    if (matched.length > 0) {
      setResults(matched);
      setIsSearchingOnline(false);
    } else {
      // Search online via OpenStreetMap Nominatim for Pune
      const timer = setTimeout(async () => {
        setIsSearchingOnline(true);
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Pune')}&bounded=1&viewbox=73.70,18.70,74.05,18.40&limit=5`
          );
          if (resp.ok) {
            const data = await resp.json();
            const onlineResults: StreetLocation[] = data.map((item: any) => ({
              name: item.display_name.split(',')[0],
              area: item.display_name.split(',').slice(1, 3).join(',').trim(),
              lat: parseFloat(item.lat),
              lon: parseFloat(item.lon),
              category: 'Residential',
            }));
            setResults(onlineResults);
          }
        } catch (e) {
          console.error('Nominatim search failed:', e);
        } finally {
          setIsSearchingOnline(false);
        }
      }, 350);

      return () => clearTimeout(timer);
    }
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
      <div className="relative flex items-center bg-surface/95 backdrop-blur-md border border-border rounded-[6px] shadow-lg transition-all focus-within:border-accent">
        <div className="pl-3 pr-2 text-text-muted flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-text-secondary" />
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
          placeholder="Search your street, neighborhood or landmark in Pune... (Press '/' to focus)"
          className="w-full py-2 bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
        />

        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="px-2 text-text-muted hover:text-text-primary"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="h-4 w-[1px] bg-border mx-1"></div>

        {/* GPS Button */}
        <button
          onClick={onDetectLocation}
          disabled={isLocating}
          className="px-3 py-1.5 mr-1 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary hover:text-accent hover:bg-surface-raised rounded-[4px] transition-colors"
          title="Detect my current location"
        >
          <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-accent' : ''}`} />
          <span className="hidden sm:inline">GPS</span>
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface/95 backdrop-blur-md border border-border rounded-[6px] shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-text-muted border-b border-border/50 flex items-center justify-between">
            <span>{query ? 'MATCHING PUNE STREETS & LOCALITIES' : 'POPULAR PUNE NEIGHBORHOODS'}</span>
            {isSearchingOnline && (
              <span className="flex items-center gap-1 text-accent">
                <Sparkles className="w-3 h-3 animate-pulse" />
                Geocoding...
              </span>
            )}
          </div>

          {results.length === 0 ? (
            <div className="p-4 text-center text-xs text-text-muted">
              No matching streets found in Pune. Try searching for major landmarks or neighborhoods.
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {results.map((loc, idx) => (
                <button
                  key={`${loc.name}-${idx}`}
                  onClick={() => handleSelect(loc)}
                  className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-surface-raised transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-text-muted group-hover:text-accent transition-colors flex-shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                        {loc.name}
                      </div>
                      <div className="text-[10px] text-text-muted truncate">{loc.area}</div>
                    </div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-raised border border-border text-text-muted flex-shrink-0 ml-2">
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
          className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-[4px] bg-surface/90 border border-border text-text-secondary hover:text-accent hover:border-accent/40 transition-colors whitespace-nowrap flex-shrink-0"
        >
          <Navigation className="w-2.5 h-2.5 text-accent" />
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
            className="text-[10px] px-2 py-1 rounded-[4px] bg-surface/80 border border-border/80 text-text-muted hover:text-text-primary hover:border-border-strong hover:bg-surface-raised transition-colors whitespace-nowrap flex-shrink-0"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
};
