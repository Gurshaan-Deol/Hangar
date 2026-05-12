import { AlertCircle } from "lucide-react";

interface ErrorMessageProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ title, message, onRetry }: ErrorMessageProps) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-950/30 p-6">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-300">{title}</p>
          <p className="mt-1 text-sm text-gray-400">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
