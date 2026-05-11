import { cn } from "@/lib/utils";
import type { ClothingItem } from "@/types/clothing";
import { AnalysisStatus } from "./AnalysisStatus";

const STATUS_BADGE: Record<
  ClothingItem["status"],
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-gray-700 text-gray-300" },
  analyzing: { label: "Analyzing", className: "bg-blue-900/70 text-blue-300" },
  ready: { label: "Ready", className: "bg-green-900/70 text-green-300" },
  failed: { label: "Failed", className: "bg-red-900/70 text-red-300" },
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
      className="group relative cursor-pointer overflow-hidden rounded-xl bg-gray-800 ring-1 ring-gray-700 transition-all duration-200 hover:scale-[1.03] hover:shadow-xl hover:shadow-black/40 hover:ring-gray-500"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] bg-gray-900">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- image URLs come from the backend; configuring remotePatterns isn't needed for self-hosted uploads
          <img
            src={item.image_url}
            alt={item.name ?? "Clothing item"}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-300",
              isProcessing && "opacity-40",
            )}
          />
        ) : (
          <div className="h-full w-full bg-gray-900" />
        )}

        {isProcessing && (
          <div className="absolute inset-0 animate-pulse bg-gray-800/50" />
        )}

        <span
          className={cn(
            "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            badge.className,
          )}
        >
          {badge.label}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
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
            <div className="mt-1.5 flex flex-wrap gap-1">
              {item.category && (
                <span className="rounded-full bg-gray-700 px-2 py-0.5 text-[10px] capitalize text-gray-300">
                  {item.category}
                </span>
              )}
              {item.color && (
                <span className="rounded-full bg-gray-700 px-2 py-0.5 text-[10px] capitalize text-gray-300">
                  {item.color}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
