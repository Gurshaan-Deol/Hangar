"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Shirt } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteClothingItem } from "@/lib/api";
import type { ClothingItem } from "@/types/clothing";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const STATUS_BADGE: Record<
  ClothingItem["status"],
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-gray-900/80 text-gray-300" },
  analyzing: { label: "Analyzing", className: "bg-blue-900/80 text-blue-300" },
  ready: { label: "Ready", className: "bg-green-900/80 text-green-300" },
  failed: { label: "Failed", className: "bg-red-900/80 text-red-300" },
};

interface ClothingDetailModalProps {
  item: ClothingItem | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function ClothingDetailModal({ item, onClose, onDelete }: ClothingDetailModalProps) {
  const [visible, setVisible] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Animate in: defer one frame so the transition fires from the initial state
  useEffect(() => {
    if (!item) {
      setVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [item]);

  // Reset confirmation state when a different item opens
  useEffect(() => {
    setDeleteConfirming(false);
    setIsDeleting(false);
  }, [item?.id]);

  // Escape key closes the modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!item) return null;

  const badge = STATUS_BADGE[item.status];

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteClothingItem(item.id);
      onDelete(item.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl transition-all duration-200",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* LEFT — image, edge to edge */}
          <div className="relative h-60 w-full shrink-0 md:h-auto md:w-1/2">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name ?? "Clothing item"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="flex h-full min-h-[280px] w-full items-center justify-center bg-[var(--color-surface-raised)]">
                <Shirt className="h-16 w-16 text-gray-600" strokeWidth={1} />
              </div>
            )}
          </div>

          {/* RIGHT — details */}
          <div className="flex flex-1 flex-col overflow-y-auto p-8 md:max-h-[80vh]">
            {/* Status badge */}
            <span
              className={cn(
                "self-start rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                badge.className,
              )}
            >
              {badge.label}
            </span>

            <h2 className="mt-2 text-2xl font-bold text-white">
              {item.name ?? "Unnamed Item"}
            </h2>

            <hr className="my-4 border-[var(--color-border)]" />

            <div className="space-y-4">
              <DetailRow label="Category">
                <span className="text-sm capitalize text-gray-200">
                  {item.category ?? "—"}
                </span>
              </DetailRow>

              <DetailRow label="Color">
                {item.color ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/20"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm capitalize text-gray-200">{item.color}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-200">—</span>
                )}
              </DetailRow>

              <DetailRow label="Style">
                <span className="text-sm capitalize text-gray-200">
                  {item.style ?? "—"}
                </span>
              </DetailRow>

              <DetailRow label="Season">
                {item.season && item.season.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {item.season.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-[var(--color-surface-raised)] px-2 py-0.5 text-xs capitalize text-gray-300"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-gray-200">—</span>
                )}
              </DetailRow>

              <DetailRow label="Tags">
                {item.tags && item.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-gray-200">—</span>
                )}
              </DetailRow>
            </div>

            {item.notes && (
              <>
                <hr className="my-4 border-[var(--color-border)]" />
                <DetailRow label="Notes">
                  <p className="text-sm italic text-gray-300">{item.notes}</p>
                </DetailRow>
              </>
            )}

            {/* Delete button — pushed to bottom */}
            <div className="mt-auto pt-6">
              {deleteConfirming ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Are you sure?</span>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                  >
                    {isDeleting && <LoadingSpinner size="sm" />}
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirming(false)}
                    disabled={isDeleting}
                    className="rounded-xl border border-[var(--color-border)] px-3 py-1.5 text-sm text-gray-400 transition-colors hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirming(true)}
                  className="rounded-xl border border-red-500/20 px-4 py-2 text-sm text-red-400 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                >
                  Delete Item
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">{label}</p>
      {children}
    </div>
  );
}
