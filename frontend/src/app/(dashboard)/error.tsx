"use client";

import { AlertCircle } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a0a0f] px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
        <AlertCircle className="h-7 w-7 text-red-400" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-red-300">Something went wrong</h2>
        <p className="mt-1 max-w-sm text-sm text-gray-400">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-xl border border-red-500/30 px-5 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
      >
        Try again
      </button>
    </div>
  );
}
