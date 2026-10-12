"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SongLine, SongSection } from "@/core/songs/types";
import type {
  ChartColors,
  ChartFontSettings,
} from "@/core/songs/chart-font-settings";
import { getChartContrastOutline } from "@/core/songs/chart-color-contrast";
import {
  layoutChartLine,
  type DisplayChord,
} from "@/core/songs/chart-line-layout";
import { transposeChordSymbol } from "@/core/transpose/transpose";
import { cn } from "@/lib/utils";

const COLUMN_PROBE = "0".repeat(100);

const ResponsiveChartLine = memo(function ResponsiveChartLine({
  line,
  semitones,
  fontSettings,
  colors,
  chartBackground,
  availableColumns,
}: {
  line: SongLine;
  semitones: number;
  fontSettings: ChartFontSettings;
  colors: ChartColors;
  chartBackground: string;
  availableColumns: number | null;
}) {
  const chords = useMemo<DisplayChord[]>(
    () =>
      line.chords.map((chord) => ({
        ...chord,
        displaySymbol: transposeChordSymbol(chord.symbol, semitones),
      })),
    [line.chords, semitones],
  );
  const chordToLyricScale =
    fontSettings.chordScale / fontSettings.lyricScale;
  const fragments = useMemo(
    () =>
      layoutChartLine(
        line,
        chords,
        chordToLyricScale,
        availableColumns ?? Number.POSITIVE_INFINITY,
      ),
    [availableColumns, chordToLyricScale, chords, line],
  );

  return (
    <div
      data-testid="chart-line"
      data-source-columns={Math.max(
        1,
        line.lyrics.length,
        ...chords.map((chord) => chord.position + chord.displaySymbol.length),
      )}
      style={{ fontSize: `${fontSettings.lyricScale / 100}em` }}
    >
      {fragments.map((fragment) => {
        const scrollsHorizontally =
          availableColumns === null || fragment.overflows;
        return (
          <div
            key={`${fragment.startColumn}-${fragment.endColumn}`}
            data-testid="chart-line-fragment"
            data-fragment-start={fragment.startColumn}
            data-fragment-end={fragment.endColumn}
            data-performance-scroll-container={
              scrollsHorizontally || undefined
            }
            className={cn(
              "max-w-full overflow-y-hidden",
              scrollsHorizontally
                ? "overflow-x-auto overscroll-x-contain"
                : "overflow-x-clip",
            )}
          >
            <div
              className="min-w-full"
              style={{ width: `${fragment.columns}ch` }}
            >
              {line.chords.length > 0 && (
                <div
                  className="relative leading-none"
                  style={{
                    height: `${Math.max(fontSettings.lineHeight, 1.2 * chordToLyricScale)}em`,
                  }}
                >
                  {fragment.chords.map((chord) => (
                    <span
                      key={chord.id}
                      data-chord-position={chord.position}
                      data-chord-render-position={chord.renderedPosition}
                      className="absolute"
                      style={{ left: `${chord.renderedPosition}ch` }}
                    >
                      <span
                        className="font-extrabold"
                        style={{
                          color: colors.chord,
                          fontSize: `${chordToLyricScale}em`,
                          textShadow: getChartContrastOutline(
                            colors.chord,
                            chartBackground,
                          ),
                        }}
                      >
                        {chord.displaySymbol}
                      </span>
                    </span>
                  ))}
                </div>
              )}
              {(fragment.lyrics || line.chords.length === 0) && (
                <div
                  className="whitespace-pre"
                  style={{
                    color: colors.lyric,
                    lineHeight: fontSettings.lineHeight,
                    textShadow: getChartContrastOutline(
                      colors.lyric,
                      chartBackground,
                    ),
                  }}
                >
                  {fragment.lyrics || " "}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export function ResponsiveChartSection({
  section,
  semitones,
  fontSettings,
  colors,
  chartBackground,
}: {
  section: SongSection;
  semitones: number;
  fontSettings: ChartFontSettings;
  colors: ChartColors;
  chartBackground: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [availableColumns, setAvailableColumns] = useState<number | null>(null);

  const measureColumns = useCallback(() => {
    const sectionWidth = sectionRef.current?.getBoundingClientRect().width ?? 0;
    const probeWidth = probeRef.current?.getBoundingClientRect().width ?? 0;
    if (sectionWidth <= 0 || probeWidth <= 0) return;
    const next = Math.max(
      1,
      Math.floor(sectionWidth / (probeWidth / 100)) - 1,
    );
    setAvailableColumns((current) => (current === next ? current : next));
  }, []);

  useEffect(() => {
    measureColumns();
    const sectionElement = sectionRef.current;
    const probeElement = probeRef.current;
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureColumns);
      return () => window.removeEventListener("resize", measureColumns);
    }
    const observer = new ResizeObserver(measureColumns);
    if (sectionElement) observer.observe(sectionElement);
    if (probeElement) observer.observe(probeElement);
    return () => observer.disconnect();
  }, [fontSettings.lyricScale, measureColumns]);

  return (
    <section
      ref={sectionRef}
      data-available-chart-columns={availableColumns ?? undefined}
      className="relative mb-0 inline-block w-full min-w-0 break-inside-avoid"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-0 overflow-hidden font-mono text-base opacity-0 sm:text-xl"
      >
        <span
          ref={probeRef}
          data-chart-column-probe
          className="whitespace-pre"
          style={{ fontSize: `${fontSettings.lyricScale / 100}em` }}
        >
          {COLUMN_PROBE}
        </span>
      </span>
      <h2
        className="mb-0 font-extrabold uppercase tracking-[.16em] dark:tracking-[.08em]"
        style={{
          color: colors.section,
          fontSize: `${0.75 * (fontSettings.sectionScale / 100)}rem`,
          textShadow: getChartContrastOutline(colors.section, chartBackground),
        }}
      >
        {section.title}
      </h2>
      <div className="space-y-0 font-mono text-base leading-7 sm:text-xl sm:leading-8">
        {section.lines.map((line) => (
          <ResponsiveChartLine
            key={line.id}
            line={line}
            semitones={semitones}
            fontSettings={fontSettings}
            colors={colors}
            chartBackground={chartBackground}
            availableColumns={availableColumns}
          />
        ))}
      </div>
    </section>
  );
}
