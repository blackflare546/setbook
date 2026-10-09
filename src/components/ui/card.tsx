import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_32px_-28px_rgba(0,0,0,0.35)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none",
          className,
        )}
        {...props}
      />
    );
  },
);
