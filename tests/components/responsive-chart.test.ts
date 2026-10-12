import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResponsiveChartSection } from "@/components/performance/responsive-chart";
import {
  DEFAULT_CHART_COLORS,
  DEFAULT_CHART_FONT_SETTINGS,
} from "@/core/songs/chart-font-settings";
import type { SongSection } from "@/core/songs/types";

const section: SongSection = {
  id: "section",
  type: "verse",
  title: "Verse",
  lines: [
    {
      id: "line",
      lyrics: "one two three four",
      chords: [{ id: "chord", symbol: "G", position: 8 }],
    },
  ],
};

let sectionWidth = 100;
let resizeCallback: ResizeObserverCallback | undefined;

function rect(width: number): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    right: width,
    bottom: 20,
    left: 0,
    width,
    height: 20,
    toJSON: () => ({}),
  };
}

beforeEach(() => {
  sectionWidth = 100;
  resizeCallback = undefined;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function mockRect(this: HTMLElement) {
      if (this.tagName === "SECTION") return rect(sectionWidth);
      if (this.textContent === "0".repeat(100)) {
        const scale = Number.parseFloat(this.style.fontSize) || 1;
        return rect(1_000 * scale);
      }
      return rect(0);
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("responsive chart rendering", () => {
  it("reflows on section resize and font changes without mutating the song", async () => {
    const source = structuredClone(section);
    const view = render(
      React.createElement(ResponsiveChartSection, {
        section: source,
        semitones: 0,
        fontSettings: DEFAULT_CHART_FONT_SETTINGS,
        colors: DEFAULT_CHART_COLORS,
        chartBackground: "#FFFFFF",
      }),
    );

    await waitFor(() =>
      expect(screen.getAllByTestId("chart-line-fragment")).toHaveLength(3),
    );
    expect(screen.getByText("G").parentElement).toHaveAttribute(
      "data-chord-position",
      "8",
    );
    expect(screen.getByText("G").parentElement).toHaveAttribute(
      "data-chord-render-position",
      "0",
    );

    sectionWidth = 200;
    act(() => resizeCallback?.([], {} as ResizeObserver));
    await waitFor(() =>
      expect(screen.getAllByTestId("chart-line-fragment")).toHaveLength(1),
    );
    expect(screen.getByText("G").parentElement).toHaveAttribute(
      "data-chord-render-position",
      "8",
    );

    view.rerender(
      React.createElement(ResponsiveChartSection, {
        section: source,
        semitones: 0,
        fontSettings: { ...DEFAULT_CHART_FONT_SETTINGS, lyricScale: 200 },
        colors: DEFAULT_CHART_COLORS,
        chartBackground: "#FFFFFF",
      }),
    );
    await waitFor(() =>
      expect(screen.getAllByTestId("chart-line-fragment")).toHaveLength(3),
    );
    expect(source).toEqual(section);
  });
});
