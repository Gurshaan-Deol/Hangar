"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Shirt, Sparkles, ThumbsUp } from "lucide-react";
import { ClothingCard } from "@/components/wardrobe/ClothingCard";
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
}

export function OutfitDisplay({ outfit, isLoading }: OutfitDisplayProps) {
  const [liked, setLiked] = useState(false);

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

  if (!outfit) return null;

  if (outfit.items.length === 0) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-indigo-400" />
        <h2 className="text-lg font-semibold text-white">Your Outfit</h2>
      </div>

      {/* Horizontally scrollable item row on mobile, wraps on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
        {outfit.items.map((item) => (
          <div key={item.id} className="w-36 shrink-0">
            <ClothingCard
              item={item as ClothingItem}
              onClick={() => {}}
              onAnalysisComplete={() => {}}
            />
          </div>
        ))}
      </div>

      {/* AI reasoning box */}
      {outfit.ai_reasoning && (
        <div className="rounded-r-xl border-l-2 border-indigo-500 bg-[var(--color-surface-raised)] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-indigo-400">
              Stylist Note
            </span>
          </div>
          <p className="text-sm italic leading-relaxed text-gray-300">
            &ldquo;{outfit.ai_reasoning}&rdquo;
          </p>
        </div>
      )}

      {/* Looks good! */}
      <div className="flex justify-end">
        {liked ? (
          <span className="flex items-center gap-1.5 text-sm text-green-400">
            <CheckCircle className="h-4 w-4" />
            Looks great!
          </span>
        ) : (
          <button
            onClick={() => setLiked(true)}
            className="flex items-center gap-2 rounded-xl border border-indigo-500/40 px-4 py-2 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-500/10"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            Looks good!
          </button>
        )}
      </div>
    </div>
  );
}
