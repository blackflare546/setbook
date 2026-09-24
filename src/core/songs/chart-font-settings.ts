export type ChartFontCategory = "section" | "chord" | "lyric";

export interface ChartFontSettings {
  sectionScale: number;
  chordScale: number;
  lyricScale: number;
  lineHeight: number;
}

export const DEFAULT_CHART_FONT_SETTINGS: ChartFontSettings = {
  sectionScale: 100,
  chordScale: 100,
  lyricScale: 100,
  lineHeight: 1.4,
};

export const CHART_FONT_BOUNDS: Record<
  ChartFontCategory,
  { min: number; max: number }
> = {
  section: { min: 80, max: 180 },
  chord: { min: 80, max: 200 },
  lyric: { min: 80, max: 200 },
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
