"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit3,
  List,
  Maximize2,
  Minimize2,
  Minus,
  Music2,
  Plus,
  RotateCcw,
  StickyNote,
  X,
} from "lucide-react";
import type { PublishedSnapshot } from "@/lib/validation/schemas";
import type { SongLine } from "@/core/songs/types";
import {
  adjustChartFontScale,
  adjustChartLineHeight,
  CHART_LAYOUT_OPTIONS,
  DEFAULT_CHART_FONT_SETTINGS,
  type ChartFontCategory,
  type ChartLayout,
  type ChartFontSettings,
} from "@/core/songs/chart-font-settings";
import { formatMusicalKey, transposeMusicalKey } from "@/core/chords/keys";
import {
  semitoneDistance,
  transposeChordSymbol,
} from "@/core/transpose/transpose";
import { Button } from "@/components/ui/button";
import { settingsRepository } from "@/data/repositories/settings-repository";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";
import { useResponsiveAutoHideControls } from "./use-responsive-auto-hide-controls";

function withoutTrailingBlankLines(lines: SongLine[]): SongLine[] {
  let end = lines.length;
  while (
    end > 0 &&
    !lines[end - 1].lyrics &&
    lines[end - 1].chords.length === 0
  ) {
    end -= 1;
  }
  return lines.slice(0, end);
}

function ChartLine({
  line,
  semitones,
  fontSettings,
}: {
  line: SongLine;
  semitones: number;
  fontSettings: ChartFontSettings;
}) {
  const chords = [...line.chords]
    .sort((a, b) => a.position - b.position)
    .map((chord) => ({
      ...chord,
      displaySymbol: transposeChordSymbol(chord.symbol, semitones),
    }));
  const chordToLyricScale = fontSettings.chordScale / fontSettings.lyricScale;
  const columns = Math.max(
    1,
    line.lyrics.length,
    ...chords.map(
      (chord) =>
        chord.position +
        Math.ceil(chord.displaySymbol.length * chordToLyricScale),
    ),
  );

  return (
    <div
      data-performance-scroll-container
      className="max-w-full overflow-x-auto overscroll-x-contain pb-1"
    >
      <div
        className="min-w-full"
        data-testid="chart-line"
        style={{
          width: `${columns}ch`,
          fontSize: `${fontSettings.lyricScale / 100}em`,
        }}
      >
        <div
          className="relative leading-none"
          style={{
            height: `${Math.max(fontSettings.lineHeight, 1.2 * chordToLyricScale)}em`,
          }}
        >
          {chords.map((chord) => (
            <span
              key={chord.id}
              data-chord-position={chord.position}
              className="absolute"
              style={{ left: `${chord.position}ch` }}
            >
              <span
                className="font-extrabold text-indigo-700 dark:text-amber-300"
                style={{ fontSize: `${chordToLyricScale}em` }}
              >
                {chord.displaySymbol}
              </span>
            </span>
          ))}
        </div>
        <div
          className="whitespace-pre text-slate-950 dark:text-slate-100"
          style={{ lineHeight: fontSettings.lineHeight }}
        >
          {line.lyrics || " "}
        </div>
      </div>
    </div>
  );
}

const FONT_ROWS: Array<{ category: ChartFontCategory; label: string }> = [
  { category: "section", label: "Sections" },
  { category: "chord", label: "Chords" },
  { category: "lyric", label: "Lyrics" },
];

interface ChartAppearanceProps {
  settings: ChartFontSettings;
  layout: ChartLayout;
  onChange: (category: ChartFontCategory, change: number) => void;
  onLineHeightChange: (change: number) => void;
  onLayoutChange: (layout: ChartLayout) => void;
}

function ChartAppearancePanel({
  settings,
  layout,
  onChange,
  onLineHeightChange,
  onLayoutChange,
}: ChartAppearanceProps) {
  return (
    <div className="space-y-3">
      {FONT_ROWS.map(({ category, label }) => {
        const value = settings[`${category}Scale`];
        return (
          <div
            key={category}
            className="grid grid-cols-[1fr_44px_58px_44px] items-center gap-2"
          >
            <span className="text-sm font-semibold">{label}</span>
            <Button
              size="icon"
              variant="secondary"
              className="h-11 w-11"
              aria-label={`Decrease ${category} font size`}
              onClick={() => onChange(category, -10)}
            >
              <Minus size={18} />
            </Button>
            <span
              className="text-center text-sm font-bold tabular-nums"
              aria-label={`${label} font scale`}
            >
              {value}%
            </span>
            <Button
              size="icon"
              variant="secondary"
              className="h-11 w-11"
              aria-label={`Increase ${category} font size`}
              onClick={() => onChange(category, 10)}
            >
              <Plus size={18} />
            </Button>
          </div>
        );
      })}
      <div className="grid grid-cols-[1fr_44px_58px_44px] items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
        <span className="text-sm font-semibold">Line height</span>
        <Button
          size="icon"
          variant="secondary"
          className="h-11 w-11"
          aria-label="Decrease line height"
          onClick={() => onLineHeightChange(-0.1)}
        >
          <Minus size={18} />
        </Button>
        <span
          className="text-center text-sm font-bold tabular-nums"
          aria-label="Line height value"
        >
          {settings.lineHeight.toFixed(1)}
        </span>
        <Button
          size="icon"
          variant="secondary"
          className="h-11 w-11"
          aria-label="Increase line height"
          onClick={() => onLineHeightChange(0.1)}
        >
          <Plus size={18} />
        </Button>
      </div>
      <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
        <p className="mb-2 text-sm font-semibold">Layout</p>
        <div
          className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900"
          aria-label="Chart layout"
        >
          {CHART_LAYOUT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "min-h-11 rounded-md px-2 text-xs font-bold transition-colors",
                layout === option.value
                  ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-800/70",
              )}
              aria-pressed={layout === option.value}
              onClick={() => onLayoutChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartFontControls(props: ChartAppearanceProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-11 w-11"
          aria-label="Chart font sizes"
        >
          <span className="text-sm font-black">Aa</span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl outline-none dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex min-h-11 items-center justify-between gap-3">
            <Dialog.Title className="text-lg font-bold">
              Chart font sizes
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-11 w-11"
                aria-label="Close font size controls"
              >
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          <ChartAppearancePanel {...props} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
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
  const { theme, setTheme } = useTheme();
  const [current, setCurrent] = useState(0);
  const [showOrder, setShowOrder] = useState(false);
  const [showBandNotes, setShowBandNotes] = useState(false);
  const [transposeOffsets, setTransposeOffsets] = useState<
    Record<string, number>
  >({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const [fontSettings, setFontSettings] = useState<ChartFontSettings>(
    DEFAULT_CHART_FONT_SETTINGS,
  );
  const [chartLayout, setChartLayout] = useState<ChartLayout>("auto");
  const performanceRootRef = useRef<HTMLElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const autoHide = useResponsiveAutoHideControls(chartScrollRef, !singleSong);
  const song = snapshot.songs[current];
  const selectSong = useCallback(
    (index: number) => {
      setCurrent(Math.max(0, Math.min(snapshot.songs.length - 1, index)));
    },
    [snapshot.songs.length],
  );

  useEffect(() => {
    void settingsRepository.get().then((settings) => {
      setFontSettings(settings.chartFontSettings);
      setChartLayout(settings.chartLayout);
    });
  }, []);

  useEffect(() => {
    if (window.scrollX !== 0 || window.scrollY !== 0) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    const scrollingElement = document.scrollingElement;
    if (scrollingElement) {
      scrollingElement.scrollTop = 0;
      scrollingElement.scrollLeft = 0;
    }

    if (performanceRootRef.current) {
      performanceRootRef.current.scrollTop = 0;
      performanceRootRef.current.scrollLeft = 0;
    }
    if (chartScrollRef.current) {
      chartScrollRef.current.scrollTop = 0;
      chartScrollRef.current.scrollLeft = 0;
    }
    performanceRootRef.current
      ?.querySelectorAll<HTMLElement>("[data-performance-scroll-container]")
      .forEach((container) => {
        container.scrollTop = 0;
        container.scrollLeft = 0;
      });
  }, [current]);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      setFullscreenAvailable(
        typeof document.documentElement.requestFullscreen === "function" &&
          typeof document.exitFullscreen === "function",
      );
    };
    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (event.key === "ArrowRight") selectSong(current + 1);
      if (event.key === "ArrowLeft") selectSong(current - 1);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [current, selectSong]);

  function changeFontScale(category: ChartFontCategory, change: number) {
    setFontSettings((currentSettings) => {
      const next = adjustChartFontScale(currentSettings, category, change);
      void settingsRepository.saveChartFontSettings(next);
      return next;
    });
  }

  function changeLineHeight(change: number) {
    setFontSettings((currentSettings) => {
      const next = adjustChartLineHeight(currentSettings, change);
      void settingsRepository.saveChartFontSettings(next);
      return next;
    });
  }

  function changeChartLayout(layout: ChartLayout) {
    setChartLayout(layout);
    void settingsRepository.saveChartLayout(layout);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.();
      else await document.documentElement.requestFullscreen?.();
    } catch {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  }

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

  const transposeOffset = transposeOffsets[song.entryId] ?? 0;
  const changeTransposeOffset = (change: number) => {
    setTransposeOffsets((currentOffsets) => ({
      ...currentOffsets,
      [song.entryId]: (currentOffsets[song.entryId] ?? 0) + change,
    }));
  };
  const resetTransposeOffset = () => {
    setTransposeOffsets((currentOffsets) => ({
      ...currentOffsets,
      [song.entryId]: 0,
    }));
  };
  const baseKey = song.performanceKey || song.originalKey;
  const baseSemitones = semitoneDistance(song.originalKey, baseKey);
  const semitones = baseSemitones + transposeOffset;
  const currentKey = baseKey
    ? formatMusicalKey(transposeMusicalKey(baseKey, transposeOffset))
    : "Not set";
  const controlsVisible = !autoHide.responsive || autoHide.controlsVisible;

  return (
    <main
      ref={performanceRootRef}
      data-performance-setlist-view={!singleSong || undefined}
      data-controls-responsive={autoHide.responsive || undefined}
      className={cn(
        "max-w-full bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100",
        "min-h-dvh pb-24",
      )}
    >
      {!singleSong && autoHide.responsive && autoHide.controlsVisible && (
        <Button
          size="icon"
          variant="secondary"
          className="fixed left-[max(.5rem,env(safe-area-inset-left))] top-[max(.5rem,env(safe-area-inset-top))] z-30 h-11 w-11 shadow-md"
          aria-label="Open performance menu"
          onClick={() => {
            autoHide.revealTemporarily();
            setShowOrder(true);
          }}
        >
          <List size={21} />
        </Button>
      )}
      <header
        data-auto-hide-header
        data-visible={controlsVisible}
        onFocusCapture={autoHide.revealTemporarily}
        onPointerDownCapture={autoHide.revealTemporarily}
        className={cn(
          "sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-2 py-2 backdrop-blur transition-transform duration-200 motion-reduce:transition-none dark:border-slate-800 dark:bg-slate-950/95 sm:px-4",
        )}
      >
        <div
          data-performance-header-content
          className={cn(
            "mx-auto flex min-h-11 max-w-7xl items-center gap-1.5 sm:gap-2",
          )}
        >
          {backHref && (
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="h-11 w-11"
              aria-label="Go back"
            >
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
            <Button asChild variant="secondary" size="sm" className="h-11">
              <Link href={editHref}>
                <Edit3 size={16} />
                <span className="hidden min-[375px]:inline">Edit song</span>
              </Link>
            </Button>
          )}
          {!singleSong && (
            <Dialog.Root open={showOrder} onOpenChange={setShowOrder}>
              <Dialog.Trigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  data-desktop-performance-menu-trigger
                  className="order-first h-11 w-11"
                  aria-label={
                    autoHide.responsive ? undefined : "Open performance menu"
                  }
                  aria-hidden={autoHide.responsive || undefined}
                  tabIndex={autoHide.responsive ? -1 : undefined}
                >
                  <List size={21} />
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]" />
                <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-[min(88vw,22rem)] overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-2xl outline-none dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-5 flex min-h-11 items-center justify-between gap-3">
                    <Dialog.Title className="text-lg font-bold">
                      Performance menu
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-11 w-11"
                        aria-label="Close performance menu"
                      >
                        <X size={20} />
                      </Button>
                    </Dialog.Close>
                  </div>

                  <label className="mb-4 block rounded-lg border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800">
                    Theme
                    <select
                      aria-label="Performance theme"
                      className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      value={theme}
                      onChange={(event) =>
                        void setTheme(event.target.value as typeof theme)
                      }
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </label>

                  <section className="mb-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Appearance
                    </h2>
                    <ChartAppearancePanel
                      settings={fontSettings}
                      layout={chartLayout}
                      onChange={changeFontScale}
                      onLineHeightChange={changeLineHeight}
                      onLayoutChange={changeChartLayout}
                    />
                  </section>

                  <div className="mb-6 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <button
                      className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-semibold"
                      aria-pressed={showBandNotes}
                      onClick={() => {
                        setShowBandNotes((visible) => !visible);
                        setShowOrder(false);
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <StickyNote size={18} />
                        Band Notes
                      </span>
                      <span className="text-xs text-indigo-700 dark:text-indigo-300">
                        {showBandNotes ? "ON" : "OFF"}
                      </span>
                    </button>
                    {!snapshot.notes && (
                      <p className="mt-1 text-xs text-slate-500">
                        No band notes have been added.
                      </p>
                    )}
                  </div>

                  <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
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
                            Key {formatMusicalKey(item.performanceKey)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
          {singleSong && (
            <ChartFontControls
              settings={fontSettings}
              layout={chartLayout}
              onChange={changeFontScale}
              onLineHeightChange={changeLineHeight}
              onLayoutChange={changeChartLayout}
            />
          )}
          <Button
            size="icon"
            variant="ghost"
            className="hidden h-11 w-11 sm:inline-flex"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={
              fullscreenAvailable
                ? isFullscreen
                  ? "Exit Fullscreen"
                  : "Enter Fullscreen"
                : "Fullscreen is not supported by this browser"
            }
            disabled={!fullscreenAvailable}
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </Button>
        </div>
      </header>

      <div
        ref={chartScrollRef}
        data-performance-chart-scroll
        onClick={autoHide.revealTemporarily}
        className="mx-auto max-w-7xl"
      >
        <article
          data-performance-chart-article
          className="min-w-0 px-3 py-5 min-[375px]:px-4 sm:px-8 sm:py-7 lg:px-12"
        >
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
                {song.capo && (
                  <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Capo {song.capo}
                  </p>
                )}
              </div>
              <div
                className="flex items-center gap-1"
                aria-label="Transpose controls"
              >
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-11 w-11"
                  aria-label="Transpose down"
                  onClick={() => changeTransposeOffset(-1)}
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
                  className="h-11 w-11"
                  aria-label="Transpose up"
                  onClick={() => changeTransposeOffset(1)}
                >
                  <Plus size={18} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11"
                  aria-label="Reset transposition"
                  disabled={transposeOffset === 0}
                  onClick={resetTransposeOffset}
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

          {showBandNotes && snapshot.notes && (
            <section
              aria-label="Band Notes"
              className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-xs font-bold uppercase tracking-[.16em] text-slate-600 dark:text-slate-300">
                  Band Notes
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowBandNotes(false)}
                >
                  Hide
                </Button>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                {snapshot.notes}
              </p>
            </section>
          )}

          <div
            data-chart-layout={chartLayout}
            className={cn(
              "gap-6 sm:gap-8",
              chartLayout === "one" && "columns-1",
              chartLayout === "two" && "columns-2",
              chartLayout === "auto" && "columns-1 md:columns-2",
            )}
          >
            {song.sections.map((section) => (
              <section
                key={section.id}
                className="mb-4 inline-block w-full min-w-0 break-inside-avoid sm:mb-5"
              >
                <h2
                  className="mb-3 font-bold uppercase tracking-[.16em] text-indigo-700 dark:text-indigo-400"
                  style={{
                    fontSize: `${0.75 * (fontSettings.sectionScale / 100)}rem`,
                  }}
                >
                  {section.title}
                </h2>
                <div className="space-y-3 font-mono text-base leading-7 sm:text-xl sm:leading-8">
                  {withoutTrailingBlankLines(section.lines).map((line) => (
                    <ChartLine
                      key={line.id}
                      line={line}
                      semitones={semitones}
                      fontSettings={fontSettings}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>

      {!singleSong && (
        <footer
          data-auto-hide-pagination
          data-visible={controlsVisible}
          onFocusCapture={autoHide.revealTemporarily}
          onPointerDownCapture={autoHide.revealTemporarily}
          className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-2 pb-[max(.5rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-200 motion-reduce:transition-none dark:border-slate-800 dark:bg-slate-950/95 sm:p-3"
        >
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
