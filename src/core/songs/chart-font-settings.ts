export type ChartFontCategory = "section" | "chord" | "lyric";
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

export const DEFAULT_CHART_FONT_SETTINGS: ChartFontSettings = {
  sectionScale: 80,
  chordScale: 80,
  lyricScale: 80,
  lineHeight: 1,
};

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
