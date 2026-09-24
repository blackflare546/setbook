import { describe, expect, it } from "vitest";
import {
  adjustChartFontScale,
  adjustChartLineHeight,
  DEFAULT_CHART_FONT_SETTINGS,
} from "@/core/songs/chart-font-settings";

describe("chart font settings", () => {
  it.each([
    ["section", 180],
    ["chord", 200],
    ["lyric", 200],
  ] as const)("caps %s scale at its maximum", (category, maximum) => {
    let settings = DEFAULT_CHART_FONT_SETTINGS;
    for (let index = 0; index < 20; index += 1) {
      settings = adjustChartFontScale(settings, category, 10);
    }
    expect(settings[`${category}Scale`]).toBe(maximum);
  });

  it.each(["section", "chord", "lyric"] as const)(
    "floors %s scale at 80 percent",
    (category) => {
      let settings = DEFAULT_CHART_FONT_SETTINGS;
      for (let index = 0; index < 20; index += 1) {
        settings = adjustChartFontScale(settings, category, -10);
      }
      expect(settings[`${category}Scale`]).toBe(80);
    },
  );

  it("changes only the selected category", () => {
    expect(
      adjustChartFontScale(DEFAULT_CHART_FONT_SETTINGS, "chord", 10),
    ).toEqual({
      sectionScale: 100,
      chordScale: 110,
      lyricScale: 100,
      lineHeight: 1.4,
    });
  });

  it("defaults line height to 1.4 and changes only vertical rendering", () => {
    expect(DEFAULT_CHART_FONT_SETTINGS.lineHeight).toBe(1.4);
    expect(adjustChartLineHeight(DEFAULT_CHART_FONT_SETTINGS, 0.1)).toEqual({
      ...DEFAULT_CHART_FONT_SETTINGS,
      lineHeight: 1.5,
    });
  });

  it("keeps auto as the default chart layout option", async () => {
    const { CHART_LAYOUT_OPTIONS } =
      await import("@/core/songs/chart-font-settings");
    expect(CHART_LAYOUT_OPTIONS).toEqual([
      { value: "auto", label: "Auto" },
      { value: "one", label: "1 Column" },
      { value: "two", label: "2 Columns" },
    ]);
  });

  it("bounds line height between 1.0 and 2.5", () => {
    expect(
      adjustChartLineHeight(
        { ...DEFAULT_CHART_FONT_SETTINGS, lineHeight: 1 },
        -0.1,
      ).lineHeight,
    ).toBe(1);
    expect(
      adjustChartLineHeight(
        { ...DEFAULT_CHART_FONT_SETTINGS, lineHeight: 2.5 },
        0.1,
      ).lineHeight,
    ).toBe(2.5);
  });
});
