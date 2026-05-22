"use client";

import { useState } from "react";
import type { StoredLocation } from "@/types/geocoding";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { RefreshCw, Shirt, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { WeatherWidget } from "@/components/recommendations/WeatherWidget";
import { OccasionSelector } from "@/components/recommendations/OccasionSelector";
import { OutfitDisplay } from "@/components/recommendations/OutfitDisplay";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import { getWeather, getRecommendations, NotEnoughItemsError } from "@/lib/api";
import type { Occasion, Outfit } from "@/types/recommendations";

const DATE_LABEL = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const MAX_CUSTOM_LENGTH = 300;
const MAX_INSTRUCTION_LENGTH = 150;
const REQUIRED_COUNT = 3;
const LOCATION_KEY = "hangar_weather_location";

interface NotEnoughState {
  currentCount: number;
  itemsNeeded: number;
}

function NotEnoughItemsCard({ currentCount, itemsNeeded }: NotEnoughState) {
  const filledCircles = Math.min(currentCount, REQUIRED_COUNT);
  const emptyCircles = REQUIRED_COUNT - filledCircles;

  return (
    <div className="mb-6 flex flex-col items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
      <Shirt className="mb-4 h-12 w-12 text-gray-600" strokeWidth={1.2} />
      <h2 className="text-xl font-semibold text-white">Almost there!</h2>
      <p className="mt-2 text-sm text-gray-400">
        You have {currentCount} analyzed item{currentCount !== 1 ? "s" : ""} in your wardrobe.
      </p>
      <div className="mt-5 flex items-center gap-2.5">
        {Array.from({ length: filledCircles }).map((_, i) => (
          <span key={`filled-${i}`} className="h-4 w-4 rounded-full bg-indigo-500" />
        ))}
        {Array.from({ length: emptyCircles }).map((_, i) => (
          <span key={`empty-${i}`} className="h-4 w-4 rounded-full border-2 border-gray-600" />
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-400">
        Add {itemsNeeded} more item{itemsNeeded !== 1 ? "s" : ""} to unlock recommendations
      </p>
      <Link
        href="/wardrobe"
        className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        Go to Wardrobe
      </Link>
    </div>
  );
}

function readStoredCoords(): { lat: number; lon: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    const parsed: StoredLocation = JSON.parse(raw);
    if (typeof parsed.lat === "number" && typeof parsed.lon === "number") {
      return { lat: parsed.lat, lon: parsed.lon };
    }
  } catch {
    // Ignore corrupt entry
  }
  return null;
}

export default function RecommendationsPage() {
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [customRequest, setCustomRequest] = useState("");
  const [userInstruction, setUserInstruction] = useState("");
  const [instructionExpanded, setInstructionExpanded] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [notEnough, setNotEnough] = useState<NotEnoughState | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(readStoredCoords);
  const [lockedItemIds, setLockedItemIds] = useState<Set<string>>(new Set());

  const {
    data: weather,
    isLoading: weatherLoading,
    isFetching: weatherFetching,
    error: weatherError,
    refetch: refetchWeather,
  } = useQuery({
    queryKey: ["weather", coords],
    queryFn: () => getWeather(coords?.lat, coords?.lon),
    staleTime: 1000 * 60 * 5,
  });

  const { mutate: generate, isPending } = useMutation({
    mutationFn: () =>
      getRecommendations(
        occasion,
        customRequest || undefined,
        lockedItemIds.size > 0 ? Array.from(lockedItemIds) : undefined,
        userInstruction.trim() || undefined,
      ),
    onSuccess: (data) => {
      setNotEnough(null);
      setValidationError(null);
      setOutfit(data.outfit);
    },
    onError: (err: Error) => {
      if (err instanceof NotEnoughItemsError) {
        setNotEnough({ currentCount: err.currentCount, itemsNeeded: err.itemsNeeded });
      } else {
        setNotEnough(null);
        setValidationError(
          err instanceof Error
            ? err.message
            : "Something went wrong generating your outfit. Please try again.",
        );
      }
    },
  });

  function handleLocationChange(lat: number, lon: number) {
    setCoords({ lat, lon });
  }

  function handleOccasionChange(value: Occasion) {
    setOccasion(value);
    setCustomRequest("");
    setValidationError(null);
  }

  function handleCustomRequestChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value.slice(0, MAX_CUSTOM_LENGTH);
    setCustomRequest(value);
    if (value) setOccasion(null);
    setValidationError(null);
  }

  function handleLockToggle(id: string) {
    setLockedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleGenerate() {
    setValidationError(null);
    if (!occasion && !customRequest.trim()) {
      setValidationError("Please select an occasion or describe what you're looking for");
      return;
    }
    generate();
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Today&apos;s Look</h1>
            <p className="mt-1 text-sm text-gray-400">{DATE_LABEL}</p>
          </div>

          {/* Weather widget */}
          <div className="mb-6">
            {weatherLoading ? (
              <div className="flex h-44 items-center justify-center rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-900/50 to-indigo-900/50">
                <LoadingSpinner size="sm" />
              </div>
            ) : weatherError ? (
              <ErrorMessage
                title="Couldn't load weather"
                message="Check WEATHER_LAT and WEATHER_LON in your .env."
                onRetry={() => refetchWeather()}
              />
            ) : weather ? (
              <WeatherWidget
                weather={weather}
                onRefresh={() => refetchWeather()}
                isRefreshing={weatherFetching}
                onLocationChange={handleLocationChange}
              />
            ) : null}
          </div>

          {/* Occasion selector + free-text */}
          <div className="mb-6 space-y-4">
            <p className="text-sm text-gray-400">What&apos;s the occasion?</p>
            <OccasionSelector selected={occasion} onChange={handleOccasionChange} />

            <div className="relative">
              <textarea
                value={customRequest}
                onChange={handleCustomRequestChange}
                rows={3}
                placeholder="Or describe what you need... (e.g. 'something smart but comfortable for a long flight' or 'cozy outfit for a rainy day at home')"
                className={cn(
                  "w-full resize-none rounded-xl border bg-[var(--color-surface-raised)] px-4 py-3 pb-7 text-sm text-gray-200 placeholder-gray-500 outline-none transition-colors duration-200",
                  "border-gray-700 focus:border-indigo-500",
                )}
              />
              <span className="absolute bottom-2.5 right-3 select-none text-xs text-gray-500">
                {customRequest.length}/{MAX_CUSTOM_LENGTH}
              </span>
            </div>
          </div>

          {/* Generate + Regenerate buttons */}
          <div className="mb-3 flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={isPending || weatherLoading}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-all duration-200",
                isPending || weatherLoading
                  ? "cursor-not-allowed bg-gray-800 text-gray-500"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98]",
              )}
            >
              {isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  AI is styling you...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Outfit
                </>
              )}
            </button>

            {outfit && (
              <button
                onClick={() => generate()}
                disabled={isPending || weatherLoading}
                aria-label="Regenerate outfit"
                title="Regenerate keeping locked items"
                className={cn(
                  "flex items-center gap-2 rounded-2xl border px-4 py-4 text-sm font-medium transition-all duration-200",
                  isPending || weatherLoading
                    ? "cursor-not-allowed border-gray-700 bg-gray-800 text-gray-500"
                    : "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-gray-300 hover:border-indigo-500 hover:text-white",
                )}
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </button>
            )}
          </div>

          {/* AI note (collapsible) */}
          <div className="mb-6">
            {instructionExpanded || userInstruction ? (
              <div className="relative">
                <input
                  value={userInstruction}
                  onChange={(e) =>
                    setUserInstruction(e.target.value.slice(0, MAX_INSTRUCTION_LENGTH))
                  }
                  placeholder="e.g. no jackets today, something comfortable..."
                  className="w-full rounded-xl border border-gray-700 bg-[var(--color-surface-raised)] px-4 py-2.5 pr-14 text-sm text-gray-200 placeholder-gray-500 outline-none transition-colors focus:border-indigo-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 select-none text-xs text-gray-500">
                  {userInstruction.length}/{MAX_INSTRUCTION_LENGTH}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setInstructionExpanded(true)}
                className="text-sm text-indigo-400 transition-colors hover:text-indigo-300"
              >
                + Add a note for the AI
              </button>
            )}
          </div>

          {validationError && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-sm text-red-300">
              {validationError}
            </div>
          )}

          {notEnough && (
            <NotEnoughItemsCard
              currentCount={notEnough.currentCount}
              itemsNeeded={notEnough.itemsNeeded}
            />
          )}

          <OutfitDisplay
            outfit={outfit}
            isLoading={isPending}
            onOutfitChange={setOutfit}
            lockedItemIds={lockedItemIds}
            onLockToggle={handleLockToggle}
          />
        </main>
      </div>
    </ProtectedRoute>
  );
}
