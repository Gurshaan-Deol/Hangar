import { Cloud, CloudLightning, CloudRain, CloudSnow, Sun, Wind } from "lucide-react";
import type { WeatherData } from "@/types/recommendations";

const CONDITION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  clear: Sun,
  cloudy: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  stormy: CloudLightning,
  foggy: Wind,
};

interface WeatherWidgetProps {
  weather: WeatherData;
}

export function WeatherWidget({ weather }: WeatherWidgetProps) {
  const Icon = CONDITION_ICON[weather.condition] ?? Cloud;
  const conditionLabel =
    weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-900 to-blue-800 p-6 text-white shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-blue-300">Current Weather</p>
          <div className="mt-2 flex items-end gap-1">
            <span className="text-6xl font-light leading-none">
              {Math.round(weather.temperature)}
            </span>
            <span className="mb-1 text-3xl text-blue-300">°C</span>
          </div>
          <p className="mt-1 text-base font-medium">{conditionLabel}</p>
        </div>

        <Icon className="h-16 w-16 text-blue-300 opacity-80" />
      </div>

      <p className="mt-4 text-sm text-blue-200">
        Feels like {Math.round(weather.feels_like)}°C
      </p>

      <div className="mt-3 flex gap-4 border-t border-blue-700/50 pt-3 text-xs text-blue-300">
        <span>Humidity {weather.humidity}%</span>
        <span>Wind {Math.round(weather.wind_speed)} km/h</span>
        <span className="ml-auto">{weather.is_daytime ? "Day" : "Night"}</span>
      </div>
    </div>
  );
}
