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
import { parseSong } from "@/core/parser/parser";
import { songRepository } from "@/data/repositories/song-repository";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

const example = `[Verse 1]\nG                 D\nI found a love for me\nEm                           C\nDarling, just dive right in\n\n[Chorus]\n[G]Take me into your [D]loving arms`;

export function SongEditor({ songId }: { songId?: string }) {
  const router = useRouter();
  const [song, setSong] = useState<Song | null>(
    songId ? null : createEmptySong(),
  );
  const [paste, setPaste] = useState("");
  const [mode, setMode] = useState<"paste" | "edit">(songId ? "edit" : "paste");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (songId)
      void songRepository
        .get(songId)
        .then((found) => setSong(found ?? createEmptySong()));
  }, [songId]);

  function update(next: Partial<Song>) {
    setSong((current) => (current ? { ...current, ...next } : current));
  }
  function smartPaste() {
    if (!paste.trim()) return;
    const parsed = parseSong(paste, {
      title: song?.title === "Untitled song" ? "" : song?.title,
      artist: song?.artist,
      originalKey: song?.originalKey,
    });
    setSong({
      ...parsed,
      id: song?.id ?? parsed.id,
      createdAt: song?.createdAt ?? parsed.createdAt,
    });
    setMode("edit");
  }
  async function save() {
    if (!song || !song.title.trim()) return;
    setSaving(true);
    await songRepository.save(song);
    setSaving(false);
    router.push("/library");
  }
  if (!song)
    return (
      <div className="p-10 text-center text-slate-500">Loading chart…</div>
    );

  if (mode === "paste")
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-5 -ml-3"
        >
          <ArrowLeft size={17} />
          Library
        </Button>
        <div className="mb-7">
          <p className="mb-1 text-sm font-semibold text-indigo-600">
            Smart Paste
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Create a song chart
          </h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            Paste the chord sheet you already have. SetBook recognizes chord
            rows, inline chords, and section labels—no special markup required.
          </p>
        </div>
        <Card className="overflow-hidden">
          <div className="grid gap-4 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Title
              <Input
                className="mt-1.5 bg-white normal-case"
                value={song.title}
                onChange={(e) => update({ title: e.target.value })}
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Artist
              <Input
                className="mt-1.5 bg-white normal-case"
                value={song.artist}
                onChange={(e) => update({ artist: e.target.value })}
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Original key
              <Input
                className="mt-1.5 bg-white normal-case"
                placeholder="G"
                value={song.originalKey}
                onChange={(e) => update({ originalKey: e.target.value })}
              />
            </label>
          </div>
          <div className="p-4 sm:p-6">
            <label className="mb-2 block text-sm font-semibold">
              Chord sheet
            </label>
            <Textarea
              data-testid="smart-paste-input"
              className="min-h-[360px] resize-y font-mono leading-7"
              placeholder={example}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
            <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-xs text-slate-500">
                Your text stays in this browser. Parsing happens entirely on
                this device.
              </p>
              <Button
                data-testid="parse-song"
                size="lg"
                disabled={!paste.trim()}
                onClick={smartPaste}
              >
                <Sparkles size={18} />
                Review chart
                <ChevronRight size={17} />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 pb-24 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={() => router.back()} className="-ml-3">
          <ArrowLeft size={17} />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Chart editor
          </p>
          <h1 className="truncate text-2xl font-bold">
            {song.title || "Untitled song"}
          </h1>
        </div>
        <Button variant="secondary" onClick={() => setMode("paste")}>
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
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 p-3">
                <Music size={16} className="text-indigo-600" />
                <Input
                  aria-label="Section name"
                  className="h-8 max-w-56 bg-white font-semibold"
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
                <div className="ml-auto flex">
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
                    className="rounded-lg border border-slate-200 p-3"
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
                            className="px-1.5"
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
                    <div className="flex gap-2">
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
