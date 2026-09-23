"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  List,
  Maximize2,
  Music2,
} from "lucide-react";
import type { PublishedSnapshot } from "@/lib/validation/schemas";
import {
  semitoneDistance,
  transposeChordSymbol,
} from "@/core/transpose/transpose";
import { Button } from "@/components/ui/button";

function chordRow(
  chords: { symbol: string; position: number }[],
  semitones: number,
) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  [...chords]
    .sort((a, b) => a.position - b.position)
    .forEach((chord, index) => {
      const gap = Math.max(1, chord.position - cursor);
      parts.push(<span key={`g${index}`}>{" ".repeat(gap)}</span>);
      const symbol = transposeChordSymbol(chord.symbol, semitones);
      parts.push(
        <span
          key={`${chord.position}-${chord.symbol}`}
          className="font-bold text-amber-300"
        >
          {symbol}
        </span>,
      );
      cursor = chord.position + symbol.length;
    });
  return parts;
}

export function PerformanceView({
  snapshot,
  backHref,
  publicMode = false,
}: {
  snapshot: PublishedSnapshot;
  backHref?: string;
  publicMode?: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const [showOrder, setShowOrder] = useState(false);
  const song = snapshot.songs[current];
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (event.key === "ArrowRight")
        setCurrent((value) => Math.min(snapshot.songs.length - 1, value + 1));
      if (event.key === "ArrowLeft")
        setCurrent((value) => Math.max(0, value - 1));
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [snapshot.songs.length]);
  if (!song)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <div className="text-center">
          <Music2 className="mx-auto mb-3 text-indigo-400" />
          <h1 className="text-xl font-bold">This setlist is empty</h1>
          {backHref && (
            <Button asChild variant="secondary" className="mt-4">
              <Link href={backHref}>Go back</Link>
            </Button>
          )}
        </div>
      </main>
    );
  const semitones = semitoneDistance(song.originalKey, song.performanceKey);
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          {backHref && (
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Link href={backHref}>
                <ArrowLeft size={19} />
              </Link>
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold uppercase tracking-wider text-indigo-400">
              {publicMode ? "Shared setlist" : snapshot.name}
            </p>
            <p className="truncate text-sm text-slate-400">
              {current + 1} of {snapshot.songs.length}
              {snapshot.venue ? ` · ${snapshot.venue}` : ""}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => setShowOrder(!showOrder)}
          >
            <List size={20} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => void document.documentElement.requestFullscreen?.()}
          >
            <Maximize2 size={18} />
          </Button>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[1fr_280px]">
        <article className="min-w-0 px-5 py-7 sm:px-10 lg:px-14">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-5">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {song.title}
              </h1>
              <p className="mt-1 text-slate-400">
                {song.artist || "Unknown artist"}
              </p>
            </div>
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                Performance key
              </p>
              <p className="text-2xl font-black text-amber-200">
                {song.performanceKey || "—"}
              </p>
            </div>
          </div>
          {song.arrangementCue && (
            <div className="mb-7 rounded-lg border-l-4 border-indigo-400 bg-indigo-400/10 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Arrangement cue
              </p>
              <p className="mt-1 text-sm text-indigo-50">
                {song.arrangementCue}
              </p>
            </div>
          )}
          <div className="space-y-8">
            {song.sections.map((section) => (
              <section key={section.id}>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-indigo-400">
                  {section.title}
                </h2>
                <div className="space-y-3 font-mono text-[17px] leading-7 sm:text-xl">
                  {section.lines.map((line) => (
                    <div key={line.id} className="overflow-x-auto">
                      <div className="min-h-6 whitespace-pre text-sm leading-5 sm:text-base">
                        {chordRow(line.chords, semitones)}
                      </div>
                      <div className="whitespace-pre-wrap text-slate-100">
                        {line.lyrics || " "}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
        <aside
          className={`${showOrder ? "block" : "hidden"} border-l border-slate-800 bg-slate-900/60 p-4 lg:block`}
        >
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            Running order
          </h2>
          <div className="space-y-1">
            {snapshot.songs.map((item, index) => (
              <button
                key={item.entryId}
                onClick={() => {
                  setCurrent(index);
                  setShowOrder(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left ${index === current ? "bg-indigo-500/20 text-white" : "text-slate-400 hover:bg-slate-800"}`}
              >
                <span className="w-5 text-xs font-bold">{index + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {item.title}
                  </span>
                  <span className="block truncate text-xs">
                    Key {item.performanceKey || "—"}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {snapshot.notes && (
            <div className="mt-6 border-t border-slate-800 pt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                Band notes
              </h3>
              <p className="whitespace-pre-wrap text-xs leading-5 text-slate-400">
                {snapshot.notes}
              </p>
            </div>
          )}
        </aside>
      </div>
      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button
            variant="ghost"
            className="flex-1 text-slate-300 hover:bg-slate-800 hover:text-white"
            disabled={current === 0}
            onClick={() => setCurrent(current - 1)}
          >
            <ChevronLeft />{" "}
            {current ? snapshot.songs[current - 1]?.title : "Previous"}
          </Button>
          <span className="text-xs font-bold text-slate-500">
            {current + 1}/{snapshot.songs.length}
          </span>
          <Button
            variant="ghost"
            className="flex-1 text-slate-300 hover:bg-slate-800 hover:text-white"
            disabled={current === snapshot.songs.length - 1}
            onClick={() => setCurrent(current + 1)}
          >
            {snapshot.songs[current + 1]?.title ?? "Next"}
            <ChevronRight />
          </Button>
        </div>
      </footer>
    </main>
  );
}
