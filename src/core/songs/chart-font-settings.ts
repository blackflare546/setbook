export type ChartFontCategory = "section" | "chord" | "lyric";
export type ChartColorCategory = ChartFontCategory;
export type ChartLayout = "auto" | "one" | "two";

export const CHART_LAYOUT_OPTIONS: Array<{
  value: ChartLayout;
  label: string;
}> = [
  { value: "auto", label: "Auto" },
  { value: "one", label: "1 Column" },
  { value: "two", label: "2 Columns" },
];

export interface ChartFontSettings {
  sectionScale: number;
  chordScale: number;
  lyricScale: number;
  lineHeight: number;
}

export interface ChartColors {
  section: string;
  chord: string;
  lyric: string;
}

export const DEFAULT_CHART_FONT_SETTINGS: ChartFontSettings = {
  sectionScale: 130,
  chordScale: 100,
  lyricScale: 100,
  lineHeight: 1,
};

export const DEFAULT_CHART_COLORS: ChartColors = {
  section: "#000000",
  chord: "#4338CA",
  lyric: "#020617",
};

export const DARK_CHART_COLORS: ChartColors = {
  section: "#FFFFFF",
  chord: "#93C5FD",
  lyric: "#FFFFFF",
};

export function resolveChartColors(
  lightColors: ChartColors,
  darkColors: ChartColors,
  theme: "light" | "dark",
): ChartColors {
  if (theme === "light") return lightColors;

  return {
    section: needsChartContrastSupport(
      darkColors.section,
      CHART_BACKGROUNDS.dark,
    )
      ? DARK_CHART_COLORS.section
      : darkColors.section,
    chord: needsChartContrastSupport(darkColors.chord, CHART_BACKGROUNDS.dark)
      ? DARK_CHART_COLORS.chord
      : darkColors.chord,
    lyric: needsChartContrastSupport(darkColors.lyric, CHART_BACKGROUNDS.dark)
      ? DARK_CHART_COLORS.lyric
      : darkColors.lyric,
  };
}

export const CHART_FONT_BOUNDS: Record<
  ChartFontCategory,
  { min: number; max: number }
> = {
  section: { min: 50, max: 180 },
  chord: { min: 50, max: 200 },
  lyric: { min: 50, max: 200 },
};

export function adjustChartFontScale(
  settings: ChartFontSettings,
  category: ChartFontCategory,
  change: number,
): ChartFontSettings {
  const key = `${category}Scale` as const;
  const bounds = CHART_FONT_BOUNDS[category];
  return {
    ...settings,
    [key]: Math.min(bounds.max, Math.max(bounds.min, settings[key] + change)),
  };
}

export function adjustChartLineHeight(
  settings: ChartFontSettings,
  change: number,
): ChartFontSettings {
  const next = Math.round((settings.lineHeight + change) * 10) / 10;
  return {
    ...settings,
    lineHeight: Math.min(2.5, Math.max(1, next)),
  };
}
import {
  CHART_BACKGROUNDS,
  needsChartContrastSupport,
} from "./chart-color-contrast";
