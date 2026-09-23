"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDownAZ,
  Copy,
  Download,
  FileMusic,
  MoreHorizontal,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { songRepository } from "@/data/repositories/song-repository";
import { exportLibrary, importLibrary } from "@/data/repositories/backup";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function SongLibrary() {
  const liveSongs = useLiveQuery(() => songRepository.list(), []);
  const songs = useMemo(() => liveSongs ?? [], [liveSongs]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"updated" | "title">("updated");
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:py-10">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-semibold text-indigo-600">
            Your repertoire
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Song library
          </h1>
          <p className="mt-1 text-slate-500">
            {songs.length} {songs.length === 1 ? "song" : "songs"}, available
            offline on this device
          </p>
        </div>
        <div className="flex gap-2">
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
            Restore
          </Button>
          <Button variant="secondary" onClick={() => void backup()}>
            <Download size={16} />
            Backup
          </Button>
          <Button asChild>
            <Link href="/songs/new">Add song</Link>
          </Button>
        </div>
      </div>
      <Card className="mb-4 flex flex-col gap-3 p-3 sm:flex-row">
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {filtered.map((song, index) => (
            <div
              key={song.id}
              className={`group flex items-center gap-4 p-4 ${index ? "border-t border-slate-100" : ""}`}
            >
              <div className="hidden h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-indigo-600 sm:grid">
                <FileMusic size={19} />
              </div>
              <Link href={`/songs/${song.id}`} className="min-w-0 flex-1">
                <h2 className="truncate font-semibold text-slate-950 group-hover:text-indigo-700">
                  {song.title}
                </h2>
                <p className="truncate text-sm text-slate-500">
                  {song.artist || "Unknown artist"} ·{" "}
                  {song.originalKey
                    ? `Key of ${song.originalKey}`
                    : "No key set"}{" "}
                  · {song.sections.length} sections
                </p>
              </Link>
              <div className="hidden gap-1 sm:flex">
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
                  aria-label="Delete song"
                  onClick={() =>
                    confirm(`Delete “${song.title}”?`) &&
                    void songRepository.delete(song.id)
                  }
                >
                  <Trash2 size={17} />
                </Button>
              </div>
              <MoreHorizontal className="text-slate-400 sm:hidden" size={18} />
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
    </div>
  );
}
