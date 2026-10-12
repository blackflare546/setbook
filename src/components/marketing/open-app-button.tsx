"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { settingsRepository } from "@/data/repositories/settings-repository";

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
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  async function openApp() {
    if (opening) return;

    setOpening(true);
    try {
      await settingsRepository.markLandingPageSeen();
    } finally {
      router.push("/library");
    }
  }

  return (
    <Button
      className={className}
      size={size}
      onClick={openApp}
      isLoading={opening}
      loadingLabel="Opening…"
    >
      {children}
    </Button>
  );
}
