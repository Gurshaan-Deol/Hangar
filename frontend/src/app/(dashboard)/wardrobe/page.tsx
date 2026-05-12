"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
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
    <div className="aspect-[3/4] animate-pulse rounded-2xl bg-[var(--color-surface-raised)]" />
  );
}

export default function WardrobePage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("all");
  const [optimisticItems, setOptimisticItems] = useState<ClothingItem[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

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
    setUploadModalOpen(false);
  };

  const handleItemUpdated = (updated: ClothingItem) => {
    setOptimisticItems((prev) =>
      prev.map((i) => (i.id === updated.id ? updated : i)),
    );
    queryClient.invalidateQueries({ queryKey: ["wardrobe"] });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar />

        <main className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
          {/* Page header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">My Wardrobe</h1>
              {!isLoading && (
                <span className="rounded-full bg-indigo-500/20 px-3 py-0.5 text-sm text-indigo-300">
                  {allItems.length} {allItems.length === 1 ? "item" : "items"}
                </span>
              )}
            </div>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Upload
            </button>
          </div>

          {/* Filter bar — horizontally scrollable, no visible scrollbar */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
                  activeFilter === f.value
                    ? "bg-indigo-600 text-white"
                    : "border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-gray-400 hover:text-white",
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

        {/* Upload modal — slide-up on mobile, centered on desktop */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setUploadModalOpen(false)}
            />
            {/* Sheet / modal */}
            <div className="relative z-10 w-full max-w-lg rounded-t-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl sm:rounded-3xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Add to Wardrobe</h2>
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <UploadZone onUploadComplete={handleUploadComplete} />
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
