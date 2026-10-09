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
      <main className="grid min-h-dvh place-items-center bg-white px-4 text-center dark:bg-slate-950">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-400">
            SetBook
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Opening your workspace…
          </p>
        </div>
      </main>
    );
  }

  return <LandingPage />;
}
