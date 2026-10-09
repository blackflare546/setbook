import { describe, expect, it } from "vitest";
import {
  adjustChartFontScale,
  adjustChartLineHeight,
  DARK_CHART_COLORS,
  DEFAULT_CHART_COLORS,
  DEFAULT_CHART_FONT_SETTINGS,
  resolveChartColors,
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
    "floors %s scale at 50 percent",
    (category) => {
      let settings = DEFAULT_CHART_FONT_SETTINGS;
      for (let index = 0; index < 20; index += 1) {
        settings = adjustChartFontScale(settings, category, -10);
      }
      expect(settings[`${category}Scale`]).toBe(50);
    },
  );

  it("changes only the selected category", () => {
    expect(
      adjustChartFontScale(DEFAULT_CHART_FONT_SETTINGS, "chord", 10),
    ).toEqual({
      sectionScale: 130,
      chordScale: 110,
      lyricScale: 100,
      lineHeight: 1,
    });
  });

  it("defaults sections to 130 percent without changing chord or lyric sizes", () => {
    expect(DEFAULT_CHART_FONT_SETTINGS).toMatchObject({
      sectionScale: 130,
      chordScale: 100,
      lyricScale: 100,
    });
  });

  it("uses the current chart palette as its default colors", () => {
    expect(DEFAULT_CHART_COLORS).toEqual({
      section: "#000000",
      chord: "#4338CA",
      lyric: "#020617",
    });
  });

  it("uses the readable chart palette in dark mode without changing saved colors", () => {
    const savedColors = {
      section: "#112233",
      chord: "#445566",
      lyric: "#778899",
    };

    expect(resolveChartColors(savedColors, DARK_CHART_COLORS, "dark")).toEqual(
      DARK_CHART_COLORS,
    );
    expect(resolveChartColors(savedColors, DARK_CHART_COLORS, "light")).toBe(
      savedColors,
    );
    expect(savedColors).toEqual({
      section: "#112233",
      chord: "#445566",
      lyric: "#778899",
    });
  });

  it("defaults line height to 1.0 and changes only vertical rendering", () => {
    expect(DEFAULT_CHART_FONT_SETTINGS.lineHeight).toBe(1);
    expect(adjustChartLineHeight(DEFAULT_CHART_FONT_SETTINGS, 0.1)).toEqual({
      ...DEFAULT_CHART_FONT_SETTINGS,
      lineHeight: 1.1,
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
