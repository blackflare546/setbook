"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CloudDownload, Download, Play } from "lucide-react";
import type { PublishedSnapshot } from "@/lib/validation/schemas";
import { songRepository } from "@/data/repositories/song-repository";
import {
  fetchSharedSetlist,
  sharedSetlistRepository,
} from "@/data/repositories/shared-setlist-repository";
import { findImportedSong, importSharedSong } from "@/lib/sharing/import-song";
import { formatMusicalKey } from "@/core/chords/keys";
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
  const [importingSongId, setImportingSongId] = useState<string | null>(null);
  const [importingAll, setImportingAll] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  const initialize = useCallback(async () => {
    setBusy(true);
    try {
      const cached = await sharedSetlistRepository.get(token);
      if (cached) {
        setSnapshot(cached.snapshot);
        await sharedSetlistRepository.check(token).catch(() => undefined);
        return;
      }
      const remote = await fetchSharedSetlist(token);
      const saved = await sharedSetlistRepository.follow(token, remote);
      setSnapshot(saved.snapshot);
    } catch (error) {
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
  }, [token]);

  const checkForUpdate = useCallback(async () => {
    const cached = await sharedSetlistRepository.get(token);
    if (!cached) return;
    await sharedSetlistRepository.check(token).catch(() => undefined);
  }, [token]);

  useEffect(() => {
    queueMicrotask(() => void initialize());
  }, [initialize]);

  useEffect(() => {
    window.addEventListener("focus", checkForUpdate);
    return () => window.removeEventListener("focus", checkForUpdate);
  }, [checkForUpdate]);

  useEffect(() => {
    if (!feedback || feedback.tone !== "success") return;
    const timeout = window.setTimeout(() => setFeedback(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const importedSongs = useMemo(
    () =>
      new Map(
        library
          .filter((song) => song.sharedSource?.publicToken === token)
          .map((song) => [song.sharedSource!.sharedSongId, song] as const),
      ),
    [library, token],
  );

  async function updateSharedSetlist() {
    if (!followed || followed.status !== "update-available") return;
    setBusy(true);
    setFeedback(null);
    try {
      const updated = await sharedSetlistRepository.refresh(token);
      setSnapshot(updated.snapshot);
      setFeedback({
        message: "Shared setlist updated. No songs were imported.",
        tone: "success",
      });
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Unable to update shared setlist.",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function importOne(index: number) {
    if (!snapshot || !followed || importingSongId || importingAll) return;
    const sharedSong = snapshot.songs[index];
    const identity = sharedSong.sharedSongId ?? sharedSong.entryId;
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
    setImportingSongId(identity);
    setFeedback(null);
    try {
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
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error ? error.message : "Unable to import song.",
        tone: "error",
      });
    } finally {
      setImportingSongId(null);
    }
  }

  async function importAll() {
    if (!snapshot || !followed || importingAll || importingSongId) return;
    if (
      !confirm(
        `Import ${snapshot.songs.length} ${snapshot.songs.length === 1 ? "song" : "songs"} as private copies in My Library?`,
      )
    )
      return;
    setImportingAll(true);
    setFeedback(null);
    try {
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
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error ? error.message : "Unable to import songs.",
        tone: "error",
      });
    } finally {
      setImportingAll(false);
    }
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
        <div className="flex flex-wrap justify-end gap-2">
          {followed?.status === "update-available" && (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void updateSharedSetlist()}
            >
              <CloudDownload size={16} /> {busy ? "Updating…" : "Update"}
            </Button>
          )}
          <Button asChild>
            <Link href={`/s/${token}`}>
              <Play size={16} /> Perform
            </Link>
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
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    <p>
                      <span className="font-semibold text-slate-500">Key</span>{" "}
                      {formatMusicalKey(song.performanceKey)}
                    </p>
                    {song.arrangementCue && (
                      <p className="min-w-0">
                        <span className="font-semibold text-slate-500">
                          Cue
                        </span>{" "}
                        <span className="break-words">
                          {song.arrangementCue}
                        </span>
                      </p>
                    )}
                  </div>
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
                  disabled={Boolean(importingSongId) || importingAll}
                  aria-label={`Import ${song.title} to My Library`}
                  onClick={() => void importOne(index)}
                >
                  <Download size={16} />
                  {importingSongId === identity ? "Importing…" : "Import"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-5 border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
        <h2 className="font-bold">Import to My Library</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Importing creates private copies. Updating this shared setlist never
          changes or imports songs in your library.
        </p>
        <Button
          type="button"
          className="mt-3"
          disabled={
            !snapshot.songs.length || importingAll || Boolean(importingSongId)
          }
          onClick={() => void importAll()}
        >
          <Download size={16} />
          {importingAll
            ? "Importing…"
            : `Import all ${snapshot.songs.length} ${snapshot.songs.length === 1 ? "song" : "songs"}`}
        </Button>
      </Card>
    </div>
  );
}
