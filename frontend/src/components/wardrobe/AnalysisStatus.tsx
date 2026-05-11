"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { getClothingItem, getClothingItemStatus } from "@/lib/api";
import type { ClothingItem } from "@/types/clothing";

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 5 * 60 * 1000;

interface AnalysisStatusProps {
  itemId: string;
  initialStatus: ClothingItem["status"];
  onComplete: (item: ClothingItem) => void;
}

export function AnalysisStatus({ itemId, initialStatus, onComplete }: AnalysisStatusProps) {
  const [status, setStatus] = useState<ClothingItem["status"]>(initialStatus);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (initialStatus === "ready" || initialStatus === "failed") return;

    const poll = async () => {
      try {
        const { status: newStatus } = await getClothingItemStatus(itemId);
        setStatus(newStatus);

        if (newStatus === "ready") {
          stopPolling();
          const fullItem = await getClothingItem(itemId);
          onComplete(fullItem);
        } else if (newStatus === "failed") {
          stopPolling();
        }
      } catch {
        // network blip — keep polling
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    timeoutRef.current = setTimeout(stopPolling, TIMEOUT_MS);

    return stopPolling;
  }, [itemId, initialStatus, onComplete, stopPolling]);

  if (status === "ready") {
    return (
      <div className="flex items-center gap-1.5 py-2">
        <CheckCircle2 className="h-4 w-4 text-green-400" />
        <span className="text-xs text-green-400">Ready</span>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col gap-1 py-2">
        <div className="flex items-center gap-1.5">
          <XCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span className="text-xs text-red-400">Analysis failed</span>
        </div>
        <p className="text-[10px] text-gray-500">You can edit details manually.</p>
      </div>
    );
  }

  if (status === "analyzing") {
    return (
      <div className="flex flex-col gap-2 py-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 animate-pulse text-blue-400" />
          <span className="text-xs font-medium text-blue-300">AI is analyzing...</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-gray-700">
          <div className="h-full w-1/2 translate-x-[-100%] animate-shimmer rounded-full bg-blue-500" />
        </div>
      </div>
    );
  }

  // pending
  return (
    <div className="flex items-center gap-1.5 py-2">
      <div className="h-3.5 w-3.5 animate-pulse rounded-full bg-gray-600" />
      <span className="text-xs text-gray-500">Waiting to analyze...</span>
    </div>
  );
}
