"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDownAZ,
  Copy,
  Download,
  FileMusic,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import {
  songRepository,
  type SongDeletion,
} from "@/data/repositories/song-repository";
import { exportLibrary, importLibrary } from "@/data/repositories/backup";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { PageHeader } from "@/components/ui/page-header";
import { formatMusicalKey } from "@/core/chords/keys";
import type { Song } from "@/core/songs/types";
import { useProgressiveCollection } from "@/lib/hooks/use-progressive-collection";
import { ProgressiveCollectionFooter } from "@/components/ui/progressive-collection-footer";
import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";
import { AreaTutorial } from "@/components/tutorials/area-tutorial";
import { LoadingState } from "@/components/ui/loading-state";
import { settingsRepository } from "@/data/repositories/settings-repository";

function SongActions({
  song,
  onDelete,
  onDuplicate,
  duplicating,
}: {
  song: Song;
  onDelete: (song: Song) => void;
  onDuplicate: (song: Song) => void;
  duplicating: boolean;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <>
      <div className="hidden gap-1 sm:flex">
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label={`Edit song: ${song.title}`}
        >
          <Link href={`/songs/${song.id}/edit`}>
            <Pencil size={17} aria-hidden="true" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Duplicate song: ${song.title}`}
          onClick={() => onDuplicate(song)}
          isLoading={duplicating}
          loadingLabel={`Duplicating ${song.title}…`}
        >
          <Copy size={17} aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
          aria-label={`Delete song: ${song.title}`}
          onClick={() => onDelete(song)}
        >
          <Trash2 size={17} aria-hidden="true" />
        </Button>
      </div>
      <DropdownMenu.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 sm:hidden"
            aria-label={`Song actions for ${song.title}`}
          >
            <MoreHorizontal size={20} aria-hidden="true" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-44 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-950 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <DropdownMenu.Item asChild>
              <Link
                href={`/songs/${song.id}/edit`}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-semibold outline-none hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
              >
                <Pencil size={17} aria-hidden="true" />
                Edit
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-semibold outline-none hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
              disabled={duplicating}
              onSelect={() => onDuplicate(song)}
            >
              <Copy size={17} aria-hidden="true" />
              {duplicating ? "Duplicating…" : "Duplicate"}
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
            <DropdownMenu.Item
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-semibold text-rose-600 outline-none hover:bg-rose-50 focus:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:focus:bg-rose-950/40"
              onSelect={() => onDelete(song)}
            >
              <Trash2 size={17} aria-hidden="true" />
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}

const SongRow = memo(function SongRow({
  song,
  onDelete,
  onDuplicate,
  duplicating,
}: {
  song: Song;
  onDelete: (song: Song) => void;
  onDuplicate: (song: Song) => void;
  duplicating: boolean;
}) {
  return (
    <div
      data-testid={`song-row-${song.id}`}
      className="group flex min-w-0 items-center gap-3 p-4 transition-colors hover:bg-slate-50 sm:gap-4 sm:px-5 dark:hover:bg-slate-800/50"
    >
      <div className="hidden h-10 w-10 place-items-center rounded-[10px] border border-indigo-100 bg-indigo-50 text-indigo-600 sm:grid dark:border-indigo-900 dark:bg-indigo-950/50">
        <FileMusic size={19} aria-hidden="true" />
      </div>
      <Link href={`/songs/${song.id}`} className="min-w-0 flex-1">
        <h2 className="break-words font-semibold text-slate-950 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
          {song.title}
        </h2>
        <p className="break-words text-sm text-slate-500 dark:text-slate-400">
          {song.artist || "Unknown artist"} ·{" "}
          {song.originalKey
            ? `Key of ${formatMusicalKey(song.originalKey)}`
            : "No key set"}{" "}
          · {song.sections.length} sections
        </p>
      </Link>
      <SongActions
        song={song}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        duplicating={duplicating}
      />
    </div>
  );
});

export function SongLibrary() {
  const liveSongs = useLiveQuery(() => songRepository.list(), []);
  const songs = useMemo(() => liveSongs ?? [], [liveSongs]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"updated" | "title">("updated");
  const [deletingSong, setDeletingSong] = useState<Song | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<SongDeletion | null>(
    null,
  );
  const [restoringDeletion, setRestoringDeletion] = useState(false);
  const [duplicatingSongId, setDuplicatingSongId] = useState<string | null>(
    null,
  );
  const [backingUp, setBackingUp] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const duplicateInFlightRef = useRef(false);
  const searchableSongs = useMemo(
    () =>
      songs.map((song) => ({
        song,
        searchText:
          `${song.title} ${song.artist} ${song.tags.join(" ")}`.toLocaleLowerCase(),
      })),
    [songs],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = useMemo(() => {
    const found = normalizedQuery
      ? searchableSongs
          .filter(({ searchText }) => searchText.includes(normalizedQuery))
          .map(({ song }) => song)
      : songs;
    return sort === "title"
      ? found.toSorted((a, b) => a.title.localeCompare(b.title))
      : found;
  }, [normalizedQuery, searchableSongs, songs, sort]);
  const progressive = useProgressiveCollection(
    filtered,
    `${normalizedQuery}\u0000${sort}`,
  );

  useEffect(() => {
    if (!feedback || feedback.tone !== "success") return;
    const undoAvailable = Boolean(
      pendingDeletion && feedback.message.startsWith("Song deleted"),
    );
    const timeout = window.setTimeout(
      () => {
        setFeedback(null);
        if (undoAvailable) setPendingDeletion(null);
      },
      undoAvailable ? 6_000 : 2_500,
    );
    return () => window.clearTimeout(timeout);
  }, [feedback, pendingDeletion]);

  async function backup() {
    if (backingUp) return;
    setBackingUp(true);
    setPendingDeletion(null);
    setFeedback(null);
    try {
      const downloadUrl = URL.createObjectURL(
        new Blob([await exportLibrary()], { type: "application/json" }),
      );
      try {
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `setbook-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.append(link);
        link.click();
        link.remove();
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
      }
      await settingsRepository.markBackupReminderSeen();
      setFeedback({ message: "Backup downloaded", tone: "success" });
    } catch {
      setFeedback({
        message: "Backup could not be created. Please try again.",
        tone: "error",
      });
    } finally {
      setBackingUp(false);
    }
  }

  async function restore() {
    if (!restoreFile || restoring) return;
    setRestoring(true);
    setPendingDeletion(null);
    setFeedback(null);
    setRestoreError(null);
    try {
      const result = await importLibrary(await restoreFile.text());
      setRestoreFile(null);
      const added = result.songsAdded + result.setlistsAdded;
      const skipped = result.songsSkipped + result.setlistsSkipped;
      setFeedback({
        message: added
          ? `Backup imported: ${added} added${skipped ? `, ${skipped} skipped` : ""}`
          : "Nothing new to import; duplicates were skipped",
        tone: "success",
      });
    } catch {
      setRestoreError("That file is not a valid SetBook backup.");
    } finally {
      setRestoring(false);
    }
  }

  async function deleteSong() {
    if (!deletingSong) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const deletion = await songRepository.delete(deletingSong.id);
      if (!deletion) throw new Error("Song not found");
      setDeletingSong(null);
      setPendingDeletion(deletion);
      const setlistCount = deletion.removedFromSetlists.length;
      setFeedback({
        message: setlistCount
          ? `Song deleted and removed from ${setlistCount} ${setlistCount === 1 ? "setlist" : "setlists"}`
          : "Song deleted",
        tone: "success",
      });
    } catch {
      setFeedback({
        message: "Song could not be deleted. Please try again.",
        tone: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function undoSongDeletion() {
    if (!pendingDeletion || restoringDeletion) return;
    setRestoringDeletion(true);
    try {
      await songRepository.restoreDeletion(pendingDeletion);
      setPendingDeletion(null);
      setFeedback({ message: "Song restored", tone: "success" });
    } catch {
      setFeedback({
        message: "Song could not be restored. Please try again.",
        tone: "error",
      });
    } finally {
      setRestoringDeletion(false);
    }
  }

  const duplicateSong = useCallback(async (song: Song) => {
    if (duplicateInFlightRef.current) return;

    duplicateInFlightRef.current = true;
    setDuplicatingSongId(song.id);
    setFeedback(null);

    try {
      const duplicate = await songRepository.duplicate(song.id);
      if (!duplicate) throw new Error("Song not found");
      setFeedback({ message: `“${song.title}” duplicated`, tone: "success" });
    } catch {
      setFeedback({
        message: "Song could not be duplicated. Please try again.",
        tone: "error",
      });
    } finally {
      duplicateInFlightRef.current = false;
      setDuplicatingSongId(null);
    }
  }, []);

  if (liveSongs === undefined) {
    return (
      <LoadingState label="Loading song library…" className="min-h-[60dvh]" />
    );
  }

  return (
    <div
      className="mx-auto max-w-[1440px] px-3 py-7 pb-32 min-[375px]:px-4 sm:px-6 sm:py-10 md:pb-40 lg:px-8 lg:py-12 lg:pb-32"
      data-testid="song-library"
    >
      <AreaTutorial id="library" ready={liveSongs !== undefined} />
      <FeedbackToast
        message={feedback?.message ?? null}
        tone={feedback?.tone}
        actionLabel={
          pendingDeletion &&
          (feedback?.message.startsWith("Song deleted") ||
            feedback?.message.startsWith("Song could not be restored"))
            ? "Undo"
            : undefined
        }
        onAction={pendingDeletion ? () => void undoSongDeletion() : undefined}
        actionBusy={restoringDeletion}
      />
      <div data-tour="library-header">
        <PageHeader
          eyebrow="Your repertoire"
          title="Song library"
          description={
            <>
              {songs.length} {songs.length === 1 ? "song" : "songs"}, available
              offline on this device
            </>
          }
          actions={
            <div
              data-tour="library-actions"
              className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end"
            >
              <input
                ref={importRef}
                className="hidden"
                type="file"
                accept="application/json"
                onChange={(event) => {
                  window.dispatchEvent(new Event("setbook:dismiss-tutorial"));
                  setRestoreFile(event.currentTarget.files?.[0] ?? null);
                  setRestoreError(null);
                  event.currentTarget.value = "";
                }}
              />
              <Button
                id="library-backup"
                variant="secondary"
                onClick={() => importRef.current?.click()}
                disabled={restoring}
              >
                <Upload size={16} aria-hidden="true" />
                Import backup
              </Button>
              <Button
                variant="secondary"
                onClick={() => void backup()}
                isLoading={backingUp}
                loadingLabel="Creating backup…"
              >
                <Download size={16} aria-hidden="true" />
                Back up
              </Button>
              <Button asChild>
                <Link href="/songs/new">Add song</Link>
              </Button>
            </div>
          }
        />
      </div>
      <Card
        data-tour="library-search"
        className="mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:p-4"
      >
        <label className="relative flex-1">
          <Search
            className="absolute left-3 top-2.5 text-slate-400"
            size={18}
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search songs"
            className="pl-10"
            placeholder="Search title, artist, or tag…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Button
          variant="secondary"
          aria-label={
            sort === "updated"
              ? "Sort songs by title"
              : "Sort songs by recently edited"
          }
          onClick={() => setSort(sort === "updated" ? "title" : "updated")}
        >
          <ArrowDownAZ size={17} aria-hidden="true" />
          {sort === "updated" ? "Recently edited" : "Title A–Z"}
        </Button>
      </Card>
      <div data-tour="library-collection">
        {filtered.length ? (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_32px_-28px_rgba(0,0,0,0.35)] dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            {progressive.visibleItems.map((song) => (
              <SongRow
                key={song.id}
                song={song}
                onDelete={setDeletingSong}
                onDuplicate={duplicateSong}
                duplicating={duplicatingSongId === song.id}
              />
            ))}
          </div>
        ) : (
          <Card className="grid min-h-80 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                <FileMusic size={26} aria-hidden="true" />
              </span>
              <h2 className="text-lg font-bold">
                {normalizedQuery ? "No songs found" : "Build your book"}
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                {normalizedQuery
                  ? "Try a different title, artist, or tag."
                  : "Paste in an ordinary chord sheet and SetBook will turn it into an editable chart."}
              </p>
              {!normalizedQuery && (
                <Button asChild className="mt-5">
                  <Link href="/songs/new">Create your first song</Link>
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
      <ProgressiveCollectionFooter
        visibleCount={progressive.visibleCount}
        totalCount={progressive.totalCount}
        hasMore={progressive.hasMore}
        sentinelRef={progressive.sentinelRef}
        onShowMore={progressive.showMore}
      />
      <ScrollToTopButton />
      <Dialog.Root
        open={Boolean(deletingSong)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeletingSong(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]"
            data-testid="song-delete-overlay"
          />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900">
            <Dialog.Title className="text-lg font-bold">
              Delete Song?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Delete “{deletingSong?.title}” from this device? Any entries for
              this song will also be removed from your setlists. You can undo
              immediately after deletion.
            </Dialog.Description>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary" disabled={deleting}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                type="button"
                variant="danger"
                isLoading={deleting}
                loadingLabel="Deleting…"
                onClick={() => void deleteSong()}
              >
                <Trash2 size={16} aria-hidden="true" />
                Delete
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={Boolean(restoreFile)}
        onOpenChange={(open) => {
          if (!open && !restoring) {
            setRestoreFile(null);
            setRestoreError(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900">
            <Dialog.Title className="text-lg font-bold">
              Import this backup?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Importing “{restoreFile?.name}” adds songs and setlists that are
              not already on this device. Items with matching IDs are skipped.
              Existing data stays unchanged. Backup settings are used only if
              this device has no saved settings yet.
            </Dialog.Description>
            <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100">
              Duplicate songs and setlists will not be added again.
            </div>
            {restoreError && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
              >
                {restoreError}
              </p>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary" disabled={restoring}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                type="button"
                isLoading={restoring}
                loadingLabel="Importing…"
                onClick={() => void restore()}
              >
                <Upload size={16} aria-hidden="true" />
                Import new items
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
