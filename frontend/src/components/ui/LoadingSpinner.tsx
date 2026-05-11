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
        "animate-spin rounded-full border-gray-700 border-t-white",
        sizeClasses[size],
      )}
    />
  );

  if (fullPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        {spinner}
      </div>
    );
  }

  return spinner;
}
