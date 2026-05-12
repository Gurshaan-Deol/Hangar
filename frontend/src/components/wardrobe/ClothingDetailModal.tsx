"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Pencil, Shirt, X } from "lucide-react";
import { cn, toTitleCase } from "@/lib/utils";
import { deleteClothingItem, dismissDuplicate, getClothingItem, updateClothingItem } from "@/lib/api";
import type { ClothingItem } from "@/types/clothing";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ItemEditForm } from "@/components/clothing/ItemEditForm";

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
  onUpdate: (item: ClothingItem) => void;
}

export function ClothingDetailModal({ item, onClose, onDelete, onUpdate }: ClothingDetailModalProps) {
  const [visible, setVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [duplicateItem, setDuplicateItem] = useState<ClothingItem | null>(null);

  useEffect(() => {
    if (!item) { setVisible(false); return; }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [item]);

  useEffect(() => {
    setDeleteConfirming(false);
    setIsDeleting(false);
    setIsDismissing(false);
    setDuplicateItem(null);
    setIsEditing(item?.status === "failed");

    if (item?.duplicate_of && !item.dismissed_duplicate) {
      getClothingItem(item.duplicate_of).then(setDuplicateItem).catch(() => {});
    }
  }, [item?.id, item?.duplicate_of, item?.dismissed_duplicate, item?.status]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!item) return null;

  const badge = STATUS_BADGE[item.status];
  const showDuplicateBanner = item.duplicate_of && !item.dismissed_duplicate;

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

  const handleKeepBoth = async () => {
    setIsDismissing(true);
    try { onUpdate(await dismissDuplicate(item.id)); }
    finally { setIsDismissing(false); }
  };

  const handleDeleteDuplicate = async () => {
    setIsDeleting(true);
    try {
      await deleteClothingItem(item.id);
      onDelete(item.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (updates: Partial<ClothingItem>) => {
    const updated = await updateClothingItem(item.id, updates);
    onUpdate(updated);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

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
          {/* LEFT — image */}
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
            {/* Failed banner */}
            {item.status === "failed" && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <p className="text-xs text-amber-300">
                  AI analysis failed — fill in details manually
                </p>
              </div>
            )}

            {/* Duplicate banner */}
            {showDuplicateBanner && (
              <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-amber-300">
                      This looks similar to another item in your wardrobe
                    </p>
                    {item.duplicate_reason && (
                      <p className="mt-1 text-xs text-amber-400/80">{item.duplicate_reason}</p>
                    )}
                    {duplicateItem && (
                      <div className="mt-3 flex items-center gap-2.5">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-amber-500/20">
                          {duplicateItem.image_url ? (
                            <Image
                              src={duplicateItem.image_url}
                              alt={duplicateItem.name ?? "Similar item"}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface-raised)]">
                              <Shirt className="h-5 w-5 text-gray-600" strokeWidth={1} />
                            </div>
                          )}
                        </div>
                        <p className="truncate text-xs text-gray-400">
                          {duplicateItem.name ?? "Unnamed item"}
                        </p>
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={handleKeepBoth}
                        disabled={isDismissing || isDeleting}
                        className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/10 disabled:opacity-50"
                      >
                        {isDismissing && <LoadingSpinner size="sm" />}
                        Keep both
                      </button>
                      <button
                        onClick={handleDeleteDuplicate}
                        disabled={isDismissing || isDeleting}
                        className="flex items-center gap-1.5 rounded-xl bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                      >
                        {isDeleting && <LoadingSpinner size="sm" />}
                        Delete this one
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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

            {isEditing ? (
              <ItemEditForm
                item={item}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <>
                <div className="space-y-4">
                  <DetailRow label="Category">
                    <span className="text-sm text-gray-200">
                      {item.category ? toTitleCase(item.category) : "—"}
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
                    <span className="text-sm text-gray-200">
                      {item.style ? toTitleCase(item.style) : "—"}
                    </span>
                  </DetailRow>

                  <DetailRow label="Season">
                    {item.season && item.season.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.season.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-[var(--color-surface-raised)] px-2 py-0.5 text-xs text-gray-300"
                          >
                            {toTitleCase(s)}
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
                            {toTitleCase(tag)}
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

                {/* Bottom actions */}
                <div className="mt-auto flex items-center justify-between pt-6">
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

                  {!deleteConfirming && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20 hover:text-indigo-200"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                </div>
              </>
            )}
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
