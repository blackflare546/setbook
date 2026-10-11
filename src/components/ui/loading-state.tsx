import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingState({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400",
        className,
      )}
    >
      <LoaderCircle
        className="animate-spin text-indigo-500 dark:text-indigo-400"
        size={24}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
