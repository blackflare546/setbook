"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Song } from "@/core/songs/types";
import { songRepository } from "@/data/repositories/song-repository";
import type { PublishedSnapshot } from "@/lib/validation/schemas";
import { PerformanceView } from "@/components/performance/performance-view";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";

type SongViewerState =
  | { status: "loading"; requestedId: string }
  | { status: "ready"; requestedId: string; song: Song }
  | { status: "not-found"; requestedId: string }
  | { status: "error"; requestedId: string };

export function SongViewer({ id }: { id: string }) {
  const [state, setState] = useState<SongViewerState>({
    status: "loading",
    requestedId: id,
  });
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void songRepository
      .get(id)
      .then((song) => {
        if (!active) return;
        setState(
          song
            ? { status: "ready", requestedId: id, song }
            : { status: "not-found", requestedId: id },
        );
      })
      .catch(() => {
        if (active) setState({ status: "error", requestedId: id });
      });
    return () => {
      active = false;
    };
  }, [id, loadAttempt]);

  const displayState: SongViewerState =
    state.requestedId === id ? state : { status: "loading", requestedId: id };

  if (displayState.status === "loading")
    return <LoadingState label="Loading song…" className="min-h-dvh" />;
  if (displayState.status !== "ready")
    return (
      <div className="grid min-h-dvh place-items-center bg-white px-4 text-center dark:bg-slate-950">
        <div className="max-w-sm">
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">
            {displayState.status === "not-found"
              ? "Song not found"
              : "Song could not be loaded"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {displayState.status === "not-found"
              ? "It may have been removed from this device."
              : "Your local song data was not changed. Try loading it again."}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {displayState.status === "error" && (
              <Button
                type="button"
                onClick={() => {
                  setState({ status: "loading", requestedId: id });
                  setLoadAttempt((attempt) => attempt + 1);
                }}
              >
                Try again
              </Button>
            )}
            <Button asChild variant="secondary">
              <Link href="/library">Back to library</Link>
            </Button>
          </div>
        </div>
      </div>
    );

  const song = displayState.song;
  const snapshot: PublishedSnapshot = {
    version: 1,
    name: song.title,
    venue: "",
    songs: [
      {
        entryId: song.id,
        title: song.title,
        artist: song.artist,
        originalKey: song.originalKey,
        capo: song.capo,
        performanceKey: song.originalKey,
        arrangementCue: "",
        sections: song.sections,
        links: song.links,
      },
    ],
    publishedAt: song.updatedAt,
  };

  return (
    <PerformanceView
      snapshot={snapshot}
      backHref="/library"
      editHref={`/songs/${song.id}/edit`}
      singleSong
    />
  );
}
