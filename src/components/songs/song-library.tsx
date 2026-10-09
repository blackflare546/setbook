"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { songRepository } from "@/data/repositories/song-repository";
import { exportLibrary, importLibrary } from "@/data/repositories/backup";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { PageHeader } from "@/components/ui/page-header";
import { formatMusicalKey } from "@/core/chords/keys";
import type { Song } from "@/core/songs/types";

function SongActions({
  song,
  onDelete,
}: {
  song: Song;
  onDelete: (song: Song) => void;
}) {
  return (
    <>
      <div className="hidden gap-1 sm:flex">
        <Button asChild variant="ghost" size="icon" aria-label="Edit song">
          <Link href={`/songs/${song.id}/edit`}>
            <Pencil size={17} />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Duplicate song"
          onClick={() => void songRepository.duplicate(song.id)}
        >
          <Copy size={17} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
          aria-label="Delete song"
          onClick={() => onDelete(song)}
        >
          <Trash2 size={17} />
        </Button>
      </div>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 sm:hidden"
            aria-label={`Song actions for ${song.title}`}
          >
            <MoreHorizontal size={20} />
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
                <Pencil size={17} />
                Edit
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-semibold outline-none hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
              onSelect={() => void songRepository.duplicate(song.id)}
            >
              <Copy size={17} />
              Duplicate
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
            <DropdownMenu.Item
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-semibold text-rose-600 outline-none hover:bg-rose-50 focus:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:focus:bg-rose-950/40"
              onSelect={() => onDelete(song)}
            >
              <Trash2 size={17} />
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}

export function SongLibrary() {
  const liveSongs = useLiveQuery(() => songRepository.list(), []);
  const songs = useMemo(() => liveSongs ?? [], [liveSongs]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"updated" | "title">("updated");
  const [deletingSong, setDeletingSong] = useState<Song | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    const found = songs.filter((song) =>
      `${song.title} ${song.artist} ${song.tags.join(" ")}`
        .toLowerCase()
        .includes(normalized),
    );
    return sort === "title"
      ? found.toSorted((a, b) => a.title.localeCompare(b.title))
      : found;
  }, [songs, query, sort]);

  useEffect(() => {
    if (!feedback || feedback.tone !== "success") return;
    const timeout = window.setTimeout(() => setFeedback(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  async function backup() {
    const url = URL.createObjectURL(
      new Blob([await exportLibrary()], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `setbook-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function restore(file?: File) {
    if (!file) return;
    try {
      await importLibrary(await file.text());
      alert("Library restored.");
    } catch {
      alert("That file is not a valid SetBook backup.");
    }
  }

  async function deleteSong() {
    if (!deletingSong) return;
    setDeleting(true);
    setFeedback(null);
    try {
      await songRepository.delete(deletingSong.id);
      setDeletingSong(null);
      setFeedback({ message: "Song deleted", tone: "success" });
    } catch {
      setFeedback({
        message: "Song could not be deleted. Please try again.",
        tone: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="mx-auto max-w-[1440px] px-3 py-7 pb-32 min-[375px]:px-4 sm:px-6 sm:py-10 md:pb-40 lg:px-8 lg:py-12 lg:pb-32"
      data-testid="song-library"
    >
      <FeedbackToast
        message={feedback?.message ?? null}
        tone={feedback?.tone}
      />
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
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <input
              ref={importRef}
              className="hidden"
              type="file"
              accept="application/json"
              onChange={(event) => void restore(event.target.files?.[0])}
            />
            <Button
              variant="secondary"
              onClick={() => importRef.current?.click()}
            >
              <Upload size={16} />
              Import
            </Button>
            <Button variant="secondary" onClick={() => void backup()}>
              <Download size={16} />
              Export
            </Button>
            <Button asChild className="col-span-2 sm:col-span-1">
              <Link href="/songs/new">Add song</Link>
            </Button>
          </div>
        }
      />
      <Card className="mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:p-4">
        <label className="relative flex-1">
          <Search
            className="absolute left-3 top-2.5 text-slate-400"
            size={18}
          />
          <Input
            className="pl-10"
            placeholder="Search title, artist, or tag…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Button
          variant="secondary"
          onClick={() => setSort(sort === "updated" ? "title" : "updated")}
        >
          <ArrowDownAZ size={17} />
          {sort === "updated" ? "Recently edited" : "Title A–Z"}
        </Button>
      </Card>
      {filtered.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_32px_-28px_rgba(0,0,0,0.35)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          {filtered.map((song, index) => (
            <div
              key={song.id}
              data-testid={`song-row-${song.id}`}
              className={`group flex min-w-0 items-center gap-3 p-4 transition-colors hover:bg-slate-50 sm:gap-4 sm:px-5 dark:hover:bg-slate-800/50 ${index ? "border-t border-slate-100 dark:border-slate-800" : ""}`}
            >
              <div className="hidden h-10 w-10 place-items-center rounded-[10px] border border-indigo-100 bg-indigo-50 text-indigo-600 sm:grid dark:border-indigo-900 dark:bg-indigo-950/50">
                <FileMusic size={19} />
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
              <SongActions song={song} onDelete={setDeletingSong} />
            </div>
          ))}
        </div>
      ) : (
        <Card className="grid min-h-80 place-items-center p-8 text-center">
          <div>
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <FileMusic size={26} />
            </span>
            <h2 className="text-lg font-bold">
              {query ? "No songs found" : "Build your book"}
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              {query
                ? "Try a different title, artist, or tag."
                : "Paste in an ordinary chord sheet and SetBook will turn it into an editable chart."}
            </p>
            {!query && (
              <Button asChild className="mt-5">
                <Link href="/songs/new">Create your first song</Link>
              </Button>
            )}
          </div>
        </Card>
      )}
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
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-800 dark:bg-slate-950">
            <Dialog.Title className="text-lg font-bold">
              Delete Song?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Are you sure you want to delete “{deletingSong?.title}”? This
              action cannot be undone.
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
                disabled={deleting}
                onClick={() => void deleteSong()}
              >
                <Trash2 size={16} />
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
