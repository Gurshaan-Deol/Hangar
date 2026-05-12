"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { UploadZone } from "@/components/wardrobe/UploadZone";
import { ClothingGrid } from "@/components/wardrobe/ClothingGrid";
import { ClothingDetailModal } from "@/components/wardrobe/ClothingDetailModal";
import { WardrobeFilters, EMPTY_FILTERS } from "@/components/wardrobe/WardrobeFilters";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { getWardrobe } from "@/lib/api";
import type { ClothingItem, ClothingItemListResponse } from "@/types/clothing";
import type { FilterState } from "@/components/wardrobe/WardrobeFilters";

function SkeletonCard() {
  return (
    <div className="aspect-[3/4] animate-pulse rounded-2xl bg-[var(--color-surface-raised)]" />
  );
}

export default function WardrobePage() {
  const queryClient = useQueryClient();
  const [activeFilters, setActiveFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [optimisticItems, setOptimisticItems] = useState<ClothingItem[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);

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

  // Derive available colour and aesthetic (tag) options from the loaded wardrobe
  const colorOptions = useMemo(
    () => [...new Set(allItems.map((i) => i.color).filter(Boolean) as string[])].sort(),
    [allItems],
  );
  const aestheticOptions = useMemo(
    () => [...new Set(allItems.flatMap((i) => i.tags ?? []))].sort(),
    [allItems],
  );

  const filteredItems = useMemo(() => {
    const { categories, formality, seasons, colors, aesthetics } = activeFilters;
    return allItems.filter((item) => {
      if (categories.length > 0 && !categories.includes(item.category ?? "")) return false;
      if (formality.length > 0 && !formality.includes(item.style ?? "")) return false;
      if (seasons.length > 0 && !seasons.some((s) => item.season?.includes(s))) return false;
      if (colors.length > 0 && !colors.includes(item.color ?? "")) return false;
      if (aesthetics.length > 0 && !aesthetics.some((a) => item.tags?.includes(a))) return false;
      return true;
    });
  }, [allItems, activeFilters]);

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

  const handleDelete = useCallback(
    (id: string) => {
      setOptimisticItems((prev) => prev.filter((i) => i.id !== id));
      queryClient.setQueryData<ClothingItemListResponse>(["wardrobe"], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter((i) => i.id !== id),
          total: Math.max(0, old.total - 1),
        };
      });
    },
    [queryClient],
  );

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
            <div className="flex items-center gap-3">
              <WardrobeFilters
                filters={activeFilters}
                onChange={setActiveFilters}
                colorOptions={colorOptions}
                aestheticOptions={aestheticOptions}
              />
              <button
                onClick={() => setUploadModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" />
                Upload
              </button>
            </div>
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
              onItemClick={setSelectedItem}
              onItemUpdated={handleItemUpdated}
              onItemDeleted={handleDelete}
            />
          )}
        </main>

        {/* Upload modal */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setUploadModalOpen(false)}
            />
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

        <ClothingDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDelete={handleDelete}
          onUpdate={(updated) => {
            setSelectedItem(updated);
            handleItemUpdated(updated);
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
