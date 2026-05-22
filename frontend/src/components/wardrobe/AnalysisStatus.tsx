"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, XCircle } from "lucide-react";
import { getClothingItem, getClothingItemStatus, retryAnalysis } from "@/lib/api";
import type { ClothingItem } from "@/types/clothing";

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 5 * 60 * 1000;

interface AnalysisStatusProps {
  itemId: string;
  initialStatus: ClothingItem["status"];
  initialAttemptCount?: number;
  onComplete: (item: ClothingItem) => void;
}

function useElapsedSeconds(active: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) { setElapsed(0); return; }
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  return elapsed;
}

function statusMessage(elapsedSeconds: number) {
  if (elapsedSeconds >= 30) return "This is taking longer than usual…";
  if (elapsedSeconds >= 10) return "Still working…";
  return "Analyzing your item…";
}

export function AnalysisStatus({
  itemId,
  initialStatus,
  initialAttemptCount = 0,
  onComplete,
}: AnalysisStatusProps) {
  const [status, setStatus] = useState<ClothingItem["status"]>(initialStatus);
  const [attemptCount, setAttemptCount] = useState(initialAttemptCount);
  const [timedOut, setTimedOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = !timedOut && (status === "pending" || status === "analyzing");
  const elapsed = useElapsedSeconds(isActive);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  useEffect(() => {
    if (initialStatus === "ready" || initialStatus === "failed") return;

    const poll = async () => {
      try {
        const res = await getClothingItemStatus(itemId);
        setStatus(res.status);
        setAttemptCount(res.attempt_count);

        if (res.status === "ready") {
          stopPolling();
          const fullItem = await getClothingItem(itemId);
          onComplete(fullItem);
        } else if (res.status === "failed") {
          stopPolling();
        }
      } catch {
        // network blip — keep polling
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setTimedOut(true);
    }, TIMEOUT_MS);

    return stopPolling;
  }, [itemId, initialStatus, onComplete, stopPolling]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setTimedOut(false);
    try {
      const updated = await retryAnalysis(itemId);
      setStatus(updated.status);
      setAttemptCount(updated.attempt_count);
    } catch {
      setTimedOut(true);
    } finally {
      setIsRetrying(false);
    }
  };

  if (status === "failed") {
    return (
      <div className="flex flex-col gap-1 py-2">
        <div className="flex items-center gap-1.5">
          <XCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span className="text-xs text-red-400">
            Analysis failed after {attemptCount} attempt{attemptCount !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="cursor-pointer text-xs text-gray-400">Click to add details manually</p>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="flex flex-col gap-1.5 py-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-orange-400" />
          <span className="text-xs text-orange-400">Analysis timed out</span>
        </div>
        <p className="text-xs text-gray-400">Click to add details manually or try re-uploading</p>
        <button
          onClick={(e) => { e.stopPropagation(); handleRetry(); }}
          disabled={isRetrying}
          className="mt-1 self-start rounded-lg bg-gray-700 px-2.5 py-1 text-xs text-gray-200 transition-colors hover:bg-gray-600 disabled:opacity-50"
        >
          {isRetrying ? "Retrying…" : "Retry analysis"}
        </button>
      </div>
    );
  }

  // Pending or analyzing
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <div className="flex items-center gap-1.5">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-400" />
        <span className="text-xs text-indigo-300">{statusMessage(elapsed)}</span>
      </div>
      {attemptCount > 1 && (
        <p className="text-[10px] text-gray-500">Attempt {attemptCount} of 3</p>
      )}
    </div>
  );
}
