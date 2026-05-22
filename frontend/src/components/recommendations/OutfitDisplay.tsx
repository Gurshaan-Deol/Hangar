"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Heart,
  Loader2,
  Lock,
  LockOpen,
  RefreshCw,
  Shirt,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { ClothingCard } from "@/components/wardrobe/ClothingCard";
import { cn } from "@/lib/utils";
import { updateOutfit, markOutfitWorn, submitFeedback } from "@/lib/api";
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
  lockedItemIds?: Set<string>;
  onLockToggle?: (id: string) => void;
}

export function OutfitDisplay({
  outfit,
  isLoading,
  onOutfitChange,
  lockedItemIds = new Set(),
  onLockToggle,
}: OutfitDisplayProps) {
  const [localOutfit, setLocalOutfit] = useState<Outfit | null>(null);
  const [woreFlash, setWoreFlash] = useState(false);
  const [isFavouriting, setIsFavouriting] = useState(false);
  const [isMarkingWorn, setIsMarkingWorn] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<"up" | "down" | null>(null);

  // Reset local overrides whenever a new outfit is generated
  useEffect(() => {
    setLocalOutfit(null);
    setWoreFlash(false);
    setActionError(null);
    setFeedbackRating(null);
  }, [outfit?.id]);

  const displayed = localOutfit ?? outfit;

  function applyUpdate(updated: Outfit) {
    setLocalOutfit(updated);
    onOutfitChange?.(updated);
  }

  async function handleFavourite() {
    if (!displayed) return;
    setIsFavouriting(true);
    setActionError(null);
    try {
      const updated = await updateOutfit(displayed.id, { is_favourite: !displayed.is_favourite });
      applyUpdate(updated);
    } catch {
      setActionError("Failed to update. Please try again.");
      setTimeout(() => setActionError(null), 3000);
    } finally {
      setIsFavouriting(false);
    }
  }

  async function handleWore() {
    if (!displayed) return;
    setIsMarkingWorn(true);
    setActionError(null);
    try {
      const updated = await markOutfitWorn(displayed.id);
      applyUpdate(updated);
      setWoreFlash(true);
      setTimeout(() => setWoreFlash(false), 2000);
    } catch {
      setActionError("Failed to log wear. Please try again.");
      setTimeout(() => setActionError(null), 3000);
    } finally {
      setIsMarkingWorn(false);
    }
  }

  async function handleFeedback(rating: "up" | "down") {
    if (!displayed) return;
    const next = feedbackRating === rating ? null : rating;
    setFeedbackRating(next);
    if (next) {
      try {
        await submitFeedback(displayed.id, next);
      } catch {
        // Revert optimistic state on error
        setFeedbackRating(feedbackRating);
      }
    }
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

      {/* Horizontally scrollable item row — each card has a lock overlay */}
      <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
        {displayed.items.map((item) => {
          const isLocked = lockedItemIds.has(item.id);
          return (
            <div
              key={item.id}
              className={cn(
                "relative w-36 shrink-0 rounded-2xl",
                isLocked && "ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0a0a0f]",
              )}
            >
              <ClothingCard item={item as ClothingItem} readOnly={true} />
              {onLockToggle && (
                <button
                  type="button"
                  onClick={() => onLockToggle(item.id)}
                  aria-label={isLocked ? "Unlock item" : "Lock item in outfit"}
                  className={cn(
                    "absolute left-2 top-2 z-20 rounded-full p-1.5 backdrop-blur-sm transition-colors",
                    isLocked
                      ? "bg-amber-500/80 hover:bg-amber-500"
                      : "bg-black/60 hover:bg-amber-500/60",
                  )}
                >
                  {isLocked ? (
                    <Lock className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <LockOpen className="h-3.5 w-3.5 text-gray-300" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* AI reasoning */}
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

      {/* Style tip */}
      {displayed.style_tip && (
        <div className="flex items-start gap-2 rounded-xl bg-[var(--color-surface-raised)] px-4 py-3">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <p className="text-sm italic text-gray-400">{displayed.style_tip}</p>
        </div>
      )}

      {/* Feedback + actions row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Thumbs up / down */}
        <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-1">
          <button
            type="button"
            onClick={() => handleFeedback("up")}
            aria-label="Thumbs up"
            className={cn(
              "rounded-lg p-2 transition-colors",
              feedbackRating === "up"
                ? "bg-green-500/20 text-green-400"
                : "text-gray-500 hover:text-green-400 hover:bg-green-500/10",
            )}
          >
            <ThumbsUp className={cn("h-4 w-4", feedbackRating === "up" && "fill-green-400")} />
          </button>
          <button
            type="button"
            onClick={() => handleFeedback("down")}
            aria-label="Thumbs down"
            className={cn(
              "rounded-lg p-2 transition-colors",
              feedbackRating === "down"
                ? "bg-red-500/20 text-red-400"
                : "text-gray-500 hover:text-red-400 hover:bg-red-500/10",
            )}
          >
            <ThumbsDown className={cn("h-4 w-4", feedbackRating === "down" && "fill-red-400")} />
          </button>
        </div>

        {/* Save to favourites */}
        <button
          onClick={handleFavourite}
          disabled={isFavouriting}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all disabled:opacity-50",
            isFavourited
              ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
              : "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-gray-300 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400",
          )}
        >
          {isFavouriting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Heart className={cn("h-3.5 w-3.5", isFavourited && "fill-red-400")} />
          )}
          {isFavourited ? "Saved ♥" : "Save"}
        </button>

        {/* Wore this today */}
        <button
          onClick={handleWore}
          disabled={woreFlash || isMarkingWorn}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all disabled:opacity-50",
            woreFlash
              ? "border-green-500/30 bg-green-500/10 text-green-400 cursor-default"
              : "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-gray-300 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white",
          )}
        >
          {isMarkingWorn ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : woreFlash ? (
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

      {actionError && <p className="text-xs text-red-400">{actionError}</p>}

      <div className="pt-1">
        <Link
          href="/outfits"
          className="text-sm text-indigo-400 underline-offset-4 transition-colors hover:text-indigo-300 hover:underline"
        >
          View all saved outfits →
        </Link>
      </div>
    </div>
  );
}
