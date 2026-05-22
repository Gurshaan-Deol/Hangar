"use client";

import { useEffect, useRef, useState } from "react";
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  Pencil,
  RefreshCw,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { reverseGeocode, searchCity } from "@/lib/api";
import type { WeatherData } from "@/types/recommendations";
import type { GeocodingResult, StoredLocation } from "@/types/geocoding";

const LOCATION_KEY = "hangar_weather_location";

const CONDITION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  clear: Sun,
  cloudy: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  stormy: CloudLightning,
  foggy: Wind,
};

const CONDITION_ICON_CLASS: Record<string, string> = {
  clear: "text-yellow-400",
  cloudy: "text-gray-300",
  rain: "text-blue-400",
  snow: "text-blue-100",
  stormy: "text-purple-400",
  foggy: "text-gray-400",
};

interface WeatherWidgetProps {
  weather: WeatherData;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onLocationChange?: (lat: number, lon: number) => void;
}

export function WeatherWidget({
  weather,
  onRefresh,
  isRefreshing = false,
  onLocationChange,
}: WeatherWidgetProps) {
  const [cityDisplay, setCityDisplay] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: restore city from localStorage, or reverse-geocode the current coords.
  useEffect(() => {
    const stored = localStorage.getItem(LOCATION_KEY);
    if (stored) {
      try {
        const parsed: StoredLocation = JSON.parse(stored);
        if (parsed.city) {
          setCityDisplay(parsed.city);
          return;
        }
      } catch {
        // Corrupt entry — fall through to reverse geocode
      }
    }

    // No stored location: derive coords from weather.location ("lat,lon") and reverse-geocode.
    const parts = weather.location.split(",");
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lon)) {
      reverseGeocode(lat, lon)
        .then((result) => {
          setCityDisplay(result.display);
          const loc: StoredLocation = { city: result.display, lat, lon };
          localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
        })
        .catch(() => {
          // Silently ignore — widget just won't show a city name
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autofocus the search input when entering edit mode.
  useEffect(() => {
    if (editMode) inputRef.current?.focus();
  }, [editMode]);

  // Debounced city search.
  useEffect(() => {
    if (!editMode) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setResults(await searchCity(query));
      } catch {
        setResults([]);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, editMode]);

  function handleEnterEdit() {
    setQuery(cityDisplay ?? "");
    setResults([]);
    setEditMode(true);
  }

  function handleCancelEdit() {
    setEditMode(false);
    setQuery("");
    setResults([]);
  }

  function handleSelectResult(result: GeocodingResult) {
    const loc: StoredLocation = { city: result.display, lat: result.lat, lon: result.lon };
    localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
    setCityDisplay(result.display);
    setEditMode(false);
    setQuery("");
    setResults([]);
    onLocationChange?.(result.lat, result.lon);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") handleCancelEdit();
  }

  const Icon = CONDITION_ICON[weather.condition] ?? Cloud;
  const iconClass = CONDITION_ICON_CLASS[weather.condition] ?? "text-gray-300";
  const conditionLabel =
    weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1);

  return (
    <div className="w-full rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-900/50 to-indigo-900/50 p-6 text-white">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-widest text-blue-400">
            Current Weather
          </p>

          {/* City display / edit mode */}
          <div className="relative mt-1">
            {editMode ? (
              <>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search city…"
                  className="w-full rounded-lg bg-blue-800/50 px-3 py-1.5 text-sm text-white placeholder-blue-300/50 outline-none ring-1 ring-blue-500/50 focus:ring-blue-400"
                />
                {results.length > 0 && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-xl border border-blue-700 bg-blue-900 shadow-xl">
                    {results.map((result, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectResult(result)}
                        className="w-full cursor-pointer truncate px-3 py-2 text-left text-sm text-white hover:bg-blue-800 first:rounded-t-xl last:rounded-b-xl"
                      >
                        {result.display}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="truncate font-semibold text-white">
                  {cityDisplay ?? "—"}
                </span>
                <button
                  type="button"
                  onClick={handleEnterEdit}
                  aria-label="Change city"
                  className="shrink-0 rounded p-0.5 text-blue-300 transition-colors hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-end gap-1">
            <span className="text-5xl font-bold leading-none text-white">
              {Math.round(weather.temperature)}
            </span>
            <span className="mb-1 text-2xl text-blue-300">°C</span>
          </div>
          <p className="mt-1.5 text-base font-medium text-blue-100">{conditionLabel}</p>
        </div>

        <div className="ml-4 flex flex-col items-end gap-2">
          <Icon className={cn("h-12 w-12 opacity-90", iconClass)} />
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh weather"
              className="rounded-lg p-1.5 text-blue-400 transition-colors hover:bg-blue-500/10 hover:text-blue-300 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-blue-500/20 pt-4 text-xs text-blue-300">
        <span className="flex items-center gap-1">
          <Thermometer className="h-3 w-3" />
          Feels like {Math.round(weather.feels_like)}°C
        </span>
        <span className="flex items-center gap-1">
          <Droplets className="h-3 w-3" />
          {weather.humidity}%
        </span>
        <span className="flex items-center gap-1">
          <Wind className="h-3 w-3" />
          {Math.round(weather.wind_speed)} km/h
        </span>
      </div>
    </div>
  );
}
