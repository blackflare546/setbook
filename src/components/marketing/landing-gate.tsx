"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { settingsRepository } from "@/data/repositories/settings-repository";
import { LoadingState } from "@/components/ui/loading-state";

export function LandingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    let active = true;

    void settingsRepository
      .get()
      .then((settings) => {
        if (!active) return;

        if (settings.hasSeenLandingPage) router.replace("/library");
        else setShowLanding(true);
      })
      .catch(() => {
        if (active) setShowLanding(true);
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (!showLanding) {
    return (
      <main className="min-h-dvh bg-white dark:bg-slate-950">
        <LoadingState label="Opening your workspace…" className="min-h-dvh" />
      </main>
    );
  }

  return children;
}
