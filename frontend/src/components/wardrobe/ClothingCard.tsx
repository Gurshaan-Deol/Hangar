import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ClothingItem } from "@/types/clothing";
import { AnalysisStatus } from "./AnalysisStatus";

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
}

export function ClothingCard({ item, onClick, onAnalysisComplete }: ClothingCardProps) {
  const badge = STATUS_BADGE[item.status];
  const isProcessing = item.status === "pending" || item.status === "analyzing";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => e.key === "Enter" && onClick(item)}
      className="group relative cursor-pointer overflow-hidden rounded-2xl bg-[var(--color-surface-raised)] transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/60"
    >
      <div className="relative aspect-[3/4]">
        {/* Image — next/image for automatic optimisation and lazy loading */}
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

        {/* Bottom gradient with overlaid item details */}
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
      </div>
    </div>
  );
}
