"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { WeatherWidget } from "@/components/recommendations/WeatherWidget";
import { OccasionSelector } from "@/components/recommendations/OccasionSelector";
import { OutfitDisplay } from "@/components/recommendations/OutfitDisplay";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import { getWeather, getRecommendations } from "@/lib/api";
import type { Occasion, Outfit } from "@/types/recommendations";

const DATE_LABEL = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const MAX_CUSTOM_LENGTH = 300;

export default function RecommendationsPage() {
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [customRequest, setCustomRequest] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [notEnoughItems, setNotEnoughItems] = useState(false);

  const {
    data: weather,
    isLoading: weatherLoading,
    error: weatherError,
    refetch: refetchWeather,
  } = useQuery({
    queryKey: ["weather"],
    queryFn: getWeather,
    staleTime: 1000 * 60 * 5,
  });

  const { mutate: generate, isPending, error: genError } = useMutation({
    mutationFn: () => getRecommendations(occasion, customRequest || undefined),
    onSuccess: (data) => {
      setNotEnoughItems(false);
      setValidationError(null);
      setOutfit(data.outfit);
    },
    onError: (err: Error) => {
      setNotEnoughItems(
        err.message.toLowerCase().includes("at least 3") ||
          err.message.toLowerCase().includes("not_enough"),
      );
    },
  });

  function handleOccasionChange(value: Occasion) {
    setOccasion(value);
    setCustomRequest("");
    setValidationError(null);
  }

  function handleCustomRequestChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value.slice(0, MAX_CUSTOM_LENGTH);
    setCustomRequest(value);
    if (value) {
      setOccasion(null);
    }
    setValidationError(null);
  }

  function handleGenerate() {
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
              <WeatherWidget weather={weather} />
            ) : null}
          </div>

          {/* Occasion selector + free-text */}
          <div className="mb-8 space-y-4">
            <p className="text-sm text-gray-400">What&apos;s the occasion?</p>
            <OccasionSelector selected={occasion} onChange={handleOccasionChange} />

            {/* Free-text request */}
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
              <span className="absolute bottom-2.5 right-3 text-xs text-gray-500 select-none">
                {customRequest.length}/{MAX_CUSTOM_LENGTH}
              </span>
            </div>

            {validationError && (
              <p className="text-sm text-red-400">{validationError}</p>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isPending || weatherLoading}
            className={cn(
              "mb-8 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-all duration-200",
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

          {/* Not enough items */}
          {notEnoughItems && (
            <div className="mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 text-center">
              <p className="text-sm font-medium text-gray-300">
                Add at least 3 items to your wardrobe first
              </p>
              <Link
                href="/wardrobe"
                className="mt-3 inline-block rounded-xl border border-indigo-500/40 px-4 py-2 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-500/10"
              >
                Go to Wardrobe
              </Link>
            </div>
          )}

          {/* Generic generation error */}
          {genError && !notEnoughItems && (
            <div className="mb-6">
              <ErrorMessage
                title="Couldn't generate outfit"
                message={genError instanceof Error ? genError.message : "Something went wrong."}
                onRetry={handleGenerate}
              />
            </div>
          )}

          {/* Outfit result */}
          <OutfitDisplay outfit={outfit} isLoading={isPending} />
        </main>
      </div>
    </ProtectedRoute>
  );
}
