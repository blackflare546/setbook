"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  CloudDownload,
  Download,
  Play,
  WifiOff,
} from "lucide-react";
import type { PublishedSnapshot } from "@/lib/validation/schemas";
import { songRepository } from "@/data/repositories/song-repository";
import {
  fetchSharedSetlist,
  sharedSetlistRepository,
} from "@/data/repositories/shared-setlist-repository";
import {
  findImportedSong,
  importSharedSong,
  sharedSongImportContentHash,
  sharedSongImportIdentity,
} from "@/lib/sharing/import-song";
import { formatMusicalKey } from "@/core/chords/keys";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { LoadingState } from "@/components/ui/loading-state";
import { publicPerformancePath } from "@/lib/sharing/shared-link";

export function SharedSetlistView({ token }: { token: string }) {
  const followed = useLiveQuery(
    () => sharedSetlistRepository.get(token),
    [token],
  );
  const libraryQuery = useLiveQuery(
    () => songRepository.listBySharedToken(token),
    [token],
  );
  const library = useMemo(() => libraryQuery ?? [], [libraryQuery]);
  const [snapshot, setSnapshot] = useState<PublishedSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importingSongId, setImportingSongId] = useState<string | null>(null);
  const [importingAll, setImportingAll] = useState(false);
  const [importConflictIndex, setImportConflictIndex] = useState<number | null>(
    null,
  );
  const [importAllDialogOpen, setImportAllDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  const initialize = useCallback(async () => {
    setBusy(true);
    setLoadError(null);
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
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to open shared setlist.",
      );
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

  const importedVersions = useMemo(() => {
    const versions = new Map<string, Set<string>>();
    for (const song of library) {
      if (song.sharedSource?.publicToken !== token) continue;
      const hashes = versions.get(song.sharedSource.sharedSongId) ?? new Set();
      hashes.add(song.sharedSource.contentHash);
      versions.set(song.sharedSource.sharedSongId, hashes);
    }
    return versions;
  }, [library, token]);

  const songsToImport = useMemo(
    () =>
      snapshot?.songs.filter((song) => {
        const importedHashes = importedVersions.get(
          sharedSongImportIdentity(song),
        );
        return !importedHashes?.has(sharedSongImportContentHash(song));
      }) ?? [],
    [importedVersions, snapshot],
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
    const existing = await findImportedSong(token, sharedSong);
    const changed =
      existing &&
      existing.sharedSource?.contentHash !==
        sharedSongImportContentHash(sharedSong);
    if (changed) {
      setImportConflictIndex(index);
      return;
    }
    await performImport(index, false);
  }

  async function performImport(index: number, replace: boolean) {
    if (!snapshot || !followed || importingSongId || importingAll) return;
    const sharedSong = snapshot.songs[index];
    const identity = sharedSongImportIdentity(sharedSong);
    setImportConflictIndex(null);
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
    setImportAllDialogOpen(false);
    setImportingAll(true);
    setFeedback(null);
    let count = 0;
    try {
      for (const song of songsToImport) {
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
        message: count
          ? `${count} ${count === 1 ? "song was" : "songs were"} imported before the import stopped.`
          : error instanceof Error
            ? error.message
            : "Unable to import songs.",
        tone: "error",
      });
    } finally {
      setImportingAll(false);
    }
  }

  if (!snapshot)
    return busy ? (
      <LoadingState label="Opening shared setlist…" className="min-h-[60dvh]" />
    ) : (
      <div className="grid min-h-[60dvh] place-items-center px-4 py-10">
        <Card className="w-full max-w-lg p-6 text-center sm:p-8">
          <AlertTriangle
            className="mx-auto text-amber-500"
            size={28}
            aria-hidden="true"
          />
          <h1 className="mt-4 text-xl font-bold">Shared setlist unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {loadError ?? "SetBook could not open this shared setlist."}
          </p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="secondary">
              <Link href="/setlists">Back to setlists</Link>
            </Button>
            <Button type="button" onClick={() => void initialize()}>
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );

  const conflictingSong =
    importConflictIndex === null ? null : snapshot.songs[importConflictIndex];

  return (
    <div className="mx-auto max-w-6xl px-3 py-7 pb-24 min-[375px]:px-4 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <FeedbackToast
        message={feedback?.message ?? null}
        tone={feedback?.tone}
      />
      <div className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end dark:border-slate-800">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-400">
            Shared setlist · Read only
          </p>
          <h1 className="mt-2 break-words text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {snapshot.name}
          </h1>
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
              isLoading={busy}
              loadingLabel="Updating…"
              onClick={() => void updateSharedSetlist()}
            >
              <CloudDownload size={16} aria-hidden="true" /> Update
            </Button>
          )}
          <Button
            asChild
            className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500"
          >
            <Link href={publicPerformancePath(token)}>
              <Play size={16} aria-hidden="true" /> Perform
            </Link>
          </Button>
        </div>
      </div>

      {(followed?.status === "offline" ||
        followed?.status === "unavailable") && (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100"
        >
          {followed.status === "offline" ? (
            <WifiOff className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
          ) : (
            <AlertTriangle
              className="mt-0.5 shrink-0"
              size={17}
              aria-hidden="true"
            />
          )}
          <p>
            <span className="font-semibold">
              {followed.status === "offline"
                ? "You’re offline."
                : "The shared link can’t be reached."}
            </span>{" "}
            This is the most recent copy saved on this device.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {snapshot.songs.map((song, index) => {
          const identity = sharedSongImportIdentity(song);
          const importedHashes = importedVersions.get(identity);
          const imported = importedHashes?.has(
            sharedSongImportContentHash(song),
          );
          const newer = Boolean(importedHashes?.size) && !imported;
          return (
            <div
              key={song.entryId}
              className={`p-4 sm:p-5 ${index ? "border-t border-slate-200 dark:border-slate-800" : ""}`}
            >
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
                  {(imported || newer) && (
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
                  disabled={
                    imported || Boolean(importingSongId) || importingAll
                  }
                  isLoading={importingSongId === identity}
                  loadingLabel="Importing…"
                  aria-label={`Import ${song.title} to My Library`}
                  onClick={() => void importOne(index)}
                >
                  <Download size={16} aria-hidden="true" />
                  Import
                </Button>
              </div>
            </div>
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
            !songsToImport.length || importingAll || Boolean(importingSongId)
          }
          isLoading={importingAll}
          loadingLabel="Importing…"
          onClick={() => setImportAllDialogOpen(true)}
        >
          <Download size={16} aria-hidden="true" />
          {`Import all ${songsToImport.length} ${songsToImport.length === 1 ? "song" : "songs"}`}
        </Button>
      </Card>

      <Dialog.Root
        open={Boolean(conflictingSong)}
        onOpenChange={(open) => {
          if (!open && !importingSongId) setImportConflictIndex(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),30rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900">
            <Dialog.Title className="text-lg font-bold">
              Import newer version of {conflictingSong?.title}?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              A private copy from this shared song is already in My Library.
              Keep both versions, or replace that imported copy with the newer
              shared version. Other private songs are never changed.
            </Dialog.Description>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  importConflictIndex !== null &&
                  void performImport(importConflictIndex, false)
                }
              >
                Keep both
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() =>
                  importConflictIndex !== null &&
                  void performImport(importConflictIndex, true)
                }
              >
                Replace imported copy
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={importAllDialogOpen}
        onOpenChange={(open) => !importingAll && setImportAllDialogOpen(open)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900">
            <Dialog.Title className="text-lg font-bold">
              Import all songs?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              This creates {songsToImport.length}{" "}
              {songsToImport.length === 1 ? "private copy" : "private copies"}{" "}
              in My Library, including newer shared versions. Songs already
              imported at the current version will be skipped.
            </Dialog.Description>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="button" onClick={() => void importAll()}>
                <Download size={16} aria-hidden="true" /> Import songs
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
