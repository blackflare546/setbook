"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ExternalLink,
  GripVertical,
  Play,
  Plus,
  Save,
  Share2,
  Trash2,
} from "lucide-react";
import type { Setlist } from "@/core/setlists/types";
import { reorderEntries } from "@/core/setlists/operations";
import { setlistRepository } from "@/data/repositories/setlist-repository";
import { songRepository } from "@/data/repositories/song-repository";
import { createPublishedSnapshot } from "@/lib/sharing/snapshot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

export function SetlistEditor({ id }: { id: string }) {
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const songs = useLiveQuery(() => songRepository.list(), []) ?? [];
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeLinks, setIncludeLinks] = useState(false);
  const [publishing, setPublishing] = useState(false);
  useEffect(() => {
    void setlistRepository.get(id).then((value) => setSetlist(value ?? null));
  }, [id]);
  const songMap = new Map(songs.map((song) => [song.id, song]));
  if (!setlist)
    return (
      <div className="p-12 text-center text-slate-500">Loading setlist…</div>
    );
  const currentSetlist = setlist;
  const update = (next: Partial<Setlist>) =>
    setSetlist({ ...currentSetlist, ...next });
  async function save() {
    setSetlist(await setlistRepository.save(currentSetlist));
  }
  async function publish() {
    setPublishing(true);
    const snapshot = createPublishedSnapshot(currentSetlist, songs, {
      includeNotes,
      includeLinks,
    });
    const response = await fetch(
      currentSetlist.publishToken
        ? `/api/published-setlists/${currentSetlist.publishToken}`
        : "/api/published-setlists",
      {
        method: currentSetlist.publishToken ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(snapshot),
      },
    );
    const result = await response.json();
    if (response.ok && result.token) {
      const saved = await setlistRepository.save({
        ...currentSetlist,
        publishToken: result.token,
      });
      setSetlist(saved);
    } else alert(result.error ?? "Unable to publish setlist.");
    setPublishing(false);
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-7 pb-24 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" className="-ml-3">
          <Link href="/setlists">
            <ArrowLeft size={17} />
            Setlists
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Setlist editor
          </p>
          <h1 className="truncate text-2xl font-bold">{setlist.name}</h1>
        </div>
        <Button variant="secondary" onClick={() => void save()}>
          <Save size={16} />
          Save
        </Button>
        <Button asChild disabled={!setlist.entries.length}>
          <Link href={`/performance/${setlist.id}`}>
            <Play size={16} />
            Perform
          </Link>
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_310px]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-semibold">
                Name
                <Input
                  className="mt-1"
                  value={setlist.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </label>
              <label className="text-sm font-semibold">
                Venue
                <Input
                  className="mt-1"
                  value={setlist.venue}
                  onChange={(e) => update({ venue: e.target.value })}
                />
              </label>
              <label className="text-sm font-semibold">
                Date
                <Input
                  className="mt-1"
                  type="date"
                  value={setlist.date ?? ""}
                  onChange={(e) =>
                    update({ date: e.target.value || undefined })
                  }
                />
              </label>
            </div>
          </Card>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold">Running order</h2>
              <p className="text-sm text-slate-500">
                {setlist.entries.length} songs
              </p>
            </div>
            <select
              aria-label="Add song"
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                update({
                  entries: [
                    ...setlist.entries,
                    {
                      id: crypto.randomUUID(),
                      songId: e.target.value,
                      arrangementCue: "",
                    },
                  ],
                });
              }}
            >
              <option value="">+ Add song</option>
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title} — {song.artist}
                </option>
              ))}
            </select>
          </div>
          {setlist.entries.map((entry, index) => {
            const song = songMap.get(entry.songId);
            return (
              <Card key={entry.id} className="p-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <GripVertical size={18} />
                    <span className="text-xs font-bold">{index + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-bold">
                          {song?.title ?? "Missing song"}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {song?.artist || "Unknown artist"} · Original key{" "}
                          {song?.originalKey || "—"}
                        </p>
                      </div>
                      <div className="flex">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={!index}
                          onClick={() =>
                            update({
                              entries: reorderEntries(
                                setlist.entries,
                                index,
                                index - 1,
                              ),
                            })
                          }
                        >
                          <ArrowUp size={15} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={index === setlist.entries.length - 1}
                          onClick={() =>
                            update({
                              entries: reorderEntries(
                                setlist.entries,
                                index,
                                index + 1,
                              ),
                            })
                          }
                        >
                          <ArrowDown size={15} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            update({
                              entries: setlist.entries.filter(
                                (item) => item.id !== entry.id,
                              ),
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr]">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Performance key
                        <Input
                          className="mt-1 font-mono normal-case"
                          value={
                            entry.performanceKey ?? song?.originalKey ?? ""
                          }
                          onChange={(e) =>
                            update({
                              entries: setlist.entries.map((item) =>
                                item.id === entry.id
                                  ? { ...item, performanceKey: e.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                      </label>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Arrangement cue
                        <Input
                          className="mt-1 normal-case"
                          placeholder="Count-in, cut after bridge…"
                          value={entry.arrangementCue}
                          onChange={(e) =>
                            update({
                              entries: setlist.entries.map((item) =>
                                item.id === entry.id
                                  ? { ...item, arrangementCue: e.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          {!setlist.entries.length && (
            <Card className="grid min-h-48 place-items-center p-6 text-center">
              <div>
                <Plus className="mx-auto mb-2 text-indigo-500" />
                <h3 className="font-bold">Add the first song</h3>
                <p className="text-sm text-slate-500">
                  Choose a song from your library above.
                </p>
              </div>
            </Card>
          )}
        </div>
        <aside className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 font-bold">Setlist & band notes</h2>
            <Textarea
              className="min-h-36"
              placeholder="Load-in, tuning, transitions…"
              value={setlist.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </Card>
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Share2 className="text-indigo-600" size={18} />
              <h2 className="font-bold">Public link</h2>
            </div>
            <p className="mb-4 text-sm leading-6 text-slate-500">
              Publish a read-only snapshot. Your private library stays on this
              device.
            </p>
            <label className="mb-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={(e) => setIncludeNotes(e.target.checked)}
              />
              Include setlist and band notes
            </label>
            <label className="mb-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeLinks}
                onChange={(e) => setIncludeLinks(e.target.checked)}
              />
              Include song links
            </label>
            <Button
              className="w-full"
              onClick={() => void publish()}
              disabled={publishing || !setlist.entries.length}
            >
              {setlist.publishToken ? (
                <Check size={16} />
              ) : (
                <Share2 size={16} />
              )}{" "}
              {publishing
                ? "Publishing…"
                : setlist.publishToken
                  ? "Update published setlist"
                  : "Publish setlist"}
            </Button>
            {setlist.publishToken && (
              <Button asChild variant="secondary" className="mt-2 w-full">
                <Link target="_blank" href={`/s/${setlist.publishToken}`}>
                  <ExternalLink size={16} />
                  Open public link
                </Link>
              </Button>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
