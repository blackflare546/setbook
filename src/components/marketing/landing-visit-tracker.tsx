"use client";

import { useEffect } from "react";
import { settingsRepository } from "@/data/repositories/settings-repository";

export function LandingVisitTracker() {
  useEffect(() => {
    void settingsRepository.markLandingPageSeen().catch(() => {
      // The welcome page remains usable if local storage is unavailable.
    });
  }, []);

  return null;
}
