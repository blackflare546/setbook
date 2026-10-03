import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  variant?: "default" | "outline";
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  function Badge({ asChild, className, variant = "default", ...props }, ref) {
    const Component = asChild ? Slot : "div";
    return (
      <Component
        ref={ref}
        className={cn(
          "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
          variant === "default"
            ? "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
            : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200",
          className,
        )}
        {...props}
      />
    );
  },
);
