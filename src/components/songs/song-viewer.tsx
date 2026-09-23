"use client";

import { useEffect, useState } from "react";
import type { Song } from "@/core/songs/types";
import { songRepository } from "@/data/repositories/song-repository";
import type { PublishedSnapshot } from "@/lib/validation/schemas";
import { PerformanceView } from "@/components/performance/performance-view";

export function SongViewer({ id }: { id: string }) {
  const [state, setState] = useState<{ loading: boolean; song?: Song }>({
    loading: true,
  });
  useEffect(() => {
    void songRepository
      .get(id)
      .then((song) => setState({ loading: false, song }));
  }, [id]);

  if (state.loading)
    return (
      <div className="grid min-h-dvh place-items-center bg-white text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Loading song…
      </div>
    );
  if (!state.song)
    return (
      <div className="grid min-h-dvh place-items-center bg-white px-4 text-center dark:bg-slate-950">
        <div>
          <h1 className="text-xl font-bold">Song not found</h1>
          <p className="mt-2 text-sm text-slate-500">
            It may have been removed from this device.
          </p>
        </div>
      </div>
    );

  const song = state.song;
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
