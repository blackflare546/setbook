"use client";
import { useEffect, useState } from "react";
import { setlistRepository } from "@/data/repositories/setlist-repository";
import { songRepository } from "@/data/repositories/song-repository";
import { createPublishedSnapshot } from "@/lib/sharing/snapshot";
import type { PublishedSnapshot } from "@/lib/validation/schemas";
import { PerformanceView } from "./performance-view";
import { LoadingState } from "@/components/ui/loading-state";

export function LocalPerformance({ id }: { id: string }) {
  const [snapshot, setSnapshot] = useState<PublishedSnapshot | null>(null);
  useEffect(() => {
    void Promise.all([setlistRepository.get(id), songRepository.list()]).then(
      ([setlist, songs]) => {
        if (setlist)
          setSnapshot(
            createPublishedSnapshot(setlist, songs, {
              includeNotes: true,
              includeLinks: true,
            }),
          );
      },
    );
  }, [id]);
  return snapshot ? (
    <PerformanceView snapshot={snapshot} backHref={`/setlists/${id}`} />
  ) : (
    <LoadingState
      label="Preparing performance…"
      className="min-h-screen bg-slate-950 text-slate-300"
    />
  );
}
