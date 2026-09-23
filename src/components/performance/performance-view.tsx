"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit3,
  List,
  Maximize2,
  Minus,
  Music2,
  Plus,
  RotateCcw,
} from "lucide-react";
import type { PublishedSnapshot } from "@/lib/validation/schemas";
import {
  semitoneDistance,
  transposeChordSymbol,
} from "@/core/transpose/transpose";
import { transposeNote } from "@/core/chords/chord";
import { Button } from "@/components/ui/button";

function ChordLine({
  chords,
  semitones,
}: {
  chords: { symbol: string; position: number }[];
  semitones: number;
}) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  [...chords]
    .sort((a, b) => a.position - b.position)
    .forEach((chord, index) => {
      const gap = Math.max(index ? 1 : 0, chord.position - cursor);
      parts.push(<span key={`gap-${index}`}>{" ".repeat(gap)}</span>);
      const symbol = transposeChordSymbol(chord.symbol, semitones);
      parts.push(
        <span
          key={`${chord.position}-${chord.symbol}`}
          className="font-extrabold text-indigo-700 dark:text-amber-300"
        >
          {symbol}
        </span>,
      );
      cursor = chord.position + symbol.length;
    });
  return <>{parts}</>;
}

export function PerformanceView({
  snapshot,
  backHref,
  editHref,
  publicMode = false,
  singleSong = false,
}: {
  snapshot: PublishedSnapshot;
  backHref?: string;
  editHref?: string;
  publicMode?: boolean;
  singleSong?: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const [showOrder, setShowOrder] = useState(false);
  const [transposeOffset, setTransposeOffset] = useState(0);
  const song = snapshot.songs[current];
  const selectSong = useCallback(
    (index: number) => {
      setCurrent(Math.max(0, Math.min(snapshot.songs.length - 1, index)));
      setTransposeOffset(0);
    },
    [snapshot.songs.length],
  );

  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (event.key === "ArrowRight") selectSong(current + 1);
      if (event.key === "ArrowLeft") selectSong(current - 1);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [current, selectSong]);

  if (!song)
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-50 px-5 text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="text-center">
          <Music2 className="mx-auto mb-3 text-indigo-500" />
          <h1 className="text-xl font-bold">This setlist is empty</h1>
          {backHref && (
            <Button asChild variant="secondary" className="mt-4">
              <Link href={backHref}>Go back</Link>
            </Button>
          )}
        </div>
      </main>
    );

  const baseKey = song.performanceKey || song.originalKey;
  const baseSemitones = semitoneDistance(song.originalKey, baseKey);
  const semitones = baseSemitones + transposeOffset;
  const currentKey = baseKey
    ? transposeNote(baseKey, transposeOffset, baseKey.includes("b"))
    : "—";

  return (
    <main className="min-h-dvh max-w-full bg-white pb-24 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-2 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-4">
        <div className="mx-auto flex min-h-11 max-w-7xl items-center gap-1.5 sm:gap-2">
          {backHref && (
            <Button asChild size="icon" variant="ghost" aria-label="Go back">
              <Link href={backHref}>
                <ArrowLeft size={19} />
              </Link>
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {singleSong
                ? "Song view"
                : publicMode
                  ? "Shared setlist"
                  : snapshot.name}
            </p>
            {!singleSong && (
              <p className="truncate text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                {current + 1} of {snapshot.songs.length}
                {snapshot.venue ? ` · ${snapshot.venue}` : ""}
              </p>
            )}
          </div>
          {editHref && (
            <Button asChild variant="secondary" size="sm">
              <Link href={editHref}>
                <Edit3 size={16} />
                <span className="hidden min-[375px]:inline">Edit song</span>
              </Link>
            </Button>
          )}
          {!singleSong && (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Show running order"
              onClick={() => setShowOrder(!showOrder)}
            >
              <List size={20} />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            aria-label="Enter fullscreen"
            onClick={() => void document.documentElement.requestFullscreen?.()}
          >
            <Maximize2 size={18} />
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="min-w-0 px-3 py-5 min-[375px]:px-4 sm:px-8 sm:py-7 lg:px-12">
          <div className="mb-5 border-b border-slate-200 pb-4 dark:border-slate-800 sm:mb-7 sm:flex sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold tracking-tight min-[375px]:text-3xl sm:text-4xl">
                {song.title}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
                {song.artist || "Unknown artist"}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900 sm:mt-0 sm:justify-start">
              <div className="min-w-14 px-1 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Key
                </p>
                <p
                  aria-label="Current key"
                  className="text-xl font-black text-indigo-700 dark:text-amber-200"
                >
                  {currentKey}
                </p>
              </div>
              <div
                className="flex items-center gap-1"
                aria-label="Transpose controls"
              >
                <Button
                  size="icon"
                  variant="secondary"
                  aria-label="Transpose down"
                  onClick={() => setTransposeOffset((value) => value - 1)}
                >
                  <Minus size={18} />
                </Button>
                <span
                  className="w-8 text-center text-xs font-bold"
                  aria-label="Transpose offset"
                >
                  {transposeOffset > 0
                    ? `+${transposeOffset}`
                    : transposeOffset}
                </span>
                <Button
                  size="icon"
                  variant="secondary"
                  aria-label="Transpose up"
                  onClick={() => setTransposeOffset((value) => value + 1)}
                >
                  <Plus size={18} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Reset transposition"
                  disabled={transposeOffset === 0}
                  onClick={() => setTransposeOffset(0)}
                >
                  <RotateCcw size={16} />
                </Button>
              </div>
            </div>
          </div>

          {song.arrangementCue && (
            <div className="mb-6 rounded-lg border-l-4 border-indigo-500 bg-indigo-50 px-4 py-3 dark:bg-indigo-500/10">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Arrangement cue
              </p>
              <p className="mt-1 text-sm text-indigo-950 dark:text-indigo-50">
                {song.arrangementCue}
              </p>
            </div>
          )}

          <div className="space-y-7 sm:space-y-9">
            {song.sections.map((section) => (
              <section key={section.id} className="min-w-0">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-indigo-700 dark:text-indigo-400">
                  {section.title}
                </h2>
                <div className="space-y-3 font-mono text-base leading-7 sm:text-xl sm:leading-8">
                  {section.lines.map((line) => (
                    <div
                      key={line.id}
                      className="max-w-full overflow-x-auto overscroll-x-contain pb-1"
                    >
                      <div className="w-max min-w-full">
                        <div className="min-h-5 whitespace-pre text-sm leading-5 sm:text-base">
                          <ChordLine
                            chords={line.chords}
                            semitones={semitones}
                          />
                        </div>
                        <div className="whitespace-pre text-slate-950 dark:text-slate-100">
                          {line.lyrics || " "}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        {!singleSong && (
          <aside
            className={`${showOrder ? "block" : "hidden"} min-w-0 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 lg:block lg:border-l lg:border-t-0`}
          >
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Running order
            </h2>
            <div className="space-y-1">
              {snapshot.songs.map((item, index) => (
                <button
                  key={item.entryId}
                  onClick={() => {
                    selectSong(index);
                    setShowOrder(false);
                  }}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-lg p-3 text-left ${index === current ? "bg-indigo-100 text-indigo-950 dark:bg-indigo-500/20 dark:text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}
                >
                  <span className="w-5 shrink-0 text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold">
                      {item.title}
                    </span>
                    <span className="block text-xs">
                      Key {item.performanceKey || "—"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {snapshot.notes && (
              <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Band notes
                </h3>
                <p className="whitespace-pre-wrap text-xs leading-5 text-slate-600 dark:text-slate-400">
                  {snapshot.notes}
                </p>
              </div>
            )}
          </aside>
        )}
      </div>

      {!singleSong && (
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-2 pb-[max(.5rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:p-3">
          <div className="mx-auto flex max-w-3xl items-center gap-1.5 sm:gap-3">
            <Button
              variant="ghost"
              className="min-w-0 flex-1"
              disabled={current === 0}
              onClick={() => selectSong(current - 1)}
            >
              <ChevronLeft />
              <span className="hidden truncate sm:inline">
                {current ? snapshot.songs[current - 1]?.title : "Previous"}
              </span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <span className="shrink-0 text-xs font-bold text-slate-500">
              {current + 1}/{snapshot.songs.length}
            </span>
            <Button
              variant="ghost"
              className="min-w-0 flex-1"
              disabled={current === snapshot.songs.length - 1}
              onClick={() => selectSong(current + 1)}
            >
              <span className="hidden truncate sm:inline">
                {snapshot.songs[current + 1]?.title ?? "Next"}
              </span>
              <span className="sm:hidden">Next</span>
              <ChevronRight />
            </Button>
          </div>
        </footer>
      )}
    </main>
  );
}
