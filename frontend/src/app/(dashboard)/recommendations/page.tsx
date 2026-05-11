"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Wand2 } from "lucide-react";
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

export default function RecommendationsPage() {
  const [occasion, setOccasion] = useState<Occasion>("casual");
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
    mutationFn: () => getRecommendations(occasion),
    onSuccess: (data) => {
      setNotEnoughItems(false);
      setOutfit(data.outfit);
    },
    onError: (err: Error) => {
      setNotEnoughItems(
        err.message.toLowerCase().includes("at least 3") ||
          err.message.toLowerCase().includes("not_enough"),
      );
    },
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Today&apos;s Recommendation</h1>
            <p className="mt-1 text-sm text-gray-400">Powered by AI + real-time weather</p>
          </div>

          {/* Top section: weather + occasion */}
          <div className="mb-8 grid gap-6 sm:grid-cols-2">
            {/* Weather */}
            <div>
              {weatherLoading ? (
                <div className="flex h-44 items-center justify-center rounded-2xl bg-blue-900/40">
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

            {/* Occasion */}
            <div className="flex flex-col justify-center gap-3">
              <p className="text-sm font-medium text-gray-400">Choose occasion</p>
              <OccasionSelector selected={occasion} onChange={setOccasion} />
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={() => generate()}
            disabled={isPending || weatherLoading}
            className={cn(
              "mb-8 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-colors",
              isPending || weatherLoading
                ? "cursor-not-allowed bg-gray-700 text-gray-500"
                : "bg-white text-gray-900 hover:bg-gray-100",
            )}
          >
            {isPending ? (
              <>
                <LoadingSpinner size="sm" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Generate Outfit
              </>
            )}
          </button>

          {/* Not enough items error */}
          {notEnoughItems && (
            <div className="mb-6 rounded-xl bg-gray-800 p-5 text-center ring-1 ring-gray-700">
              <p className="text-sm font-medium text-gray-300">
                Add at least 3 items to your wardrobe first
              </p>
              <Link
                href="/wardrobe"
                className="mt-3 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
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
                onRetry={() => generate()}
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
