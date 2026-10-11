"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { setlistRepository } from "@/data/repositories/setlist-repository";
import { songRepository } from "@/data/repositories/song-repository";
import { createPublishedSnapshot } from "@/lib/sharing/snapshot";
import type { PublishedSnapshot } from "@/lib/validation/schemas";
import { PerformanceView } from "./performance-view";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";

type PerformanceLoadState = "loading" | "ready" | "not-found" | "error";

export function LocalPerformance({ id }: { id: string }) {
  const [snapshot, setSnapshot] = useState<PublishedSnapshot | null>(null);
  const [loadState, setLoadState] = useState<PerformanceLoadState>("loading");
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([setlistRepository.get(id), songRepository.list()])
      .then(([setlist, songs]) => {
        if (!active) return;
        setResolvedId(id);
        if (setlist) {
          setSnapshot(
            createPublishedSnapshot(setlist, songs, {
              includeNotes: true,
              includeLinks: true,
            }),
          );
          setLoadState("ready");
          return;
        }
        setSnapshot(null);
        setLoadState("not-found");
      })
      .catch(() => {
        if (!active) return;
        setResolvedId(id);
        setSnapshot(null);
        setLoadState("error");
      });
    return () => {
      active = false;
    };
  }, [id, loadAttempt]);

  if (loadState === "loading" || resolvedId !== id)
    return (
      <LoadingState
        label="Preparing performance…"
        className="min-h-screen bg-slate-950 text-slate-300"
      />
    );

  if (loadState === "ready" && snapshot)
    return <PerformanceView snapshot={snapshot} backHref={`/setlists/${id}`} />;

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-950 px-4 py-12 text-center text-slate-100">
      <div className="max-w-md">
        <h1 className="text-xl font-bold">
          {loadState === "not-found"
            ? "Setlist not found"
            : "Performance could not be prepared"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {loadState === "not-found"
            ? "It may have been deleted from this browser."
            : "No local data was changed. Try preparing this performance again."}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {loadState === "error" && (
            <Button
              onClick={() => {
                setLoadState("loading");
                setResolvedId(null);
                setLoadAttempt((attempt) => attempt + 1);
              }}
            >
              Try again
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link href="/setlists">Back to setlists</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
