import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type OpenAppButtonProps = {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function OpenAppButton({
  children,
  className,
  size = "md",
}: OpenAppButtonProps) {
  return (
    <Button
      asChild
      className={className}
      size={size}
    >
      <Link href="/library">{children}</Link>
    </Button>
  );
}
