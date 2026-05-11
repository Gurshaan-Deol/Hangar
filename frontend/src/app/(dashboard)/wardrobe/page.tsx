"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { UploadZone } from "@/components/wardrobe/UploadZone";
import { ClothingGrid } from "@/components/wardrobe/ClothingGrid";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { cn } from "@/lib/utils";
import { getWardrobe } from "@/lib/api";
import type { ClothingItem } from "@/types/clothing";

const FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Shirts", value: "shirt" },
  { label: "Pants", value: "pants" },
  { label: "Jackets", value: "jacket" },
  { label: "Shoes", value: "shoes" },
  { label: "Dresses", value: "dress" },
  { label: "Sweaters", value: "sweater" },
  { label: "Other", value: "other" },
];

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl bg-gray-800 ring-1 ring-gray-700">
      <div className="aspect-[3/4] animate-pulse bg-gray-700" />
      <div className="p-3">
        <div className="h-4 animate-pulse rounded bg-gray-700" />
        <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-gray-700" />
      </div>
    </div>
  );
}

export default function WardrobePage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("all");
  const [optimisticItems, setOptimisticItems] = useState<ClothingItem[]>([]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wardrobe"],
    queryFn: () => getWardrobe(),
  });

  const allItems = useMemo(() => {
    const fetched = data?.items ?? [];
    const fetchedIds = new Set(fetched.map((i) => i.id));
    const extras = optimisticItems.filter((i) => !fetchedIds.has(i.id));
    return [...extras, ...fetched];
  }, [data?.items, optimisticItems]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return allItems;
    return allItems.filter((i) => i.category === activeFilter);
  }, [allItems, activeFilter]);

  const handleUploadComplete = (item: ClothingItem) => {
    setOptimisticItems((prev) => [item, ...prev]);
    queryClient.invalidateQueries({ queryKey: ["wardrobe"] });
  };

  const handleItemUpdated = (updated: ClothingItem) => {
    setOptimisticItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    queryClient.invalidateQueries({ queryKey: ["wardrobe"] });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">My Wardrobe</h1>
            <p className="mt-1 text-sm text-gray-400">
              {isLoading ? "Loading..." : `${allItems.length} item${allItems.length !== 1 ? "s" : ""} in your wardrobe`}
            </p>
          </div>

          <div className="mb-6">
            <UploadZone onUploadComplete={handleUploadComplete} />
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  activeFilter === f.value
                    ? "bg-white text-gray-900"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {error ? (
            <ErrorMessage
              title="Failed to load wardrobe"
              message="Could not fetch your clothing items."
              onRetry={refetch}
            />
          ) : isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <ClothingGrid
              items={filteredItems}
              onItemClick={() => {}}
              onItemUpdated={handleItemUpdated}
            />
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
