import { describe, expect, it } from "vitest";
import {
  adjustChartFontScale,
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
    ).toEqual({ sectionScale: 100, chordScale: 110, lyricScale: 100 });
  });
});
