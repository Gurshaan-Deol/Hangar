import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  fullPage?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-4",
  lg: "h-12 w-12 border-4",
};

export function LoadingSpinner({ size = "md", fullPage = false }: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={cn(
        "animate-spin rounded-full border-indigo-900 border-t-indigo-400",
        sizeClasses[size],
      )}
    />
  );

  if (fullPage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0a0a0f]">
        {spinner}
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  return spinner;
}
