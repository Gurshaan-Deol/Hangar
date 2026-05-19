"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Heart, Shirt, Sparkles } from "lucide-react";
import { ClothingCard } from "@/components/wardrobe/ClothingCard";
import { cn } from "@/lib/utils";
import { updateOutfit, markOutfitWorn } from "@/lib/api";
import type { Outfit } from "@/types/recommendations";
import type { ClothingItem } from "@/types/clothing";

function SkeletonCard() {
  return (
    <div className="aspect-[3/4] w-36 shrink-0 animate-pulse rounded-2xl bg-[var(--color-surface-raised)]" />
  );
}

interface OutfitDisplayProps {
  outfit: Outfit | null;
  isLoading: boolean;
  onOutfitChange?: (outfit: Outfit) => void;
}

export function OutfitDisplay({ outfit, isLoading, onOutfitChange }: OutfitDisplayProps) {
  const [localOutfit, setLocalOutfit] = useState<Outfit | null>(null);
  const [woreFlash, setWoreFlash] = useState(false);

  const displayed = localOutfit ?? outfit;

  function applyUpdate(updated: Outfit) {
    setLocalOutfit(updated);
    onOutfitChange?.(updated);
  }

  async function handleFavourite() {
    if (!displayed) return;
    const updated = await updateOutfit(displayed.id, { is_favourite: true });
    applyUpdate(updated);
  }

  async function handleWore() {
    if (!displayed) return;
    const updated = await markOutfitWorn(displayed.id);
    applyUpdate(updated);
    setWoreFlash(true);
    setTimeout(() => setWoreFlash(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <p className="text-center text-sm text-gray-400">AI is styling you…</p>
        <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!displayed) return null;

  if (displayed.items.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-8 text-center">
        <Shirt className="mx-auto mb-3 h-10 w-10 text-gray-700" strokeWidth={1} />
        <p className="text-sm font-medium text-gray-300">Not enough items</p>
        <p className="mt-1 text-sm text-gray-500">
          Add more clothes to your wardrobe to get suggestions.
        </p>
        <Link
          href="/wardrobe"
          className="mt-4 inline-block rounded-xl border border-indigo-500/30 px-4 py-2 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-500/10"
        >
          Go to Wardrobe
        </Link>
      </div>
    );
  }

  const isFavourited = displayed.is_favourite;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-indigo-400" />
        <h2 className="text-lg font-semibold text-white">Your Outfit</h2>
      </div>

      {/* Horizontally scrollable item row on mobile, wraps on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
        {displayed.items.map((item) => (
          <div key={item.id} className="w-36 shrink-0">
            <ClothingCard item={item as ClothingItem} readOnly={true} />
          </div>
        ))}
      </div>

      {/* AI reasoning box */}
      {displayed.ai_reasoning && (
        <div className="rounded-r-xl border-l-2 border-indigo-500 bg-[var(--color-surface-raised)] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-indigo-400">
              Stylist Note
            </span>
          </div>
          <p className="text-sm italic leading-relaxed text-gray-300">
            &ldquo;{displayed.ai_reasoning}&rdquo;
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Save to favourites */}
        <button
          onClick={handleFavourite}
          disabled={isFavourited}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all",
            isFavourited
              ? "border-red-500/30 bg-red-500/10 text-red-400 cursor-default"
              : "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-gray-300 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400",
          )}
        >
          <Heart className={cn("h-3.5 w-3.5", isFavourited && "fill-red-400")} />
          {isFavourited ? "Saved to favourites ♥" : "Save to favourites"}
        </button>

        {/* Wore this today */}
        <button
          onClick={handleWore}
          disabled={woreFlash}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all",
            woreFlash
              ? "border-green-500/30 bg-green-500/10 text-green-400 cursor-default"
              : "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-gray-300 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white",
          )}
        >
          {woreFlash ? (
            <>
              <CheckCircle className="h-3.5 w-3.5" />
              Logged! ✓
            </>
          ) : (
            <>
              <Shirt className="h-3.5 w-3.5" />
              I wore this
            </>
          )}
        </button>
      </div>

      {/* Link to history */}
      <div className="pt-1">
        <Link
          href="/outfits"
          className="text-sm text-indigo-400 hover:text-indigo-300 underline-offset-4 hover:underline transition-colors"
        >
          View all saved outfits →
        </Link>
      </div>
    </div>
  );
}
