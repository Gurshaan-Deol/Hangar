"use client";

import { useState } from "react";
import { ChevronDown, Heart, Repeat, Shirt, Thermometer, Trash2 } from "lucide-react";
import { cn, capitalize } from "@/lib/utils";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { StarRating } from "@/components/ui/StarRating";
import { relativeTime } from "@/lib/relativeTime";
import { updateOutfit, markOutfitWorn, deleteOutfit } from "@/lib/api";
import type { Outfit } from "@/types/recommendations";

interface OutfitCardProps {
  outfit: Outfit;
  onUpdate: (outfit: Outfit) => void;
  onDelete: (id: string) => void;
}

function ItemThumbnail({ item }: { item: Outfit["items"][number] }) {
  if (item.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.image_url}
        alt={item.name ?? item.category ?? "Clothing item"}
        className="w-16 h-16 rounded-xl object-cover"
      />
    );
  }
  return (
    <div className="w-16 h-16 rounded-xl bg-gray-700 flex items-center justify-center">
      <Shirt className="h-6 w-6 text-gray-500" />
    </div>
  );
}

export function OutfitCard({ outfit, onUpdate, onDelete }: OutfitCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [woreFlash, setWoreFlash] = useState(false);

  const visibleItems = outfit.items.slice(0, 4);
  const extraCount = outfit.items.length - 4;

  async function handleToggleFavourite() {
    const updated = await updateOutfit(outfit.id, { is_favourite: !outfit.is_favourite });
    onUpdate(updated);
  }

  async function handleRate(rating: number) {
    const updated = await updateOutfit(outfit.id, { rating });
    onUpdate(updated);
  }

  async function handleWore() {
    const updated = await markOutfitWorn(outfit.id);
    onUpdate(updated);
    setWoreFlash(true);
    setTimeout(() => setWoreFlash(false), 1500);
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteOutfit(outfit.id);
      onDelete(outfit.id);
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
        {/* Item thumbnails strip */}
        <div className="bg-[var(--color-surface-raised)] p-3">
          <div className="flex items-center gap-2">
            {visibleItems.map((item) => (
              <ItemThumbnail key={item.id} item={item} />
            ))}
            {extraCount > 0 && (
              <span className="flex items-center justify-center rounded-xl bg-gray-700 px-2 py-1 text-xs text-gray-400 h-16 min-w-[40px]">
                +{extraCount}
              </span>
            )}
            {outfit.items.length === 0 && (
              <div className="flex h-16 w-full items-center justify-center text-xs text-gray-600">
                No items
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="p-4 space-y-3">
          {/* Row 1: occasion + favourite */}
          <div className="flex items-center justify-between">
            {outfit.occasion ? (
              <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                {capitalize(outfit.occasion)}
              </span>
            ) : (
              <span />
            )}
            <button
              onClick={handleToggleFavourite}
              className="transition-colors focus:outline-none"
              aria-label={outfit.is_favourite ? "Remove from favourites" : "Add to favourites"}
            >
              <Heart
                className={cn(
                  "h-5 w-5 transition-colors",
                  outfit.is_favourite
                    ? "text-red-400 fill-red-400"
                    : "text-gray-500 hover:text-red-400",
                )}
              />
            </button>
          </div>

          {/* Row 2: star rating */}
          <div className="flex items-center gap-2">
            <StarRating value={outfit.rating} onChange={handleRate} />
            {!outfit.rating && (
              <span className="text-xs text-gray-500">Rate this outfit</span>
            )}
          </div>

          {/* Row 3: metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Thermometer className="h-3 w-3" />
              {outfit.weather_temp_min != null && outfit.weather_temp_max != null
                ? `${Math.round(outfit.weather_temp_min)}° – ${Math.round(outfit.weather_temp_max)}°`
                : "—"}
            </span>
            <span className="flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              Worn {outfit.wear_count} time{outfit.wear_count !== 1 ? "s" : ""}
            </span>
            <span>Saved {relativeTime(outfit.created_at)}</span>
          </div>

          {/* Row 4: action buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={handleWore}
              disabled={woreFlash}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition-all",
                woreFlash
                  ? "bg-green-600/20 text-green-400"
                  : "bg-[var(--color-surface-raised)] hover:bg-indigo-600 text-gray-300 hover:text-white",
              )}
            >
              {woreFlash ? (
                "Logged! ✓"
              ) : (
                <>
                  <Shirt className="h-3.5 w-3.5" />
                  Wore this today
                </>
              )}
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="text-gray-600 hover:text-red-400 transition-colors focus:outline-none"
              aria-label="Delete outfit"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Collapsible AI reasoning */}
          {outfit.ai_reasoning && (
            <div>
              <button
                onClick={() => setReasoningOpen((o) => !o)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    reasoningOpen && "rotate-180",
                  )}
                />
                Why this outfit?
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  reasoningOpen ? "max-h-48 mt-2" : "max-h-0",
                )}
              >
                <p className="italic text-sm text-gray-400 bg-[var(--color-surface-raised)] rounded-xl p-3">
                  {outfit.ai_reasoning}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this outfit?"
        description="This outfit will be removed from your history."
        confirmLabel="Delete"
        confirmClassName="bg-red-600 hover:bg-red-500"
        isConfirming={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
