"use client";
import { useEffect, useState } from "react";
import { setlistRepository } from "@/data/repositories/setlist-repository";
import { songRepository } from "@/data/repositories/song-repository";
import { createPublishedSnapshot } from "@/lib/sharing/snapshot";
import type { PublishedSnapshot } from "@/lib/validation/schemas";
import { PerformanceView } from "./performance-view";

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
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4 text-center text-sm text-slate-400">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
          SetBook performance
        </p>
        <p className="mt-2 text-base font-semibold text-slate-200">
          Preparing performance…
        </p>
      </div>
    </div>
  );
}
