"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import type { PublishedSnapshot } from "@/lib/validation/schemas";
import { songRepository } from "@/data/repositories/song-repository";
import {
  fetchSharedSetlist,
  sharedSetlistRepository,
} from "@/data/repositories/shared-setlist-repository";
import { findImportedSong, importSharedSong } from "@/lib/sharing/import-song";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeedbackToast } from "@/components/ui/feedback-toast";

export function SharedSetlistView({ token }: { token: string }) {
  const followed = useLiveQuery(
    () => sharedSetlistRepository.get(token),
    [token],
  );
  const libraryQuery = useLiveQuery(() => songRepository.list(), []);
  const library = useMemo(() => libraryQuery ?? [], [libraryQuery]);
  const [snapshot, setSnapshot] = useState<PublishedSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  const load = useCallback(
    async (announce = false) => {
      setBusy(true);
      try {
        const remote = await fetchSharedSetlist(token);
        const saved = await sharedSetlistRepository.follow(token, remote);
        setSnapshot(saved.snapshot);
        if (announce)
          setFeedback({
            message: "Shared setlist refreshed. No songs were imported.",
            tone: "success",
          });
      } catch (error) {
        const cached = await sharedSetlistRepository.get(token);
        if (cached) setSnapshot(cached.snapshot);
        setFeedback({
          message:
            error instanceof Error
              ? error.message
              : "Unable to open shared setlist.",
          tone: "error",
        });
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const importedSongs = useMemo(
    () =>
      new Map(
        library
          .filter((song) => song.sharedSource?.publicToken === token)
          .map((song) => [song.sharedSource!.sharedSongId, song] as const),
      ),
    [library, token],
  );

  async function importOne(index: number) {
    if (!snapshot || !followed) return;
    const sharedSong = snapshot.songs[index];
    const existing = await findImportedSong(token, sharedSong);
    const changed =
      existing &&
      existing.sharedSource?.contentHash !==
        (sharedSong.contentHash ?? existing.sharedSource?.contentHash);
    let replace = false;
    if (changed) {
      replace = confirm(
        `“${sharedSong.title}” has changed. Choose OK to replace your private copy, or Cancel for more options.`,
      );
      if (
        !replace &&
        !confirm("Import the newer version as a separate private copy?")
      )
        return;
    }
    const result = await importSharedSong(
      token,
      followed.revision,
      sharedSong,
      replace,
    );
    setFeedback({
      message: result.existed
        ? "Song is already in your library"
        : "Song imported",
      tone: "success",
    });
  }

  async function importAll() {
    if (!snapshot || !followed) return;
    if (
      !confirm(
        `Import ${snapshot.songs.length} ${snapshot.songs.length === 1 ? "song" : "songs"} as private copies in My Library?`,
      )
    )
      return;
    let count = 0;
    for (const song of snapshot.songs) {
      const result = await importSharedSong(token, followed.revision, song);
      if (!result.existed) count += 1;
    }
    setFeedback({
      message: count
        ? `${count} ${count === 1 ? "song" : "songs"} imported`
        : "All songs are already in your library",
      tone: "success",
    });
  }

  if (!snapshot)
    return (
      <div className="p-12 text-center text-slate-500">
        {busy ? "Opening shared setlist…" : "Shared setlist unavailable"}
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 pb-24 sm:px-6 sm:py-8">
      <FeedbackToast
        message={feedback?.message ?? null}
        tone={feedback?.tone}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-indigo-600">
            Shared setlist · Read only · Revision {followed?.revision ?? 1}
          </p>
          <h1 className="break-words text-3xl font-bold">{snapshot.name}</h1>
          {snapshot.version === 2 && snapshot.sharedBy && (
            <p className="mt-1 text-sm text-slate-500">
              Shared by {snapshot.sharedBy}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href={`/s/${token}`} target="_blank">
              <ExternalLink size={16} /> Perform
            </Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void load(true)}
          >
            <RefreshCw size={16} /> {busy ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {snapshot.songs.map((song, index) => {
          const identity = song.sharedSongId ?? song.entryId;
          const imported = importedSongs.get(identity);
          const newer =
            Boolean(imported) &&
            Boolean(song.contentHash) &&
            imported?.sharedSource?.contentHash !== song.contentHash;
          return (
            <Card key={song.entryId} className="p-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 text-sm font-bold text-slate-400">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold">{song.title}</h2>
                  <p className="text-sm text-slate-500">
                    {song.artist || "Unknown artist"}
                  </p>
                  {imported && (
                    <p
                      className={`mt-2 text-xs font-semibold ${newer ? "text-amber-600" : "text-emerald-600"}`}
                    >
                      {newer
                        ? "Newer shared version available"
                        : "In your library"}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  aria-label={`Import ${song.title} to My Library`}
                  onClick={() => void importOne(index)}
                >
                  <Download size={16} /> Import
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-5 border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
        <h2 className="font-bold">Import to My Library</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Importing creates private copies. Refreshing this shared setlist never
          changes or imports songs in your library.
        </p>
        <Button
          type="button"
          className="mt-3"
          disabled={!snapshot.songs.length}
          onClick={() => void importAll()}
        >
          <Download size={16} /> Import all {snapshot.songs.length}{" "}
          {snapshot.songs.length === 1 ? "song" : "songs"}
        </Button>
      </Card>
    </div>
  );
}
