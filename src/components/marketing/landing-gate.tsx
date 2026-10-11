"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LandingPage } from "@/components/marketing/landing-page";
import { settingsRepository } from "@/data/repositories/settings-repository";
import { LoadingState } from "@/components/ui/loading-state";

export function LandingGate() {
  const router = useRouter();
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    void settingsRepository.get().then((settings) => {
      if (settings.hasSeenLandingPage) router.replace("/library");
      else setShowLanding(true);
    });
  }, [router]);

  if (!showLanding) {
    return (
      <main className="min-h-dvh bg-white dark:bg-slate-950">
        <LoadingState label="Opening your workspace…" className="min-h-dvh" />
      </main>
    );
  }

  return <LandingPage />;
}
