"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LandingPage } from "@/components/marketing/landing-page";
import { settingsRepository } from "@/data/repositories/settings-repository";

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
      <main className="grid min-h-dvh place-items-center bg-white text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Opening SetBook…
      </main>
    );
  }

  return <LandingPage />;
}
