"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { cn, toTitleCase } from "@/lib/utils";
import type { ClothingItem } from "@/types/clothing";
import { TagEditor } from "./TagEditor";
import { SeasonPicker } from "./SeasonPicker";

const CATEGORIES = [
  "shirt", "top", "pants", "jeans", "shorts", "dress", "skirt",
  "blazer", "suit", "jacket", "coat", "sweater", "cardigan", "hoodie",
  "activewear", "shoes", "boots", "sneakers", "sandals", "hat", "bag",
  "accessory", "other",
];

const STYLES = [
  "casual", "formal", "business", "smart-casual", "athletic",
  "outdoor", "streetwear", "loungewear", "vintage", "other",
];

const COLOR_MAP: Record<string, string> = {
  white: "#f0f0eb",
  black: "#1a1a1a",
  gray: "#8a8a8a",
  grey: "#8a8a8a",
  red: "#e05c5c",
  blue: "#4b7bec",
  navy: "#2c3e7a",
  green: "#4ade80",
  yellow: "#fbbf24",
  orange: "#f97316",
  pink: "#f472b6",
  purple: "#a78bfa",
  brown: "#92694a",
};

type EditFields = {
  name: string;
  category: string;
  style: string;
  color: string;
  season: string[];
  tags: string[];
};

function toInitial(item: ClothingItem): EditFields {
  return {
    name: item.name ?? "",
    category: item.category ?? "other",
    style: item.style ?? "casual",
    color: item.color ?? "",
    season: item.season && item.season.length > 0 ? item.season : ["spring"],
    tags: item.tags ?? [],
  };
}

const INPUT_CLASS =
  "w-full rounded-md border bg-[var(--color-surface-raised)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-gray-500 border-[var(--color-border)] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

const LABEL_CLASS =
  "block text-[11px] font-mono font-medium uppercase tracking-widest text-gray-500";

interface ItemEditFormProps {
  item: ClothingItem;
  onSave: (updates: Partial<ClothingItem>) => Promise<void>;
  onCancel: () => void;
}

export function ItemEditForm({ item, onSave, onCancel }: ItemEditFormProps) {
  const original = useMemo(() => toInitial(item), [item]);
  const [fields, setFields] = useState<EditFields>(original);
  const [errors, setErrors] = useState<Partial<Record<keyof EditFields, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function set<K extends keyof EditFields>(key: K, val: EditFields[K]) {
    setFields((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  const hasChanged = useMemo(
    () =>
      fields.name !== original.name ||
      fields.category !== original.category ||
      fields.style !== original.style ||
      fields.color !== original.color ||
      JSON.stringify([...fields.season].sort()) !== JSON.stringify([...original.season].sort()) ||
      JSON.stringify(fields.tags) !== JSON.stringify(original.tags),
    [fields, original],
  );

  function validate(): boolean {
    const errs: Partial<Record<keyof EditFields, string>> = {};
    if (!fields.name.trim()) errs.name = "Name is required";
    if (!CATEGORIES.includes(fields.category)) errs.category = "Select a valid category";
    if (!STYLES.includes(fields.style)) errs.style = "Select a valid style";
    if (fields.color.length > 50) errs.color = "Color must be 50 characters or less";
    if (fields.tags.length > 20) {
      errs.tags = "Maximum 20 tags";
    } else if (fields.tags.some((t) => t.length > 30)) {
      errs.tags = "Each tag must be 30 characters or less";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        name: fields.name.trim(),
        category: fields.category,
        style: fields.style,
        color: fields.color.trim() || null,
        season: fields.season,
        tags: fields.tags,
      });
      setSaving(false);
      setSaved(true);
      // Close edit mode after showing the success state for 1.5 seconds
      setTimeout(onCancel, 1500);
    } catch {
      setSaveError("Failed to save — please try again");
      setSaving(false);
    }
  }

  const colorDot = COLOR_MAP[fields.color.trim().toLowerCase()] ?? "#555460";

  return (
    <div className="flex flex-col gap-4">
      {/* Name */}
      <div className="space-y-1.5">
        <label className={LABEL_CLASS}>Name</label>
        <input
          type="text"
          maxLength={100}
          value={fields.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Navy slim-fit chinos"
          className={cn(INPUT_CLASS, errors.name && "border-red-500/60")}
        />
        {errors.name && <p className="text-[12px] text-red-400">{errors.name}</p>}
      </div>

      {/* Category + Style */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={LABEL_CLASS}>Category</label>
          <select
            value={fields.category}
            onChange={(e) => set("category", e.target.value)}
            className={cn(
              INPUT_CLASS,
              "cursor-pointer",
              errors.category && "border-red-500/60",
            )}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} style={{ background: "#1a1a1f" }}>
                {toTitleCase(c)}
              </option>
            ))}
          </select>
          {errors.category && <p className="text-[12px] text-red-400">{errors.category}</p>}
        </div>

        <div className="space-y-1.5">
          <label className={LABEL_CLASS}>Style</label>
          <select
            value={fields.style}
            onChange={(e) => set("style", e.target.value)}
            className={cn(
              INPUT_CLASS,
              "cursor-pointer",
              errors.style && "border-red-500/60",
            )}
          >
            {STYLES.map((s) => (
              <option key={s} value={s} style={{ background: "#1a1a1f" }}>
                {toTitleCase(s)}
              </option>
            ))}
          </select>
          {errors.style && <p className="text-[12px] text-red-400">{errors.style}</p>}
        </div>
      </div>

      {/* Color */}
      <div className="space-y-1.5">
        <label className={LABEL_CLASS}>Color</label>
        <div className="flex items-center gap-2">
          <span
            className="h-[18px] w-[18px] shrink-0 rounded-full border border-white/15"
            style={{ backgroundColor: colorDot }}
          />
          <input
            type="text"
            maxLength={50}
            value={fields.color}
            onChange={(e) => set("color", e.target.value)}
            placeholder="e.g. Navy blue"
            className={cn(INPUT_CLASS, "flex-1 w-auto", errors.color && "border-red-500/60")}
          />
        </div>
        {errors.color && <p className="text-[12px] text-red-400">{errors.color}</p>}
      </div>

      {/* Season */}
      <div className="space-y-1.5">
        <label className={LABEL_CLASS}>Season</label>
        <SeasonPicker value={fields.season} onChange={(v) => set("season", v)} />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label className={LABEL_CLASS}>Tags</label>
        <TagEditor tags={fields.tags} onChange={(v) => set("tags", v)} />
        {errors.tags && <p className="text-[12px] text-red-400">{errors.tags}</p>}
      </div>

      {/* Save error banner */}
      {saveError && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {saveError}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanged || saving || saved}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors",
            saved
              ? "cursor-default bg-green-600"
              : "bg-indigo-600 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saved ? "Saved!" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving || saved}
          className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
