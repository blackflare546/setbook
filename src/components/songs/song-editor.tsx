"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Music,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Song } from "@/core/songs/types";
import { createEmptySong, newId } from "@/core/songs/types";
import { parseSong, sectionsToText } from "@/core/parser/parser";
import { songRepository } from "@/data/repositories/song-repository";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { FeedbackToast } from "@/components/ui/feedback-toast";

const example = `[Verse 1]\nG                 D\nI found a love for me\nEm                           C\nDarling, just dive right in\n\n[Chorus]\n[G]Take me into your [D]loving arms`;

export function SongEditor({ songId }: { songId?: string }) {
  const router = useRouter();
  const [song, setSong] = useState<Song | null>(
    songId ? null : createEmptySong(),
  );
  const [paste, setPaste] = useState("");
  const [mode, setMode] = useState<"paste" | "edit">("paste");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  useEffect(() => {
    if (songId)
      void songRepository.get(songId).then((found) => {
        const loaded = found ?? createEmptySong();
        setSong(loaded);
        setPaste(loaded.sourceText || sectionsToText(loaded.sections));
      });
  }, [songId]);

  function update(next: Partial<Song>) {
    setSong((current) =>
      current
        ? {
            ...current,
            ...next,
            sourceText: next.sections
              ? sectionsToText(next.sections)
              : current.sourceText,
          }
        : current,
    );
  }
  function openSmartPaste() {
    setPaste(song?.sourceText || sectionsToText(song?.sections ?? []));
    setMode("paste");
  }
  function leaveEditor() {
    router.push(songId ? `/songs/${songId}` : "/library");
  }
  function parseDraft(): Song | null {
    if (!song || !paste.trim()) return null;
    const parsed = parseSong(paste, {
      title: song?.title === "Untitled song" ? "" : song?.title,
      artist: song?.artist,
      originalKey: song?.originalKey,
      capo: song?.capo,
    });
    return {
      ...song,
      ...parsed,
      id: song?.id ?? parsed.id,
      createdAt: song?.createdAt ?? parsed.createdAt,
      tags: song.tags,
      notes: song.notes,
      links: song.links,
    };
  }
  function smartPaste() {
    const parsed = parseDraft();
    if (!parsed) return;
    setSong(parsed);
    setMode("edit");
  }
  async function save(candidate: Song | null = song) {
    if (!candidate || !candidate.title.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      const saved = await songRepository.save(candidate);
      setSong(saved);
      setFeedback({ message: "Song saved", tone: "success" });
      window.setTimeout(() => router.push(`/songs/${saved.id}`), 700);
    } catch {
      setFeedback({
        message: "Song could not be saved. Please try again.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }
  async function saveFromPaste() {
    const parsed = parseDraft();
    if (!parsed) return;
    setSong(parsed);
    await save(parsed);
  }
  if (!song)
    return (
      <div className="p-10 text-center text-slate-500">Loading chart…</div>
    );

  if (mode === "paste")
    return (
      <div className="mx-auto max-w-4xl px-3 py-5 pb-28 min-[375px]:px-4 sm:px-6 sm:py-8 sm:pb-12 lg:py-12">
        <FeedbackToast
          message={feedback?.message ?? null}
          tone={feedback?.tone}
        />
        <Button
          variant="ghost"
          onClick={leaveEditor}
          className="mb-5 -ml-3 h-11 min-w-11 self-start"
        >
          <ArrowLeft size={17} />
          Back
        </Button>
        <div className="mb-5 sm:mb-7">
          <p className="mb-1 text-sm font-semibold text-indigo-600">
            Smart Paste
          </p>
          <h1 className="text-2xl font-bold tracking-tight min-[375px]:text-3xl">
            {songId ? "Edit song chart" : "Create a song chart"}
          </h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            Paste the chord sheet you already have. SetBook recognizes chord
            rows, inline chords, and section labels—no special markup required.
          </p>
        </div>
        <Card className="overflow-hidden">
          <div className="grid gap-4 border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Title
              <Input
                className="mt-1.5 normal-case"
                value={song.title}
                onChange={(e) => update({ title: e.target.value })}
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Artist
              <Input
                className="mt-1.5 normal-case"
                value={song.artist}
                onChange={(e) => update({ artist: e.target.value })}
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Original key
              <Input
                className="mt-1.5 normal-case"
                placeholder="G"
                value={song.originalKey}
                onChange={(e) => update({ originalKey: e.target.value })}
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Capo
              <select
                aria-label="Capo"
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-medium normal-case text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:h-10 sm:text-sm"
                value={song.capo ?? ""}
                onChange={(event) =>
                  update({
                    capo: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
              >
                <option value="">None</option>
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
          <div className="p-4 sm:p-6">
            <label className="mb-2 block text-sm font-semibold">
              Chord sheet
            </label>
            <Textarea
              data-testid="smart-paste-input"
              wrap="off"
              className="min-h-[50dvh] resize-y overflow-auto whitespace-pre font-mono leading-7 sm:min-h-[360px]"
              placeholder={example}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
            <div className="mt-6 flex flex-col items-stretch justify-between gap-4 sm:mt-7 sm:flex-row sm:items-center">
              <p className="text-xs text-slate-500">
                Your text stays in this browser. Parsing happens entirely on
                this device.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:justify-end">
                <Button
                  data-testid="parse-song"
                  variant="secondary"
                  size="lg"
                  disabled={!paste.trim()}
                  onClick={smartPaste}
                >
                  <Sparkles size={18} />
                  Review chart
                  <ChevronRight size={17} />
                </Button>
                <Button
                  data-testid="save-song"
                  size="lg"
                  disabled={saving || !paste.trim() || !song.title.trim()}
                  onClick={() => void saveFromPaste()}
                >
                  <Save size={18} />
                  {saving ? "Saving…" : "Save song"}
                </Button>
                <Button variant="ghost" size="lg" onClick={leaveEditor}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 pb-24 min-[375px]:px-4 sm:px-6 sm:py-7">
      <FeedbackToast
        message={feedback?.message ?? null}
        tone={feedback?.tone}
      />
      <div className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button variant="ghost" onClick={() => router.back()} className="-ml-3">
          <ArrowLeft size={17} />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Chart editor
          </p>
          <h1 className="break-words text-2xl font-bold">
            {song.title || "Untitled song"}
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="secondary" onClick={openSmartPaste}>
            <Sparkles size={16} />
            Smart Paste
          </Button>
          <Button
            data-testid="save-song"
            onClick={() => void save()}
            disabled={saving || !song.title.trim()}
          >
            <Save size={17} />
            {saving ? "Saving…" : "Save song"}
          </Button>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <label className="block text-sm font-semibold">
              Title
              <Input
                className="mt-1.5"
                value={song.title}
                onChange={(e) => update({ title: e.target.value })}
              />
            </label>
            <label className="block text-sm font-semibold">
              Artist
              <Input
                className="mt-1.5"
                value={song.artist}
                onChange={(e) => update({ artist: e.target.value })}
              />
            </label>
            <label className="block text-sm font-semibold">
              Original key
              <Input
                className="mt-1.5"
                value={song.originalKey}
                onChange={(e) => update({ originalKey: e.target.value })}
              />
            </label>
            <label className="block text-sm font-semibold">
              Capo
              <select
                aria-label="Capo"
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:h-10 sm:text-sm"
                value={song.capo ?? ""}
                onChange={(event) =>
                  update({
                    capo: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
              >
                <option value="">None</option>
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Tags
              <Input
                className="mt-1.5"
                placeholder="worship, acoustic"
                value={song.tags.join(", ")}
                onChange={(e) =>
                  update({
                    tags: e.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
            <label className="block text-sm font-semibold">
              Song notes
              <Textarea
                className="mt-1.5"
                value={song.notes}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </label>
          </Card>
        </div>
        <div className="space-y-4">
          {song.sections.map((section, sectionIndex) => (
            <Card key={section.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                <Music size={16} className="text-indigo-600" />
                <Input
                  aria-label="Section name"
                  className="min-w-0 flex-1 font-semibold sm:max-w-56"
                  value={section.title}
                  onChange={(e) =>
                    update({
                      sections: song.sections.map((item) =>
                        item.id === section.id
                          ? { ...item, title: e.target.value }
                          : item,
                      ),
                    })
                  }
                />
                <div className="ml-auto flex shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={!sectionIndex}
                    onClick={() => {
                      const next = [...song.sections];
                      [next[sectionIndex - 1], next[sectionIndex]] = [
                        next[sectionIndex],
                        next[sectionIndex - 1],
                      ];
                      update({ sections: next });
                    }}
                  >
                    <ArrowUp size={15} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={sectionIndex === song.sections.length - 1}
                    onClick={() => {
                      const next = [...song.sections];
                      [next[sectionIndex], next[sectionIndex + 1]] = [
                        next[sectionIndex + 1],
                        next[sectionIndex],
                      ];
                      update({ sections: next });
                    }}
                  >
                    <ArrowDown size={15} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      update({
                        sections: song.sections.filter(
                          (item) => item.id !== section.id,
                        ),
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
              <div className="space-y-3 p-4">
                {section.lines.map((line) => (
                  <div
                    key={line.id}
                    className="min-w-0 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div className="mb-2 flex flex-wrap gap-2">
                      {line.chords.map((chord) => (
                        <div
                          key={chord.id}
                          className="flex items-center rounded-md bg-amber-50 text-amber-900"
                        >
                          <input
                            aria-label="Chord symbol"
                            className="w-14 bg-transparent px-2 py-1 font-mono text-sm font-bold outline-none"
                            value={chord.symbol}
                            onChange={(e) =>
                              update({
                                sections: song.sections.map((s) =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        lines: s.lines.map((l) =>
                                          l.id === line.id
                                            ? {
                                                ...l,
                                                chords: l.chords.map((c) =>
                                                  c.id === chord.id
                                                    ? {
                                                        ...c,
                                                        symbol: e.target.value,
                                                      }
                                                    : c,
                                                ),
                                              }
                                            : l,
                                        ),
                                      }
                                    : s,
                                ),
                              })
                            }
                          />
                          <input
                            aria-label="Chord position"
                            type="number"
                            min={0}
                            className="w-12 border-l border-amber-200 bg-transparent px-1 py-1 text-xs outline-none"
                            value={chord.position}
                            onChange={(e) =>
                              update({
                                sections: song.sections.map((s) =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        lines: s.lines.map((l) =>
                                          l.id === line.id
                                            ? {
                                                ...l,
                                                chords: l.chords.map((c) =>
                                                  c.id === chord.id
                                                    ? {
                                                        ...c,
                                                        position: Number(
                                                          e.target.value,
                                                        ),
                                                      }
                                                    : c,
                                                ),
                                              }
                                            : l,
                                        ),
                                      }
                                    : s,
                                ),
                              })
                            }
                          />
                          <button
                            className="min-h-9 min-w-9 px-1.5 text-lg"
                            aria-label="Delete chord"
                            onClick={() =>
                              update({
                                sections: song.sections.map((s) =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        lines: s.lines.map((l) =>
                                          l.id === line.id
                                            ? {
                                                ...l,
                                                chords: l.chords.filter(
                                                  (c) => c.id !== chord.id,
                                                ),
                                              }
                                            : l,
                                        ),
                                      }
                                    : s,
                                ),
                              })
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          update({
                            sections: song.sections.map((s) =>
                              s.id === section.id
                                ? {
                                    ...s,
                                    lines: s.lines.map((l) =>
                                      l.id === line.id
                                        ? {
                                            ...l,
                                            chords: [
                                              ...l.chords,
                                              {
                                                id: newId(),
                                                symbol: "G",
                                                position: 0,
                                              },
                                            ],
                                          }
                                        : l,
                                    ),
                                  }
                                : s,
                            ),
                          })
                        }
                      >
                        <Plus size={14} />
                        Chord
                      </Button>
                    </div>
                    <div className="flex min-w-0 gap-2">
                      <Input
                        aria-label="Lyrics"
                        className="font-mono"
                        value={line.lyrics}
                        onChange={(e) =>
                          update({
                            sections: song.sections.map((s) =>
                              s.id === section.id
                                ? {
                                    ...s,
                                    lines: s.lines.map((l) =>
                                      l.id === line.id
                                        ? { ...l, lyrics: e.target.value }
                                        : l,
                                    ),
                                  }
                                : s,
                            ),
                          })
                        }
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          update({
                            sections: song.sections.map((s) =>
                              s.id === section.id
                                ? {
                                    ...s,
                                    lines: s.lines.filter(
                                      (l) => l.id !== line.id,
                                    ),
                                  }
                                : s,
                            ),
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    update({
                      sections: song.sections.map((s) =>
                        s.id === section.id
                          ? {
                              ...s,
                              lines: [
                                ...s.lines,
                                { id: newId(), lyrics: "", chords: [] },
                              ],
                            }
                          : s,
                      ),
                    })
                  }
                >
                  <Plus size={15} />
                  Add line
                </Button>
              </div>
            </Card>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              update({
                sections: [
                  ...song.sections,
                  {
                    id: newId(),
                    type: "other",
                    title: "New section",
                    lines: [{ id: newId(), lyrics: "", chords: [] }],
                  },
                ],
              })
            }
          >
            <Plus size={16} />
            Add section
          </Button>
        </div>
      </div>
    </div>
  );
}
