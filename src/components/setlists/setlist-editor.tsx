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
  Search,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import type { Setlist } from "@/core/setlists/types";
import { reorderEntries } from "@/core/setlists/operations";
import { setlistRepository } from "@/data/repositories/setlist-repository";
import { songRepository } from "@/data/repositories/song-repository";
import { createPublishedSnapshot } from "@/lib/sharing/snapshot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { MusicalKeySelect } from "@/components/ui/musical-key-select";
import { formatMusicalKey } from "@/core/chords/keys";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function SetlistEditor({ id }: { id: string }) {
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const songs = useLiveQuery(() => songRepository.list(), []) ?? [];
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeLinks, setIncludeLinks] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [songQuery, setSongQuery] = useState("");
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  useEffect(() => {
    void setlistRepository.get(id).then((value) => {
      setSetlist(value ?? null);
      setSaveState("idle");
    });
  }, [id]);
  useEffect(() => {
    if (!feedback || feedback.tone !== "success") return;
    const timeout = window.setTimeout(() => {
      setFeedback(null);
      setSaveState((current) => (current === "saved" ? "idle" : current));
    }, 2500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);
  const songMap = new Map(songs.map((song) => [song.id, song]));
  if (!setlist)
    return (
      <div className="p-12 text-center text-slate-500">Loading setlist…</div>
    );
  const currentSetlist = setlist;
  const update = (next: Partial<Setlist>) => {
    setFeedback(null);
    setSaveState("dirty");
    setSetlist({ ...currentSetlist, ...next });
  };
  async function save() {
    setFeedback(null);
    setSaveState("saving");
    try {
      setSetlist(await setlistRepository.save(currentSetlist));
      setSaveState("saved");
      setFeedback({ message: "Setlist saved", tone: "success" });
    } catch {
      setSaveState("error");
      setFeedback({
        message: "Setlist could not be saved. Please try again.",
        tone: "error",
      });
    }
  }
  async function publish() {
    setPublishing(true);
    setFeedback(null);
    try {
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
      if (!response.ok || !result.token)
        throw new Error(result.error ?? "Unable to publish setlist.");
      const saved = await setlistRepository.save({
        ...currentSetlist,
        publishToken: result.token,
      });
      setSetlist(saved);
      setSaveState("idle");
      setFeedback({
        message: currentSetlist.publishToken
          ? "Published setlist updated"
          : "Setlist published",
        tone: "success",
      });
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error ? error.message : "Unable to publish setlist.",
        tone: "error",
      });
    } finally {
      setPublishing(false);
    }
  }
  const matchingSongs = songs.filter((song) =>
    `${song.title} ${song.artist}`
      .toLocaleLowerCase()
      .includes(songQuery.trim().toLocaleLowerCase()),
  );
  return (
    <div className="mx-auto max-w-6xl px-3 py-5 pb-24 min-[375px]:px-4 sm:px-6 sm:py-7">
      <FeedbackToast
        message={feedback?.message ?? null}
        tone={feedback?.tone}
      />
      <div className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
          <h1 className="break-words text-2xl font-bold">{setlist.name}</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            variant="secondary"
            onClick={() => void save()}
            disabled={saveState === "saving"}
          >
            <Save size={16} />
            {saveState === "saving" ? "Saving…" : "Save"}
          </Button>
          <Button asChild disabled={!setlist.entries.length}>
            <Link href={`/performance/${setlist.id}`}>
              <Play size={16} />
              Perform
            </Link>
          </Button>
        </div>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Running order</h2>
              <p className="text-sm text-slate-500">
                {setlist.entries.length}{" "}
                {setlist.entries.length === 1 ? "song" : "songs"}
              </p>
            </div>
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              onClick={() => setPickerOpen((open) => !open)}
              aria-expanded={pickerOpen}
            >
              {pickerOpen ? <X size={17} /> : <Plus size={17} />}
              {pickerOpen ? "Close" : "Add song"}
            </Button>
          </div>
          {pickerOpen && (
            <Card className="p-3 sm:p-4">
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute left-3 top-3 text-slate-400"
                  size={18}
                />
                <Input
                  autoFocus
                  aria-label="Search songs"
                  className="pl-10"
                  placeholder="Search songs by title or artist…"
                  value={songQuery}
                  onChange={(event) => setSongQuery(event.target.value)}
                />
              </label>
              <div className="mt-2 max-h-72 overflow-y-auto overscroll-contain">
                {matchingSongs.length ? (
                  matchingSongs.map((song) => (
                    <button
                      key={song.id}
                      className="flex min-h-14 w-full flex-col justify-center rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => {
                        update({
                          entries: [
                            ...setlist.entries,
                            {
                              id: crypto.randomUUID(),
                              songId: song.id,
                              arrangementCue: "",
                            },
                          ],
                        });
                        setSongQuery("");
                        setPickerOpen(false);
                      }}
                    >
                      <span className="break-words font-semibold">
                        {song.title}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {song.artist || "Unknown artist"}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-6 text-center text-sm text-slate-500">
                    No matching songs
                  </p>
                )}
              </div>
            </Card>
          )}
          {setlist.entries.map((entry, index) => {
            const song = songMap.get(entry.songId);
            return (
              <Card key={entry.id} className="min-w-0 p-3 min-[375px]:p-4">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
                  <div className="flex items-center gap-2 text-slate-400 sm:flex-col sm:gap-1">
                    <GripVertical size={18} />
                    <span className="text-xs font-bold">Song {index + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-base font-bold">
                          {song?.title ?? "Missing song"}
                        </h3>
                        <p className="break-words text-sm text-slate-500 dark:text-slate-400">
                          {song?.artist || "Unknown artist"} · Original key{" "}
                          {formatMusicalKey(song?.originalKey)}
                        </p>
                      </div>
                      <div className="flex self-start rounded-lg border border-slate-200 dark:border-slate-800">
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
                    <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Performance key
                        <MusicalKeySelect
                          ariaLabel="Performance key"
                          className="mt-1 font-mono normal-case"
                          value={
                            entry.performanceKey ?? song?.originalKey ?? ""
                          }
                          onChange={(performanceKey) =>
                            update({
                              entries: setlist.entries.map((item) =>
                                item.id === entry.id
                                  ? {
                                      ...item,
                                      performanceKey:
                                        performanceKey || undefined,
                                    }
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
