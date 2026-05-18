"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteClothingItem } from "@/lib/api";
import type { ClothingItem } from "@/types/clothing";
import { AnalysisStatus } from "./AnalysisStatus";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const STATUS_BADGE: Record<
  ClothingItem["status"],
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-gray-900/80 text-gray-300 backdrop-blur-sm" },
  analyzing: { label: "Analyzing", className: "bg-blue-900/80 text-blue-300 backdrop-blur-sm" },
  ready: { label: "Ready", className: "bg-green-900/80 text-green-300 backdrop-blur-sm" },
  failed: { label: "Failed", className: "bg-red-900/80 text-red-300 backdrop-blur-sm" },
};

interface ClothingCardProps {
  item: ClothingItem;
  onClick: (item: ClothingItem) => void;
  onAnalysisComplete: (item: ClothingItem) => void;
  onDelete: (id: string) => void;
}

export function ClothingCard({ item, onClick, onAnalysisComplete, onDelete }: ClothingCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const badge = STATUS_BADGE[item.status];
  const isProcessing = item.status === "pending" || item.status === "analyzing";

  // Dismiss confirmation when clicking anywhere outside
  useEffect(() => {
    if (!showConfirm) return;
    const dismiss = () => setShowConfirm(false);
    document.addEventListener("click", dismiss);
    return () => document.removeEventListener("click", dismiss);
  }, [showConfirm]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleDeleteConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
    setIsDeleting(true);
    try {
      await deleteClothingItem(item.id);
      onDelete(item.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => e.key === "Enter" && onClick(item)}
      className="group relative cursor-pointer overflow-hidden rounded-2xl bg-[var(--color-surface-raised)] transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/60"
    >
      <div className="relative aspect-[3/4]">
        {/* Image */}
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name ?? "Clothing item"}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-[var(--color-surface)]" />
        )}

        {/* Shimmer overlay for processing items */}
        {isProcessing && (
          <div className="absolute inset-0 overflow-hidden bg-black/30">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        )}

        {/* Failed state overlay */}
        {item.status === "failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/60">
            <span className="text-xs text-red-400">Analysis failed</span>
            <span className="text-xs text-gray-400">Click to edit</span>
          </div>
        )}

        {/* Bottom gradient with item details */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-3">
          {isProcessing ? (
            <AnalysisStatus
              itemId={item.id}
              initialStatus={item.status}
              onComplete={onAnalysisComplete}
            />
          ) : (
            <>
              <p className="truncate text-sm font-medium text-white">
                {item.name ?? "Unknown item"}
              </p>
              <p className={cn("mt-0.5 truncate text-[10px] capitalize text-gray-400")}>
                {[item.category, item.color].filter(Boolean).join(" · ")}
              </p>
            </>
          )}
        </div>

        {/* Status badge — only for non-ready items */}
        {item.status !== "ready" && (
          <span
            className={cn(
              "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        )}

        {/* Duplicate warning badge */}
        {item.duplicate_of && !item.dismissed_duplicate && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            ⚠ Possible duplicate
          </span>
        )}

        {/* Delete button — top-left, visible on hover */}
        <div className="absolute left-3 top-3 z-10">
          <button
            onClick={handleDeleteClick}
            aria-label="Delete item"
            className={cn(
              "rounded-full bg-black/60 p-1.5 backdrop-blur-sm transition-all duration-200 hover:bg-red-600",
              showConfirm || isDeleting
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100",
            )}
          >
            {isDeleting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <X className="h-3.5 w-3.5 text-white" />
            )}
          </button>

          {/* Inline confirmation tooltip */}
          {showConfirm && (
            <div
              className="absolute left-0 top-full z-20 mt-1.5 min-w-max rounded-xl border border-gray-700 bg-gray-900 p-2 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-1.5 text-xs text-gray-300">Delete?</p>
              <div className="flex gap-1.5">
                <button
                  onClick={handleDeleteConfirm}
                  className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-red-500"
                >
                  Yes
                </button>
                <button
                  onClick={handleDeleteCancel}
                  className="rounded-lg bg-gray-700 px-2 py-1 text-xs text-gray-300 transition-colors hover:bg-gray-600"
                >
                  No
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
