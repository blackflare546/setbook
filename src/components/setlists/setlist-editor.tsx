"use client";
import Link from "next/link";
import type { CSSProperties } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  GripVertical,
  Play,
  Plus,
  QrCode,
  Save,
  Search,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import type { Setlist, SetlistSongEntry } from "@/core/setlists/types";
import type { Song } from "@/core/songs/types";
import { reorderEntries } from "@/core/setlists/operations";
import { setlistRepository } from "@/data/repositories/setlist-repository";
import { songRepository } from "@/data/repositories/song-repository";
import { createPublishedSnapshot } from "@/lib/sharing/snapshot";
import {
  canExtendPublication,
  formatPublicationDate,
} from "@/lib/sharing/publication-lifecycle";
import { publicPerformancePath } from "@/lib/sharing/shared-link";
import {
  deletePublishedSetlistByToken,
  extendPublishedSetlist,
  publishSharedSetlist,
} from "@/lib/sharing/published-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { KeySelector } from "@/components/ui/key-selector";
import { formatMusicalKey } from "@/core/chords/keys";
import { useProgressiveCollection } from "@/lib/hooks/use-progressive-collection";
import { ProgressiveCollectionFooter } from "@/components/ui/progressive-collection-footer";
import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";
import { AreaTutorial } from "@/components/tutorials/area-tutorial";
import { LoadingState } from "@/components/ui/loading-state";
import { createSetlistQrImageDataUrl } from "@/lib/qr-code/qr-image";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
type LoadState = "loading" | "ready" | "not-found" | "error";
type EntryChanges = Partial<
  Pick<SetlistSongEntry, "arrangementCue" | "performanceKey">
>;

interface SortableSetlistEntryProps {
  entry: SetlistSongEntry;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  song?: Song;
  dropEdge: "before" | "after" | null;
  onMove: (entryId: string, direction: -1 | 1) => void;
  onEntryChange: (entryId: string, changes: EntryChanges) => void;
  onRequestRemove: (entry: SetlistSongEntry) => void;
}

const SortableSetlistEntry = memo(function SortableSetlistEntry({
  entry,
  index,
  isFirst,
  isLast,
  song,
  dropEdge,
  onMove,
  onEntryChange,
  onRequestRemove,
}: SortableSetlistEntryProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: entry.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      data-testid={`setlist-entry-${entry.id}`}
      style={style}
      className={`relative min-w-0 p-3 min-[375px]:p-4 ${
        isDragging ? "z-10 opacity-60 shadow-lg" : ""
      }`}
    >
      {dropEdge && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-2 z-20 h-1 rounded-full bg-indigo-500 shadow-sm ${
            dropEdge === "before" ? "-top-0.5" : "-bottom-0.5"
          }`}
        />
      )}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
        <div className="flex items-center gap-1 text-slate-400 sm:flex-col">
          <Button
            ref={setActivatorNodeRef}
            type="button"
            size="icon"
            variant="ghost"
            className="touch-none cursor-grab select-none active:cursor-grabbing"
            aria-label={`Drag song ${index + 1}: ${song?.title ?? "Missing song"}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={18} aria-hidden="true" />
          </Button>
          <span className="whitespace-nowrap text-xs font-bold">
            Song {index + 1}
          </span>
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
                aria-label={`Move ${song?.title ?? "song"} up`}
                disabled={isFirst}
                onClick={() => onMove(entry.id, -1)}
              >
                <ArrowUp size={15} aria-hidden="true" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Move ${song?.title ?? "song"} down`}
                disabled={isLast}
                onClick={() => onMove(entry.id, 1)}
              >
                <ArrowDown size={15} aria-hidden="true" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remove ${song?.title ?? "song"}`}
                onClick={() => onRequestRemove(entry)}
              >
                <Trash2 size={15} aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Performance key
              <KeySelector
                ariaLabel="Performance key"
                className="mt-1 font-mono normal-case"
                value={entry.performanceKey ?? song?.originalKey ?? ""}
                onChange={(performanceKey) =>
                  onEntryChange(entry.id, {
                    performanceKey: performanceKey || undefined,
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
                onChange={(event) =>
                  onEntryChange(entry.id, {
                    arrangementCue: event.target.value,
                  })
                }
              />
            </label>
          </div>
        </div>
      </div>
    </Card>
  );
});

export function SetlistEditor({ id }: { id: string }) {
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const editRevisionRef = useRef(0);
  const liveSongs = useLiveQuery(() => songRepository.list(), []);
  const songs = useMemo(() => liveSongs ?? [], [liveSongs]);
  const [sharedBy, setSharedBy] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [extendingPublished, setExtendingPublished] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPublished, setDeletingPublished] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [songQuery, setSongQuery] = useState("");
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [entryToRemove, setEntryToRemove] = useState<SetlistSongEntry | null>(
    null,
  );
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  useEffect(() => {
    let active = true;
    void setlistRepository
      .get(id)
      .then((value) => {
        if (!active) return;
        setSetlist(value ?? null);
        setResolvedId(id);
        setSharedBy(value?.shareBinding?.sharedBy ?? "");
        setSaveState("idle");
        editRevisionRef.current = 0;
        setLoadState(value ? "ready" : "not-found");
      })
      .catch(() => {
        if (!active) return;
        setResolvedId(id);
        setLoadState("error");
      });
    return () => {
      active = false;
    };
  }, [id, loadAttempt]);
  useEffect(() => {
    if (!feedback || feedback.tone !== "success") return;
    const timeout = window.setTimeout(() => {
      setFeedback(null);
      setSaveState((current) => (current === "saved" ? "idle" : current));
    }, 2500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);
  const indexedSongs = useMemo(
    () =>
      songs.map((song) => ({
        song,
        searchText: `${song.title} ${song.artist}`.toLocaleLowerCase(),
      })),
    [songs],
  );
  const normalizedSongQuery = songQuery.trim().toLocaleLowerCase();
  const matchingSongs = useMemo(
    () =>
      indexedSongs
        .filter(({ searchText }) => searchText.includes(normalizedSongQuery))
        .map(({ song }) => song),
    [indexedSongs, normalizedSongQuery],
  );
  const progressiveSongs = useProgressiveCollection(
    matchingSongs,
    normalizedSongQuery,
  );
  const songMap = useMemo(
    () => new Map(songs.map((song) => [song.id, song])),
    [songs],
  );
  const draggedIndex = useMemo(
    () =>
      setlist?.entries.findIndex((entry) => entry.id === draggedEntryId) ?? -1,
    [draggedEntryId, setlist?.entries],
  );
  const sortableEntryIds = useMemo(
    () => setlist?.entries.map((entry) => entry.id) ?? [],
    [setlist?.entries],
  );
  const update = useCallback(
    (next: Partial<Setlist> | ((current: Setlist) => Partial<Setlist>)) => {
      editRevisionRef.current += 1;
      setFeedback(null);
      setSaveState("dirty");
      setSetlist((current) =>
        current
          ? {
              ...current,
              ...(typeof next === "function" ? next(current) : next),
            }
          : current,
      );
    },
    [],
  );
  const moveEntry = useCallback(
    (entryId: string, direction: -1 | 1) => {
      update((current) => {
        const from = current.entries.findIndex((entry) => entry.id === entryId);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= current.entries.length) return {};
        return { entries: reorderEntries(current.entries, from, to) };
      });
    },
    [update],
  );
  const changeEntry = useCallback(
    (entryId: string, changes: EntryChanges) => {
      update((current) => ({
        entries: current.entries.map((entry) =>
          entry.id === entryId ? { ...entry, ...changes } : entry,
        ),
      }));
    },
    [update],
  );
  const applyPersistenceResult = useCallback(
    (saved: Setlist, revision: number, currentState: SaveState) => {
      const hasNewerEdits = editRevisionRef.current !== revision;
      setSetlist((current) => {
        if (!current || !hasNewerEdits) return saved;
        const merged: Setlist = { ...current, updatedAt: saved.updatedAt };
        if (saved.publishToken) merged.publishToken = saved.publishToken;
        else delete merged.publishToken;
        if (saved.shareBinding) merged.shareBinding = saved.shareBinding;
        else delete merged.shareBinding;
        return merged;
      });
      setSaveState(hasNewerEdits ? "dirty" : currentState);
      return hasNewerEdits;
    },
    [],
  );
  if (loadState === "loading" || resolvedId !== id)
    return <LoadingState label="Loading setlist…" className="min-h-[60dvh]" />;
  if (loadState === "error")
    return (
      <div className="mx-auto grid min-h-[60dvh] max-w-xl place-items-center px-4 py-12 text-center">
        <Card className="w-full p-6 sm:p-8">
          <h1 className="text-xl font-bold">Setlist could not be loaded</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            No local data was changed. Try opening this setlist again.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              onClick={() => {
                setLoadState("loading");
                setResolvedId(null);
                setSetlist(null);
                setLoadAttempt((attempt) => attempt + 1);
              }}
            >
              Try again
            </Button>
            <Button asChild variant="secondary">
              <Link href="/setlists">Back to setlists</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  if (loadState === "not-found" || !setlist)
    return (
      <div className="mx-auto grid min-h-[60dvh] max-w-xl place-items-center px-4 py-12 text-center">
        <Card className="w-full p-6 sm:p-8">
          <h1 className="text-xl font-bold">Setlist not found</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            It may have been deleted from this browser.
          </p>
          <Button asChild className="mt-5">
            <Link href="/setlists">Back to setlists</Link>
          </Button>
        </Card>
      </div>
    );
  const currentSetlist = setlist;
  const sharingBusy = publishing || extendingPublished || deletingPublished;
  const savedForActions = saveState === "idle" || saveState === "saved";
  async function save() {
    if (saveState === "saving" || sharingBusy) return;
    const revision = editRevisionRef.current;
    setFeedback(null);
    setSaveState("saving");
    try {
      const saved = await setlistRepository.save(currentSetlist);
      const hasNewerEdits = applyPersistenceResult(saved, revision, "saved");
      setFeedback({
        message: hasNewerEdits
          ? "Saved. Newer changes still need saving."
          : "Setlist saved",
        tone: "success",
      });
    } catch {
      setSaveState(editRevisionRef.current === revision ? "error" : "dirty");
      setFeedback({
        message: "Setlist could not be saved. Please try again.",
        tone: "error",
      });
    }
  }
  async function publish() {
    if (!savedForActions || sharingBusy) return;
    const revision = editRevisionRef.current;
    setPublishing(true);
    setFeedback(null);
    try {
      const snapshot = createPublishedSnapshot(currentSetlist, songs, {
        includeNotes: true,
        includeLinks: false,
        sharedBy,
      });
      const binding = currentSetlist.shareBinding;
      const result = await publishSharedSetlist(snapshot, binding);
      const nextBinding = {
        publicToken: result.token,
        ownerCapability: result.ownerCapability,
        revision: result.revision,
        etag: result.etag,
        expiresAt: result.expiresAt,
        sharedBy: sharedBy.trim() || undefined,
      };
      const saved = await setlistRepository.save({
        ...currentSetlist,
        publishToken: result.token,
        shareBinding: nextBinding,
      });
      const hasNewerEdits = applyPersistenceResult(saved, revision, "idle");
      setFeedback({
        message: hasNewerEdits
          ? "Setlist shared. Newer changes still need saving."
          : result.createdReplacement
            ? "Setlist shared with a new link"
            : binding
              ? "Shared setlist updated"
              : "Setlist shared",
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
  async function extendPublished() {
    const binding = currentSetlist.shareBinding;
    if (!binding || sharingBusy) return;
    const revision = editRevisionRef.current;
    setExtendingPublished(true);
    setFeedback(null);
    try {
      const result = await extendPublishedSetlist(
        binding.publicToken,
        binding.ownerCapability,
      );
      const saved = await setlistRepository.save({
        ...currentSetlist,
        shareBinding: {
          ...binding,
          revision: result.revision,
          etag: result.etag,
          expiresAt: result.expiresAt,
        },
      });
      applyPersistenceResult(saved, revision, "idle");
      setFeedback({ message: "Sharing expiration extended", tone: "success" });
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Unable to extend published setlist.",
        tone: "error",
      });
    } finally {
      setExtendingPublished(false);
    }
  }
  async function deletePublished() {
    const binding = currentSetlist.shareBinding;
    if (!binding || sharingBusy) return;
    const revision = editRevisionRef.current;
    setDeletingPublished(true);
    setFeedback(null);
    try {
      await deletePublishedSetlistByToken(
        binding.publicToken,
        binding.ownerCapability,
      );

      const unpublishedSetlist: Setlist = { ...currentSetlist };
      delete unpublishedSetlist.publishToken;
      delete unpublishedSetlist.shareBinding;
      const saved = await setlistRepository.save(unpublishedSetlist);
      applyPersistenceResult(saved, revision, "idle");
      setDeleteDialogOpen(false);
      setFeedback({
        message: "Sharing stopped",
        tone: "success",
      });
    } catch (error) {
      setDeleteDialogOpen(false);
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete published setlist.",
        tone: "error",
      });
    } finally {
      setDeletingPublished(false);
    }
  }

  async function copyText(value: string, message: string) {
    await navigator.clipboard.writeText(value);
    setFeedback({ message, tone: "success" });
  }

  function absoluteUrl(pathname: string): string {
    return new URL(pathname, window.location.origin).toString();
  }

  async function showQrCode() {
    const token = currentSetlist.shareBinding?.publicToken;
    if (!token || generatingQr) return;
    setGeneratingQr(true);
    try {
      setQrDataUrl(
        await createSetlistQrImageDataUrl({
          value: absoluteUrl(publicPerformancePath(token)),
          title: currentSetlist.name,
          venue: currentSetlist.venue,
          date: currentSetlist.date,
        }),
      );
    } catch {
      setFeedback({
        message: "QR code could not be created. Please try again.",
        tone: "error",
      });
    } finally {
      setGeneratingQr(false);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const entryId = String(event.active.id);
    setDraggedEntryId(entryId);
    setDropTargetId(entryId);
  }
  function handleDragOver(event: DragOverEvent) {
    setDropTargetId(event.over ? String(event.over.id) : null);
  }
  function resetDragState() {
    setDraggedEntryId(null);
    setDropTargetId(null);
  }
  function handleDragEnd(event: DragEndEvent) {
    resetDragState();
    if (!event.over || event.active.id === event.over.id) return;
    const from = currentSetlist.entries.findIndex(
      (entry) => entry.id === event.active.id,
    );
    const to = currentSetlist.entries.findIndex(
      (entry) => entry.id === event.over?.id,
    );
    if (from < 0 || to < 0) return;
    update({ entries: reorderEntries(currentSetlist.entries, from, to) });
  }
  return (
    <div
      data-testid="setlist-editor"
      className="mx-auto max-w-6xl px-3 py-5 pb-24 min-[375px]:px-4 sm:px-6 sm:py-7 md:pb-40 lg:pb-32"
    >
      <AreaTutorial id="setlist-editor" />
      <FeedbackToast
        message={feedback?.message ?? null}
        tone={feedback?.tone}
      />
      <div
        data-tour="setlist-editor-header"
        className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center"
      >
        <Button
          asChild
          variant="ghost"
          className="-ml-3 self-start sm:self-auto"
        >
          <Link href="/setlists">
            <ArrowLeft size={17} aria-hidden="true" />
            Setlists
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-400">
            Setlist editor
          </p>
          <h1 className="mt-1 break-words text-2xl font-semibold tracking-[-0.03em]">
            {setlist.name}
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            variant="secondary"
            onClick={() => void save()}
            disabled={sharingBusy}
            isLoading={saveState === "saving"}
            loadingLabel="Saving…"
          >
            <Save size={16} aria-hidden="true" />
            Save
          </Button>
          {savedForActions && setlist.entries.length ? (
            <Button asChild>
              <Link href={`/performance/${setlist.id}`}>
                <Play size={16} aria-hidden="true" />
                Perform
              </Link>
            </Button>
          ) : (
            <Button disabled title="Save the setlist before performing">
              <Play size={16} aria-hidden="true" />
              Perform
            </Button>
          )}
        </div>
        {!savedForActions && (
          <p className="w-full text-xs font-medium text-amber-700 dark:text-amber-300 sm:text-right">
            Save changes before performing or publishing.
          </p>
        )}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_310px]">
        <div className="space-y-4">
          <Card data-tour="setlist-editor-details" className="p-4">
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
          <div
            data-tour="setlist-editor-order"
            className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          >
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
              {pickerOpen ? (
                <X size={17} aria-hidden="true" />
              ) : (
                <Plus size={17} aria-hidden="true" />
              )}
              {pickerOpen ? "Close" : "Add song"}
            </Button>
          </div>
          {pickerOpen && (
            <Card className="p-3 sm:p-4">
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute left-3 top-3 text-slate-400"
                  size={18}
                  aria-hidden="true"
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
                  <>
                    {progressiveSongs.visibleItems.map((song) => (
                      <button
                        key={song.id}
                        className="flex min-h-14 w-full flex-col justify-center rounded-lg px-3 py-2 text-left hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800"
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
                    ))}
                    <ProgressiveCollectionFooter
                      visibleCount={progressiveSongs.visibleCount}
                      totalCount={progressiveSongs.totalCount}
                      hasMore={progressiveSongs.hasMore}
                      sentinelRef={progressiveSongs.sentinelRef}
                      onShowMore={progressiveSongs.showMore}
                    />
                  </>
                ) : (
                  <p className="px-3 py-6 text-center text-sm text-slate-500">
                    No matching songs
                  </p>
                )}
              </div>
            </Card>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragCancel={resetDragState}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableEntryIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {setlist.entries.map((entry, index) => {
                  const dropEdge =
                    dropTargetId === entry.id && draggedIndex !== index
                      ? draggedIndex < index
                        ? "after"
                        : "before"
                      : null;
                  return (
                    <SortableSetlistEntry
                      key={entry.id}
                      entry={entry}
                      index={index}
                      isFirst={index === 0}
                      isLast={index === setlist.entries.length - 1}
                      song={songMap.get(entry.songId)}
                      dropEdge={dropEdge}
                      onMove={moveEntry}
                      onEntryChange={changeEntry}
                      onRequestRemove={setEntryToRemove}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
          {!setlist.entries.length && (
            <Card className="grid min-h-48 place-items-center p-6 text-center">
              <div>
                <Plus
                  className="mx-auto mb-2 text-indigo-500"
                  aria-hidden="true"
                />
                <h3 className="font-bold">Add the first song</h3>
                <p className="text-sm text-slate-500">
                  Choose a song from your library above.
                </p>
              </div>
            </Card>
          )}
        </div>
        <aside className="space-y-4">
          <Card data-tour="setlist-editor-notes" className="p-4">
            <label htmlFor="setlist-notes" className="mb-3 block font-bold">
              Setlist &amp; band notes
            </label>
            <Textarea
              id="setlist-notes"
              className="min-h-36"
              placeholder="Load-in, tuning, transitions…"
              value={setlist.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </Card>
          <Card data-tour="setlist-editor-share" className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Share2
                className="text-indigo-600"
                size={18}
                aria-hidden="true"
              />
              <h2 className="font-bold">Share Setlist</h2>
            </div>
            <p className="mb-4 text-sm leading-6 text-slate-500">
              Share a simple read-only link. Only this browser can publish
              updates or stop sharing. Band notes are included; song links stay
              private.
            </p>
            <label className="mb-3 block text-sm font-semibold">
              Shared by (optional)
              <Input
                className="mt-1"
                value={sharedBy}
                maxLength={80}
                placeholder="Band or owner name"
                onChange={(event) => setSharedBy(event.target.value)}
              />
            </label>
            <Button
              className="w-full"
              onClick={() => void publish()}
              disabled={
                sharingBusy || !savedForActions || !setlist.entries.length
              }
              isLoading={publishing}
              loadingLabel="Publishing…"
            >
              {setlist.shareBinding ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <Share2 size={16} aria-hidden="true" />
              )}{" "}
              {setlist.shareBinding
                ? "Update published setlist"
                : setlist.publishToken
                  ? "Upgrade sharing"
                  : "Publish setlist"}
            </Button>
            {setlist.publishToken && !setlist.shareBinding && (
              <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                This legacy link remains view-only. Upgrade to create secure
                owner controls with a new public URL.
              </p>
            )}
            {setlist.shareBinding && (
              <div className="mt-2 space-y-2">
                <div className="rounded-lg bg-indigo-50 p-3 text-xs leading-5 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <CalendarClock size={14} aria-hidden="true" />
                    {setlist.shareBinding.expiresAt
                      ? `Link expires ${formatPublicationDate(setlist.shareBinding.expiresAt)}`
                      : "This existing link does not expire yet"}
                  </p>
                  <p className="mt-1">
                    Publishing updates or extending confirms that this link is
                    still needed.
                  </p>
                </div>
                {canExtendPublication(setlist.shareBinding.expiresAt) && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={sharingBusy}
                    isLoading={extendingPublished}
                    loadingLabel="Extending…"
                    onClick={() => void extendPublished()}
                  >
                    <CalendarClock size={16} aria-hidden="true" />
                    Extend expiration
                  </Button>
                )}
                <Button asChild variant="secondary" className="w-full">
                  <Link
                    target="_blank"
                    href={publicPerformancePath(
                      setlist.shareBinding.publicToken,
                    )}
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                    Open public link
                  </Link>
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void copyText(
                        absoluteUrl(
                          publicPerformancePath(
                            setlist.shareBinding!.publicToken,
                          ),
                        ),
                        "Public link copied",
                      )
                    }
                  >
                    <Copy size={16} aria-hidden="true" /> Copy link
                  </Button>
                  <Button
                    variant="secondary"
                    isLoading={generatingQr}
                    loadingLabel="Creating QR…"
                    onClick={() => void showQrCode()}
                  >
                    <QrCode size={16} aria-hidden="true" /> QR code
                  </Button>
                </div>
                <Dialog.Root
                  open={deleteDialogOpen}
                  onOpenChange={(open) => {
                    if (!deletingPublished) setDeleteDialogOpen(open);
                  }}
                >
                  <Dialog.Trigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full text-rose-600"
                      disabled={sharingBusy}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      Stop Sharing
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900">
                      <Dialog.Title className="text-lg font-bold">
                        Stop sharing this setlist?
                      </Dialog.Title>
                      <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        This removes the public link. Your local setlist and
                        everyone’s imported songs remain available.
                      </Dialog.Description>
                      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Dialog.Close asChild>
                          <Button
                            variant="secondary"
                            disabled={deletingPublished}
                          >
                            Cancel
                          </Button>
                        </Dialog.Close>
                        <Button
                          variant="danger"
                          isLoading={deletingPublished}
                          loadingLabel="Stopping…"
                          onClick={() => void deletePublished()}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                          Stop Sharing
                        </Button>
                      </div>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>
            )}
            {qrDataUrl && (
              <Dialog.Root
                open
                onOpenChange={(open) => !open && setQrDataUrl(null)}
              >
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50" />
                  <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(calc(100vw-2rem),34rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-2xl outline-none sm:p-6 dark:border-slate-700 dark:bg-slate-900">
                    <Dialog.Title className="text-xl font-semibold tracking-[-0.02em]">
                      Share {currentSetlist.name}
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Scan to open the read-only public setlist.
                    </Dialog.Description>
                    <div className="mx-auto mt-5 w-full max-w-md overflow-hidden bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrDataUrl}
                        alt={`Public setlist QR code for ${currentSetlist.name}`}
                        className="block h-auto w-full"
                      />
                    </div>
                    <div className="mt-5 flex flex-col-reverse justify-center gap-2 sm:flex-row">
                      <Button asChild variant="secondary">
                        <a
                          href={qrDataUrl}
                          download={`${currentSetlist.name}-setlist-qr.png`}
                        >
                          Download QR image
                        </a>
                      </Button>
                      <Button onClick={() => setQrDataUrl(null)}>Done</Button>
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            )}
          </Card>
        </aside>
      </div>
      <ScrollToTopButton />
      <Dialog.Root
        open={Boolean(entryToRemove)}
        onOpenChange={(open) => !open && setEntryToRemove(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900">
            <Dialog.Title className="text-lg font-bold">
              Remove{" "}
              {entryToRemove
                ? (songMap.get(entryToRemove.songId)?.title ?? "this song")
                : "this song"}
              ?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              This removes the song from this setlist only. The original remains
              in My Library, and this change is not permanent until you save the
              setlist.
            </Dialog.Description>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  if (!entryToRemove) return;
                  update({
                    entries: currentSetlist.entries.filter(
                      (entry) => entry.id !== entryToRemove.id,
                    ),
                  });
                  setEntryToRemove(null);
                }}
              >
                <Trash2 size={16} aria-hidden="true" /> Remove song
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
