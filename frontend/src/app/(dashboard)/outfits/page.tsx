"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { OutfitCard } from "@/components/outfits/OutfitCard";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { getOutfitHistory } from "@/lib/api";
import type { Outfit, OutfitListResponse } from "@/types/recommendations";

type FilterKey = "all" | "favourites" | "this-week" | "highly-rated";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "favourites", label: "Favourites" },
  { key: "this-week", label: "This Week" },
  { key: "highly-rated", label: "Highly Rated" },
];

function applyFilter(outfits: Outfit[], filter: FilterKey): Outfit[] {
  if (filter === "favourites") return outfits.filter((o) => o.is_favourite);
  if (filter === "this-week") {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return outfits.filter((o) => new Date(o.created_at).getTime() >= cutoff);
  }
  if (filter === "highly-rated") return outfits.filter((o) => o.rating != null && o.rating >= 4);
  return outfits;
}

function SkeletonCard() {
  return <div className="rounded-2xl bg-[var(--color-surface-raised)] animate-pulse h-64" />;
}

export default function OutfitsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<OutfitListResponse>({
    queryKey: ["outfits"],
    queryFn: () => getOutfitHistory(),
  });

  function handleUpdate(updated: Outfit) {
    queryClient.setQueryData<OutfitListResponse>(["outfits"], (old) => {
      if (!old) return old;
      return {
        ...old,
        outfits: old.outfits.map((o) => (o.id === updated.id ? updated : o)),
      };
    });
  }

  function handleDelete(id: string) {
    queryClient.setQueryData<OutfitListResponse>(["outfits"], (old) => {
      if (!old) return old;
      return {
        ...old,
        outfits: old.outfits.filter((o) => o.id !== id),
        total: old.total - 1,
      };
    });
  }

  const allOutfits = data?.outfits ?? [];
  const filtered = applyFilter(allOutfits, filter);
  const total = data?.total ?? 0;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-8 animate-fade-in">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-2xl font-bold text-white">Saved Outfits</h1>
              {!isLoading && (
                <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                  {total} outfit{total !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={
                    filter === key
                      ? "rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white"
                      : "rounded-full border border-[var(--color-border)] px-4 py-1.5 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Error state */}
          {error && (
            <ErrorMessage
              title="Couldn't load outfits"
              message="Something went wrong. Please try again."
              onRetry={() => refetch()}
            />
          )}

          {/* Empty state — no outfits at all */}
          {!isLoading && !error && allOutfits.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Sparkles className="h-12 w-12 text-gray-600 mb-4" strokeWidth={1.2} />
              <p className="text-lg font-medium text-gray-300">No saved outfits yet</p>
              <p className="mt-1 text-sm text-gray-500">Generate your first outfit recommendation</p>
              <Link
                href="/recommendations"
                className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
              >
                Get Recommendations
              </Link>
            </div>
          )}

          {/* Empty state — filter returns nothing */}
          {!isLoading && !error && allOutfits.length > 0 && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-gray-400">No outfits match this filter</p>
              <button
                onClick={() => setFilter("all")}
                className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Clear filter
              </button>
            </div>
          )}

          {/* Grid */}
          {!isLoading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
