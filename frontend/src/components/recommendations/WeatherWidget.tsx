import { Cloud, CloudLightning, CloudRain, CloudSnow, Droplets, RefreshCw, Sun, Thermometer, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeatherData } from "@/types/recommendations";

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
}

export function WeatherWidget({ weather, onRefresh, isRefreshing = false }: WeatherWidgetProps) {
  const Icon = CONDITION_ICON[weather.condition] ?? Cloud;
  const iconClass = CONDITION_ICON_CLASS[weather.condition] ?? "text-gray-300";
  const conditionLabel =
    weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1);

  return (
    <div className="w-full rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-900/50 to-indigo-900/50 p-6 text-white">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-blue-400">
            Current Weather
          </p>
          <div className="mt-3 flex items-end gap-1">
            <span className="text-5xl font-bold leading-none text-white">
              {Math.round(weather.temperature)}
            </span>
            <span className="mb-1 text-2xl text-blue-300">°C</span>
          </div>
          <p className="mt-1.5 text-base font-medium text-blue-100">{conditionLabel}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Icon className={cn("h-12 w-12 opacity-90", iconClass)} />
          {onRefresh && (
            <button
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
