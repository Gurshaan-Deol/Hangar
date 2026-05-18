import { Shirt, Sparkles } from "lucide-react";
import type { Outfit } from "@/types/recommendations";

interface OutfitCardProps {
  outfit: Outfit;
}

function ItemThumbnail({ item }: { item: Outfit["items"][number] }) {
  const backendBase =
    typeof window !== "undefined"
      ? `${window.location.origin}`
      : "";

  if (item.image_url) {
    return (
      <div className="flex flex-col gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${backendBase}${item.image_url}`}
          alt={item.name ?? item.category ?? "Clothing item"}
          className="aspect-[3/4] w-full rounded-lg object-cover ring-1 ring-gray-700"
        />
        <div>
          <p className="truncate text-xs font-medium text-white">
            {item.name ?? item.category ?? "Item"}
          </p>
          {item.color && (
            <p className="truncate text-xs text-gray-500">{item.color}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-gray-700 ring-1 ring-gray-600">
        <Shirt className="h-8 w-8 text-gray-500" />
      </div>
      <div>
        <p className="truncate text-xs font-medium text-white">
          {item.name ?? item.category ?? "Item"}
        </p>
        {item.color && (
          <p className="truncate text-xs text-gray-500">{item.color}</p>
        )}
      </div>
    </div>
  );
}

export function OutfitCard({ outfit }: OutfitCardProps) {
  return (
    <div className="rounded-xl bg-gray-800 p-5 ring-1 ring-gray-700">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-semibold text-white">AI Recommendation</span>
        </div>
        {outfit.occasion && (
          <span className="rounded-full bg-gray-700 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-300">
            {outfit.occasion}
          </span>
        )}
      </div>

      {outfit.items.length > 0 ? (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.min(outfit.items.length, 4)}, minmax(0, 1fr))` }}
        >
          {outfit.items.map((item) => (
            <ItemThumbnail key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center text-sm text-gray-500">
          No items selected
        </div>
      )}

      {outfit.ai_reasoning && (
        <div className="mt-4 rounded-lg bg-gray-700/50 p-3">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            Stylist Note
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-300">{outfit.ai_reasoning}</p>
        </div>
      )}

      {outfit.weather_temp_min != null && outfit.weather_temp_max != null && (
        <p className="mt-3 text-xs text-gray-600">
          Suited for {Math.round(outfit.weather_temp_min)}–{Math.round(outfit.weather_temp_max)}°C
        </p>
      )}
    </div>
  );
}
