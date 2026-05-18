"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "shirt", "pants", "shorts", "dress", "skirt", "jacket", "coat",
  "sweater", "hoodie", "shoes", "boots", "sneakers", "sandals",
  "bag", "accessory", "other",
];

const FORMALITY_OPTIONS = ["casual", "formal", "business", "athletic", "outdoor", "streetwear", "other"];
const SEASON_OPTIONS = ["spring", "summer", "fall", "winter"];

export interface FilterState {
  categories: string[];
  formality: string[];
  seasons: string[];
  colors: string[];
  aesthetics: string[];
}

export const EMPTY_FILTERS: FilterState = {
  categories: [],
  formality: [],
  seasons: [],
  colors: [],
  aesthetics: [],
};

export function countActiveFilters(f: FilterState): number {
  return f.categories.length + f.formality.length + f.seasons.length + f.colors.length + f.aesthetics.length;
}

interface WardrobeFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  colorOptions: string[];
  aestheticOptions: string[];
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function WardrobeFilters({ filters, onChange, colorOptions, aestheticOptions }: WardrobeFiltersProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeCount = countActiveFilters(filters);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200",
          open || activeCount > 0
            ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
            : "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-gray-400 hover:text-white",
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {activeCount > 0 && (
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/60">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <span className="text-sm font-semibold text-white">Filters</span>
            {activeCount > 0 && (
              <button
                onClick={() => onChange(EMPTY_FILTERS)}
                className="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-300"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-[70vh] space-y-5 overflow-y-auto p-4">
            <FilterGroup
              label="Category"
              options={CATEGORIES}
              selected={filters.categories}
              onToggle={(v) => onChange({ ...filters, categories: toggle(filters.categories, v) })}
            />

            <FilterGroup
              label="Formality"
              options={FORMALITY_OPTIONS}
              selected={filters.formality}
              onToggle={(v) => onChange({ ...filters, formality: toggle(filters.formality, v) })}
            />

            <FilterGroup
              label="Season"
              options={SEASON_OPTIONS}
              selected={filters.seasons}
              onToggle={(v) => onChange({ ...filters, seasons: toggle(filters.seasons, v) })}
            />

            {colorOptions.length > 0 && (
              <ColorFilterGroup
                selected={filters.colors}
                options={colorOptions}
                onToggle={(v) => onChange({ ...filters, colors: toggle(filters.colors, v) })}
              />
            )}

            {aestheticOptions.length > 0 && (
              <FilterGroup
                label="Aesthetic"
                options={aestheticOptions}
                selected={filters.aesthetics}
                onToggle={(v) => onChange({ ...filters, aesthetics: toggle(filters.aesthetics, v) })}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium capitalize transition-all duration-150",
              selected.includes(opt)
                ? "bg-indigo-600 text-white"
                : "border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-gray-400 hover:text-white",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorFilterGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Colour</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((color) => (
          <button
            key={color}
            onClick={() => onToggle(color)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize transition-all duration-150",
              selected.includes(color)
                ? "bg-indigo-600 text-white"
                : "border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-gray-400 hover:text-white",
            )}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
              style={{ backgroundColor: color }}
            />
            {color}
          </button>
        ))}
      </div>
    </div>
  );
}
