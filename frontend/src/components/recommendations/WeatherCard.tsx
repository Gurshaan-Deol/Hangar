import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  Sun,
  Wind,
} from "lucide-react";
import type { WeatherData } from "@/types/recommendations";

const conditionIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  clear: Sun,
  cloudy: Cloud,
  foggy: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  stormy: CloudLightning,
};

interface WeatherCardProps {
  weather: WeatherData;
}

export function WeatherCard({ weather }: WeatherCardProps) {
  const Icon = conditionIcon[weather.condition] ?? Cloud;
  const conditionLabel = weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1);

  return (
    <div className="rounded-xl bg-gray-800 p-5 ring-1 ring-gray-700">
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-500">
        Current Weather
      </p>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-end gap-1">
            <span className="text-5xl font-light text-white">
              {Math.round(weather.temperature)}
            </span>
            <span className="mb-1 text-2xl text-gray-400">°C</span>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Feels like {Math.round(weather.feels_like)}°C · {conditionLabel}
          </p>
        </div>

        <Icon className="h-14 w-14 shrink-0 text-gray-400" />
      </div>

      <div className="mt-4 flex gap-4 border-t border-gray-700 pt-4 text-sm text-gray-400">
        <span className="flex items-center gap-1.5">
          <Droplets className="h-4 w-4" />
          {weather.humidity}%
        </span>
        <span className="flex items-center gap-1.5">
          <Wind className="h-4 w-4" />
          {Math.round(weather.wind_speed)} km/h
        </span>
        <span className="ml-auto text-xs text-gray-600">
          {weather.is_daytime ? "Daytime" : "Nighttime"}
        </span>
      </div>
    </div>
  );
}
