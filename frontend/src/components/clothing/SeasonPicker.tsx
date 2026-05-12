"use client";

import { cn } from "@/lib/utils";

const SEASONS: { value: string; label: string }[] = [
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" },
  { value: "winter", label: "Winter" },
];

interface SeasonPickerProps {
  value: string[];
  onChange: (seasons: string[]) => void;
  disabled?: boolean;
}

export function SeasonPicker({ value, onChange, disabled = false }: SeasonPickerProps) {
  function toggle(season: string) {
    if (disabled) return;
    if (value.includes(season)) {
      if (value.length <= 1) return;
      onChange(value.filter((s) => s !== season));
    } else {
      onChange([...value, season]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {SEASONS.map(({ value: s, label }) => {
        const active = value.includes(s);
        return (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            disabled={disabled}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
              active
                ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-300"
                : "border-[var(--color-border)] text-gray-500 hover:border-gray-600 hover:text-gray-400",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
