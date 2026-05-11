"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadClothingItem } from "@/lib/api";
import type { ClothingItem } from "@/types/clothing";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

type UploadState = "idle" | "dragging" | "uploading" | "error";

interface UploadZoneProps {
  onUploadComplete: (item: ClothingItem) => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.has(file.type)) {
        setState("error");
        setErrorMessage("Only JPEG, PNG, and WebP images are supported.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setState("error");
        setErrorMessage("File must be under 10 MB.");
        return;
      }

      setState("uploading");
      try {
        const item = await uploadClothingItem(file);
        setState("idle");
        onUploadComplete(item);
      } catch (err: unknown) {
        setState("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Upload failed. Please try again.",
        );
      }
    },
    [onUploadComplete],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setState("idle");
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload clothing photo"
      className={cn(
        "relative flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-gray-800 px-6 py-10 text-center transition-all duration-200",
        state === "dragging"
          ? "border-blue-500 bg-blue-950/20"
          : state === "error"
            ? "border-red-600"
            : "border-gray-600 hover:border-gray-500 hover:bg-gray-700/50",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setState("dragging");
      }}
      onDragLeave={() => setState(s => s === "dragging" ? "idle" : s)}
      onDrop={onDrop}
      onClick={() => state !== "uploading" && inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && state !== "uploading" && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onInputChange}
      />

      {state === "uploading" ? (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-600 border-t-white" />
          <p className="mt-4 text-sm font-medium text-gray-300">Uploading...</p>
        </>
      ) : state === "error" ? (
        <>
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="mt-3 text-sm text-red-300">{errorMessage}</p>
          <button
            className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-red-300 ring-1 ring-red-700 transition-colors hover:bg-red-950/50 hover:text-red-200"
            onClick={(e) => {
              e.stopPropagation();
              setState("idle");
              setErrorMessage("");
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </>
      ) : (
        <>
          <div
            className={cn(
              "rounded-full bg-gray-700 p-3 transition-colors",
              state === "dragging" && "bg-blue-900/50",
            )}
          >
            <Upload
              className={cn(
                "h-6 w-6 transition-colors",
                state === "dragging" ? "text-blue-400" : "text-gray-400",
              )}
            />
          </div>
          <p className="mt-4 text-sm font-medium text-gray-200">
            {state === "dragging" ? "Drop to upload" : "Drop a photo of your clothing"}
          </p>
          {state !== "dragging" && (
            <p className="mt-1 text-xs text-gray-500">
              or click to browse · JPEG, PNG, WebP · max 10 MB
            </p>
          )}
        </>
      )}
    </div>
  );
}
