"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { cn, toTitleCase } from "@/lib/utils";

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  disabled?: boolean;
}

export function TagEditor({ tags, onChange, maxTags = 20, disabled = false }: TagEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const atMax = tags.length >= maxTags;

  function focusInput() {
    if (!disabled && !atMax) inputRef.current?.focus();
  }

  function addTag(raw: string) {
    const val = toTitleCase(raw.replace(",", "").trim());
    if (!val || val.length > 30) return;
    if (tags.some((t) => t.toLowerCase() === val.toLowerCase())) return;
    if (tags.length >= maxTags) return;
    onChange([...tags, val]);
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input.value);
      input.value = "";
    } else if (e.key === "Backspace" && !input.value) {
      removeTag(tags.length - 1);
    }
  }

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-md border bg-[var(--color-surface-raised)] px-2.5 py-2 transition-colors",
          "border-[var(--color-border)] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20",
          disabled || atMax ? "cursor-default" : "cursor-text",
        )}
        onClick={focusInput}
      >
        {tags.map((tag, i) => (
          <span
            key={i}
            title={tag}
            className="inline-flex max-w-[192px] items-center gap-1 rounded-full border border-indigo-500/25 bg-indigo-500/15 py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-indigo-300"
          >
            <span className="truncate">{toTitleCase(tag)}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(i);
                }}
                className="flex shrink-0 items-center text-indigo-400/60 transition-colors hover:text-indigo-300"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {!atMax && !disabled && (
          <input
            ref={inputRef}
            type="text"
            placeholder="Add tag…"
            className="min-w-[90px] flex-1 bg-transparent text-xs text-white placeholder:text-gray-500 outline-none"
            onKeyDown={handleKeyDown}
          />
        )}
      </div>
      <p className="font-mono text-[11px] text-gray-500">
        {atMax
          ? `Maximum ${maxTags} tags reached`
          : "Enter or , to add · Backspace removes last"}
      </p>
    </div>
  );
}
