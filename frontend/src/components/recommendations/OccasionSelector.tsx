import { Briefcase, Heart, Mountain, Smile, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Occasion } from "@/types/recommendations";

const OCCASIONS: {
  value: Occasion;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "casual", label: "Casual", Icon: Smile },
  { value: "work", label: "Work", Icon: Briefcase },
  { value: "formal", label: "Formal", Icon: Star },
  { value: "outdoor", label: "Outdoor", Icon: Mountain },
  { value: "date", label: "Date", Icon: Heart },
];

interface OccasionSelectorProps {
  selected: Occasion;
  onChange: (occasion: Occasion) => void;
}

export function OccasionSelector({ selected, onChange }: OccasionSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {OCCASIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95",
            selected === value
              ? "bg-indigo-600 text-white shadow shadow-indigo-500/30"
              : "border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-gray-300 hover:border-indigo-500/40 hover:text-white",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
