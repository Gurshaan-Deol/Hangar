"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Shirt, Sparkles } from "lucide-react";
import { ClothingCard } from "@/components/wardrobe/ClothingCard";
import type { Outfit } from "@/types/recommendations";
import type { ClothingItem } from "@/types/clothing";

function SkeletonCard() {
  return (
    <div className="w-36 shrink-0 overflow-hidden rounded-xl bg-gray-800 ring-1 ring-gray-700">
      <div className="aspect-[3/4] animate-pulse bg-gray-700" />
      <div className="p-3">
        <div className="h-3 animate-pulse rounded bg-gray-700" />
        <div className="mt-2 h-2.5 w-2/3 animate-pulse rounded bg-gray-700" />
      </div>
    </div>
  );
}

interface OutfitDisplayProps {
  outfit: Outfit | null;
  isLoading: boolean;
}

export function OutfitDisplay({ outfit, isLoading }: OutfitDisplayProps) {
  const [worn, setWorn] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <p className="text-center text-sm text-gray-400">
          AI is putting together your outfit…
        </p>
        <div className="flex gap-3 overflow-x-auto pb-2">
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
      <div className="rounded-xl bg-gray-800 p-8 text-center ring-1 ring-gray-700">
        <Shirt className="mx-auto mb-3 h-10 w-10 text-gray-600" />
        <p className="text-sm font-medium text-gray-300">Not enough items</p>
        <p className="mt-1 text-sm text-gray-500">
          Add more clothes to your wardrobe to get suggestions.
        </p>
        <Link
          href="/wardrobe"
          className="mt-4 inline-block rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
        >
          Go to Wardrobe
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Today&apos;s Outfit</h2>

      {/* Horizontally scrollable item row */}
      <div className="flex gap-3 overflow-x-auto pb-2">
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

      {/* AI reasoning */}
      {outfit.ai_reasoning && (
        <div className="rounded-xl bg-gray-800 p-4 ring-1 ring-gray-700">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-gray-500">
            <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
            Stylist Note
          </div>
          <p className="mt-2 text-sm italic leading-relaxed text-gray-300">
            &ldquo;{outfit.ai_reasoning}&rdquo;
          </p>
        </div>
      )}

      {/* Worn it? */}
      <div className="flex justify-end">
        {worn ? (
          <span className="flex items-center gap-1.5 text-sm text-green-400">
            <CheckCircle className="h-4 w-4" />
            Marked as worn!
          </span>
        ) : (
          <button
            onClick={() => setWorn(true)}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 ring-1 ring-gray-700 transition-colors hover:bg-gray-700 hover:text-white"
          >
            Worn it?
          </button>
        )}
      </div>
    </div>
  );
}
