"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number | null;
  onChange: (rating: number) => void;
  readOnly?: boolean;
}

export function StarRating({ value, onChange, readOnly = false }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const filled = hovered ?? value ?? 0;

  return (
    <div
      className={cn("flex items-center gap-0.5", readOnly && "pointer-events-none")}
      onMouseLeave={() => setHovered(null)}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const starNum = i + 1;
        const active = starNum <= filled;
        return (
          <button
            key={starNum}
            type="button"
            onClick={() => !readOnly && onChange(starNum)}
            onMouseEnter={() => !readOnly && setHovered(starNum)}
            className="focus:outline-none"
            aria-label={`Rate ${starNum} star${starNum !== 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                "h-4 w-4 transition-colors",
                active ? "text-amber-400 fill-amber-400" : "text-gray-600",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
