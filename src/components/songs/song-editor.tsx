"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
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
import { parseSong, parseText, sectionsToText } from "@/core/parser/parser";
import {
  detectSongKey,
  type DetectedKeyCandidate,
} from "@/core/chords/key-detection";
import { MUSICAL_KEYS } from "@/core/chords/keys";
import { songRepository } from "@/data/repositories/song-repository";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { KeySelector } from "@/components/ui/key-selector";
import { AreaTutorial } from "@/components/tutorials/area-tutorial";
import { LoadingState } from "@/components/ui/loading-state";

const example = `[Verse 1]\nG                 D\nI found a love for me\nEm                           C\nDarling, just dive right in\n\n[Chorus]\n[G]Take me into your [D]loving arms`;
type SongLoadState = "loading" | "ready" | "not-found" | "error";

function validateSong(candidate: Song): string | null {
  if (!candidate.title.trim()) return "Add a song title before saving.";
  for (const section of candidate.sections) {
    if (!section.title.trim()) return "Every section needs a name.";
    for (const line of section.lines) {
      for (const chord of line.chords) {
        if (!chord.symbol.trim()) return "Chord symbols cannot be empty.";
        if (!Number.isInteger(chord.position) || chord.position < 0)
          return "Chord positions must be whole numbers at or above zero.";
      }
    }
  }
  return null;
}

function detectedKeyValue(candidate: DetectedKeyCandidate): string {
  return (
    MUSICAL_KEYS.find(
      (key) => key.root === candidate.key && key.mode === candidate.mode,
    )?.value ?? ""
  );
}
function detectedKeyLabel(candidate: DetectedKeyCandidate): string {
  return (
    MUSICAL_KEYS.find(
      (key) => key.root === candidate.key && key.mode === candidate.mode,
    )?.label ?? `${candidate.key} ${candidate.mode}`
  );
}

function OriginalDetectedKey({
  candidate,
}: {
  candidate: DetectedKeyCandidate;
}) {
  return (
    <div
      role="status"
      className="rounded-[10px] border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-950 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100"
    >
      Detected Key: {detectedKeyLabel(candidate)}
    </div>
  );
}

export function SongEditor({ songId }: { songId?: string }) {
  const router = useRouter();
  const [song, setSong] = useState<Song | null>(
    songId ? null : createEmptySong(),
  );
  const [loadState, setLoadState] = useState<SongLoadState>(
    songId ? "loading" : "ready",
  );
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [paste, setPaste] = useState("");
  const [keyDetection, setKeyDetection] = useState<ReturnType<
    typeof detectSongKey
  > | null>(null);
  const [mode, setMode] = useState<"paste" | "edit">("paste");
  const [originalDetectedKey, setOriginalDetectedKey] =
    useState<DetectedKeyCandidate | null>(null);
  const [keyManuallyChanged, setKeyManuallyChanged] = useState(Boolean(songId));
  const [saving, setSaving] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const editRevisionRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const navigationTimerRef = useRef<number | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  useEffect(() => {
    if (!songId) return;
    let active = true;
    void songRepository
      .get(songId)
      .then((found) => {
        if (!active) return;
        setResolvedId(songId);
        if (!found) {
          setSong(null);
          setLoadState("not-found");
          return;
        }
        const source = found.sourceText || sectionsToText(found.sections);
        const detection = detectSongKey(parseText(source));
        setSong(found);
        setPaste(source);
        setKeyDetection(detection);
        setOriginalDetectedKey(
          detection.confidence === "confident" && detection.primary
            ? detection.primary
            : null,
        );
        setMode("paste");
        setKeyManuallyChanged(true);
        setFeedback(null);
        setDiscardDialogOpen(false);
        editRevisionRef.current = 0;
        setLoadState("ready");
      })
      .catch(() => {
        if (!active) return;
        setResolvedId(songId);
        setSong(null);
        setLoadState("error");
      });
    return () => {
      active = false;
    };
  }, [loadAttempt, songId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (navigationTimerRef.current)
        window.clearTimeout(navigationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
      if (!editRevisionRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnAboutUnsavedChanges);
    return () =>
      window.removeEventListener("beforeunload", warnAboutUnsavedChanges);
  }, []);

  function cancelPendingNavigation() {
    if (!navigationTimerRef.current) return;
    window.clearTimeout(navigationTimerRef.current);
    navigationTimerRef.current = null;
  }

  function update(next: Partial<Song>) {
    editRevisionRef.current += 1;
    cancelPendingNavigation();
    setFeedback(null);
    setSong((current) =>
      current
        ? {
            ...current,
            ...next,
            // Regenerate lazily when opening Smart Paste or saving so a long
            // chart is not serialized on every structured-editor keystroke.
            sourceText: next.sections ? "" : current.sourceText,
          }
        : current,
    );
  }
  function openSmartPaste() {
    const source = song?.sourceText || sectionsToText(song?.sections ?? []);
    setPaste(source);
    setKeyDetection(source.trim() ? detectSongKey(parseText(source)) : null);
    setMode("paste");
  }
  function changePaste(value: string) {
    editRevisionRef.current += 1;
    cancelPendingNavigation();
    setFeedback(null);
    setPaste(value);
    if (originalDetectedKey) return;
    const detection = value.trim() ? detectSongKey(parseText(value)) : null;
    setKeyDetection(detection);
    if (
      !detection ||
      detection.confidence !== "confident" ||
      !detection.primary
    )
      return;

    setOriginalDetectedKey(detection.primary);
    if (!keyManuallyChanged && !song?.originalKey) {
      update({ originalKey: detectedKeyValue(detection.primary) });
    }
  }
  function changeSongKey(originalKey: string) {
    setKeyManuallyChanged(true);
    update({ originalKey });
  }
  function confirmLeaveEditor() {
    editRevisionRef.current = 0;
    cancelPendingNavigation();
    setDiscardDialogOpen(false);
    router.push(songId ? `/songs/${songId}` : "/library");
  }
  function leaveEditor() {
    if (editRevisionRef.current) {
      setDiscardDialogOpen(true);
      return;
    }
    confirmLeaveEditor();
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
    if (!candidate || saveInFlightRef.current) return;
    const validationError = validateSong(candidate);
    if (validationError) {
      setFeedback({ message: validationError, tone: "error" });
      return;
    }
    const revision = editRevisionRef.current;
    saveInFlightRef.current = true;
    setSaving(true);
    setFeedback(null);
    try {
      const saved = await songRepository.save(candidate);
      if (!mountedRef.current) return;
      const hasNewerEdits = editRevisionRef.current !== revision;
      if (!hasNewerEdits) {
        editRevisionRef.current = 0;
        setSong(saved);
      }
      setFeedback({
        message: hasNewerEdits
          ? "Saved. Newer changes still need saving."
          : "Song saved",
        tone: "success",
      });
      if (!hasNewerEdits) {
        navigationTimerRef.current = window.setTimeout(
          () => router.push(`/songs/${saved.id}`),
          700,
        );
      }
    } catch {
      if (mountedRef.current)
        setFeedback({
          message: "Song could not be saved. Please try again.",
          tone: "error",
        });
    } finally {
      saveInFlightRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  }
  async function saveFromPaste() {
    const parsed = parseDraft();
    if (!parsed) return;
    setSong(parsed);
    await save(parsed);
  }

  if (songId && (loadState === "loading" || resolvedId !== songId))
    return <LoadingState label="Loading chart…" className="min-h-[60dvh]" />;

  if (songId && (loadState === "not-found" || loadState === "error"))
    return (
      <div className="mx-auto grid min-h-[60dvh] max-w-xl place-items-center px-4 py-12 text-center">
        <Card className="w-full p-6 sm:p-8">
          <h1 className="text-xl font-bold">
            {loadState === "not-found"
              ? "Song not found"
              : "Song could not be loaded"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {loadState === "not-found"
              ? "It may have been deleted from this browser."
              : "No local data was changed. Try loading this song again."}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {loadState === "error" && (
              <Button
                onClick={() => {
                  setLoadState("loading");
                  setResolvedId(null);
                  setLoadAttempt((attempt) => attempt + 1);
                }}
              >
                Try again
              </Button>
            )}
            <Button asChild variant="secondary">
              <Link href="/library">Back to library</Link>
            </Button>
          </div>
        </Card>
      </div>
    );

  if (!song)
    return <LoadingState label="Loading chart…" className="min-h-[60dvh]" />;

  const discardDialog = (
    <Dialog.Root open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900">
          <Dialog.Title className="text-lg font-bold">
            Discard unsaved changes?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Changes made since the last save will be lost.
          </Dialog.Description>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button variant="secondary">Keep editing</Button>
            </Dialog.Close>
            <Button variant="danger" onClick={confirmLeaveEditor}>
              Discard changes
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );

  if (mode === "paste")
    return (
      <div className="mx-auto max-w-5xl px-3 py-7 pb-28 min-[375px]:px-4 sm:px-6 sm:py-10 sm:pb-12 lg:px-8 lg:py-12">
        <AreaTutorial id="song-editor" />
        <FeedbackToast
          message={feedback?.message ?? null}
          tone={feedback?.tone}
        />
        {discardDialog}
        <Button
          variant="ghost"
          onClick={leaveEditor}
          className="mb-5 -ml-3 h-11 min-w-11 self-start"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Back
        </Button>
        <div
          data-tour="song-editor-header"
          className="mb-7 border-b border-slate-200 pb-7 dark:border-slate-800"
        >
          <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-400">
            Smart Paste
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em] min-[375px]:text-4xl">
            {songId ? "Edit song chart" : "Create a song chart"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">
            Paste the chord sheet you already have. SetBook recognizes chord
            rows, inline chords, and section labels—no special markup required.
          </p>
        </div>
        <Card className="overflow-hidden">
          <div
            data-tour="song-editor-metadata"
            className="grid gap-4 border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 sm:p-5 lg:grid-cols-4"
          >
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
            <label
              data-tour="song-editor-key"
              className="text-xs font-bold uppercase tracking-wide text-slate-500"
            >
              Key
              <KeySelector
                ariaLabel="Song key"
                className="mt-1.5 normal-case"
                value={song.originalKey}
                onChange={changeSongKey}
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
            <label
              htmlFor="smart-paste-chart"
              className="mb-2 block text-sm font-semibold"
            >
              Chord sheet
            </label>
            <Textarea
              id="smart-paste-chart"
              data-testid="smart-paste-input"
              data-tour="song-editor-paste"
              wrap="off"
              className="min-h-[50dvh] resize-y overflow-auto whitespace-pre font-mono leading-7 sm:min-h-[360px]"
              placeholder={example}
              value={paste}
              onChange={(e) => changePaste(e.target.value)}
            />
            {originalDetectedKey ? (
              <div className="mt-5">
                <OriginalDetectedKey candidate={originalDetectedKey} />
              </div>
            ) : (
              keyDetection && (
                <div
                  role="status"
                  className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  {keyDetection.confidence === "ambiguous" &&
                    keyDetection.primary && (
                      <p className="text-sm font-semibold">
                        Possible Keys:{" "}
                        {[keyDetection.primary]
                          .concat(keyDetection.alternatives)
                          .map(detectedKeyLabel)
                          .join(" / ")}
                      </p>
                    )}
                  {keyDetection.confidence === "unknown" && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Key could not be determined reliably.
                    </p>
                  )}
                </div>
              )
            )}

            <div className="mt-6 flex flex-col items-stretch justify-between gap-4 sm:mt-7 sm:flex-row sm:items-center">
              <p className="text-xs text-slate-500">
                Your text stays in this browser. Parsing happens entirely on
                this device.
              </p>
              <div
                data-tour="song-editor-actions"
                className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:justify-end"
              >
                <Button
                  data-testid="parse-song"
                  variant="secondary"
                  size="lg"
                  disabled={!paste.trim()}
                  onClick={smartPaste}
                >
                  <Sparkles size={18} aria-hidden="true" />
                  Review chart
                  <ChevronRight size={17} aria-hidden="true" />
                </Button>
                <Button
                  data-testid="save-song"
                  size="lg"
                  disabled={saving || !paste.trim() || !song.title.trim()}
                  isLoading={saving}
                  loadingLabel="Saving…"
                  onClick={() => void saveFromPaste()}
                >
                  <Save size={18} aria-hidden="true" />
                  Save song
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
    <div className="mx-auto max-w-[1440px] px-3 py-7 pb-24 min-[375px]:px-4 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <FeedbackToast
        message={feedback?.message ?? null}
        tone={feedback?.tone}
      />
      {discardDialog}
      <div className="mb-7 flex flex-col items-stretch gap-3 border-b border-slate-200 pb-7 sm:flex-row sm:flex-wrap sm:items-center dark:border-slate-800">
        <Button variant="ghost" onClick={leaveEditor} className="-ml-3">
          <ArrowLeft size={17} aria-hidden="true" />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-400">
            Chart editor
          </p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {song.title || "Untitled song"}
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="secondary" onClick={openSmartPaste}>
            <Sparkles size={16} aria-hidden="true" />
            Smart Paste
          </Button>
          <Button
            data-testid="save-song"
            onClick={() => void save()}
            disabled={saving || !song.title.trim()}
            isLoading={saving}
            loadingLabel="Saving…"
          >
            <Save size={17} aria-hidden="true" />
            Save song
          </Button>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="space-y-4 p-4 sm:p-5">
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
              Key
              <KeySelector
                ariaLabel="Song key"
                className="mt-1.5"
                value={song.originalKey}
                onChange={changeSongKey}
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
            <Card key={section.id} className="overflow-hidden shadow-none">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                <Music
                  size={16}
                  className="text-indigo-600"
                  aria-hidden="true"
                />
                <Input
                  aria-label={`Section ${sectionIndex + 1} name`}
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
                    aria-label={`Move ${section.title || `section ${sectionIndex + 1}`} up`}
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
                    <ArrowUp size={15} aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Move ${section.title || `section ${sectionIndex + 1}`} down`}
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
                    <ArrowDown size={15} aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${section.title || `section ${sectionIndex + 1}`}`}
                    onClick={() =>
                      update({
                        sections: song.sections.filter(
                          (item) => item.id !== section.id,
                        ),
                      })
                    }
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="space-y-3 p-4 sm:p-5">
                {section.lines.map((line, lineIndex) => (
                  <div
                    key={line.id}
                    className="min-w-0 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div className="mb-2 flex flex-wrap gap-2">
                      {line.chords.map((chord, chordIndex) => (
                        <div
                          key={chord.id}
                          className="flex items-center rounded-md bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                        >
                          <input
                            aria-label={`Chord ${chordIndex + 1} symbol, ${section.title || `section ${sectionIndex + 1}`} line ${lineIndex + 1}`}
                            aria-invalid={!chord.symbol.trim() || undefined}
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
                            aria-label={`Chord ${chordIndex + 1} position, ${section.title || `section ${sectionIndex + 1}`} line ${lineIndex + 1}`}
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
                                                        position: Math.max(
                                                          0,
                                                          Math.floor(
                                                            Number(
                                                              e.target.value,
                                                            ) || 0,
                                                          ),
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
                            type="button"
                            className="min-h-9 min-w-9 px-1.5 text-lg"
                            aria-label={`Delete chord ${chord.symbol || chordIndex + 1} from ${section.title || `section ${sectionIndex + 1}`} line ${lineIndex + 1}`}
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
                        <Plus size={14} aria-hidden="true" />
                        Chord
                      </Button>
                    </div>
                    <div className="flex min-w-0 gap-2">
                      <Input
                        aria-label={`Lyrics, ${section.title || `section ${sectionIndex + 1}`} line ${lineIndex + 1}`}
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
                        aria-label={`Delete line ${lineIndex + 1} from ${section.title || `section ${sectionIndex + 1}`}`}
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
                        <Trash2 size={15} aria-hidden="true" />
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
                  <Plus size={15} aria-hidden="true" />
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
            <Plus size={16} aria-hidden="true" />
            Add section
          </Button>
          {originalDetectedKey && (
            <OriginalDetectedKey candidate={originalDetectedKey} />
          )}
        </div>
      </div>
    </div>
  );
}
