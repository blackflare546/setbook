import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50",
        {
          primary: "bg-indigo-600 text-white hover:bg-indigo-700",
          secondary:
            "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
          ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
          danger: "bg-rose-600 text-white hover:bg-rose-700",
        }[variant],
        {
          sm: "h-8 px-3 text-xs",
          md: "h-10 px-4 text-sm",
          lg: "h-12 px-5 text-base",
          icon: "h-9 w-9",
        }[size],
        className,
      )}
      {...props}
    />
  );
}
