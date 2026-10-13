"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { settingsRepository } from "@/data/repositories/settings-repository";
import { LoadingState } from "@/components/ui/loading-state";

export function HomeEntry() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const settings = await settingsRepository.get();
        if (!settings.hasSeenLandingPage) {
          await settingsRepository.markLandingPageSeen();
        }
        if (!active) return;
        router.replace(settings.hasSeenLandingPage ? "/library" : "/welcome");
      } catch {
        if (!active) return;
        router.replace("/welcome");
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  return <LoadingState label="Opening SetBook…" className="min-h-dvh" />;
}
