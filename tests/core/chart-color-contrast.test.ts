import { describe, expect, it } from "vitest";
import {
  CHART_BACKGROUNDS,
  contrastRatio,
  getChartContrastOutline,
  needsChartContrastSupport,
} from "@/core/songs/chart-color-contrast";

describe("chart color contrast", () => {
  it("calculates the WCAG contrast ratio", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBe(21);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBe(1);
    expect(contrastRatio("#fff", "#000")).toBe(21);
  });

  it("flags saved dark ink colors on the dark performance canvas", () => {
    expect(needsChartContrastSupport("#020617", CHART_BACKGROUNDS.dark)).toBe(
      true,
    );
    expect(needsChartContrastSupport("#F3F5F7", CHART_BACKGROUNDS.dark)).toBe(
      false,
    );
  });

  it("adds an outline only when contrast needs support", () => {
    expect(
      getChartContrastOutline("#020617", CHART_BACKGROUNDS.dark),
    ).toContain("rgba(248, 250, 252");
    expect(
      getChartContrastOutline("#F3F5F7", CHART_BACKGROUNDS.dark),
    ).toBeUndefined();
  });
});
