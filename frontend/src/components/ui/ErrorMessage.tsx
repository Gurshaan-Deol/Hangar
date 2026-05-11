import { AlertCircle } from "lucide-react";

interface ErrorMessageProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ title, message, onRetry }: ErrorMessageProps) {
  return (
    <div className="rounded-lg border border-red-800 bg-red-950/50 p-4">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-300">{title}</p>
          <p className="mt-1 text-sm text-red-400">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-medium text-red-300 underline underline-offset-2 hover:text-red-200"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
