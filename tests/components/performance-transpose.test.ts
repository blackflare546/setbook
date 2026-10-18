import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PerformanceView } from "@/components/performance/performance-view";
import type { PublishedSnapshot } from "@/lib/validation/schemas";

const snapshot: PublishedSnapshot = {
  version: 1,
  name: "Per-song transpose",
  venue: "",
  notes: "",
  publishedAt: "2026-01-01T00:00:00.000Z",
  songs: [
    {
      entryId: "setlist-song-1",
      title: "Song A",
      artist: "",
      originalKey: "G",
      performanceKey: "G",
      capo: null,
      arrangementCue: "",
      sections: [
        {
          id: "section-a",
          type: "verse",
          title: "Verse",
          lines: [
            {
              id: "line-a",
              lyrics: "A",
              chords: [{ id: "chord-a", symbol: "G", position: 12 }],
            },
          ],
        },
      ],
    },
    {
      entryId: "setlist-song-2",
      title: "Song B",
      artist: "",
      originalKey: "C",
      performanceKey: "C",
      capo: null,
      arrangementCue: "",
      sections: [
        {
          id: "section-b",
          type: "verse",
          title: "Verse",
          lines: [
            {
              id: "line-b",
              lyrics: "B",
              chords: [{ id: "chord-b", symbol: "C", position: 4 }],
            },
          ],
        },
      ],
    },
    {
      entryId: "setlist-song-3",
      title: "Song C",
      artist: "",
      originalKey: "A Minor",
      performanceKey: "A Minor",
      capo: null,
      arrangementCue: "",
      sections: [
        {
          id: "section-c",
          type: "verse",
          title: "Verse",
          lines: [
            {
              id: "line-c",
              lyrics: "C",
              chords: [{ id: "chord-c", symbol: "Am", position: 8 }],
            },
          ],
        },
      ],
    },
  ],
};

function displayedChord() {
  const line = screen.getByTestId("chart-line");
  const chord = line.querySelector<HTMLElement>("[data-chord-position]");
  if (!chord) throw new Error("Expected a rendered chord");
  return chord;
}

afterEach(cleanup);

describe("performance transposition", () => {
  it("jumps directly to a song from the numbered navigator", () => {
    render(React.createElement(PerformanceView, { snapshot }));

    const firstSong = screen.getByRole("button", {
      name: "Go to song 1: Song A",
    });
    const thirdSong = screen.getByRole("button", {
      name: "Go to song 3: Song C",
    });

    expect(firstSong).toHaveAttribute("aria-current", "page");
    expect(thirdSong).not.toHaveAttribute("aria-current");

    fireEvent.click(thirdSong);

    expect(screen.getByRole("heading", { name: "Song C" })).toBeVisible();
    expect(thirdSong).toHaveAttribute("aria-current", "page");
    expect(firstSong).not.toHaveAttribute("aria-current");
  });

  it("navigates on deliberate horizontal swipes without treating vertical scrolls as swipes", () => {
    const view = render(React.createElement(PerformanceView, { snapshot }));
    const chart = view.container.querySelector<HTMLElement>(
      "[data-performance-chart-scroll]",
    );
    expect(chart).not.toBeNull();

    fireEvent.touchStart(chart!, {
      touches: [{ clientX: 260, clientY: 180 }],
    });
    fireEvent.touchEnd(chart!, {
      changedTouches: [{ clientX: 140, clientY: 190 }],
    });
    expect(screen.getByRole("heading", { name: "Song B" })).toBeVisible();

    fireEvent.touchStart(chart!, {
      touches: [{ clientX: 220, clientY: 100 }],
    });
    fireEvent.touchEnd(chart!, {
      changedTouches: [{ clientX: 170, clientY: 260 }],
    });
    expect(screen.getByRole("heading", { name: "Song B" })).toBeVisible();

    fireEvent.touchStart(chart!, {
      touches: [{ clientX: 170, clientY: 180 }],
    });
    fireEvent.touchEnd(chart!, {
      changedTouches: [{ clientX: 280, clientY: 175 }],
    });
    expect(screen.getByRole("heading", { name: "Song A" })).toBeVisible();
  });

  it("ignores short swipes and gestures that start on chart controls", () => {
    const view = render(React.createElement(PerformanceView, { snapshot }));
    const chart = view.container.querySelector<HTMLElement>(
      "[data-performance-chart-scroll]",
    );
    expect(chart).not.toBeNull();

    fireEvent.touchStart(chart!, {
      touches: [{ clientX: 220, clientY: 180 }],
    });
    fireEvent.touchEnd(chart!, {
      changedTouches: [{ clientX: 160, clientY: 180 }],
    });
    expect(screen.getByRole("heading", { name: "Song A" })).toBeVisible();

    const transposeUp = screen.getByLabelText("Transpose up");
    fireEvent.touchStart(transposeUp, {
      touches: [{ clientX: 240, clientY: 180 }],
    });
    fireEvent.touchEnd(transposeUp, {
      changedTouches: [{ clientX: 100, clientY: 180 }],
    });
    expect(screen.getByRole("heading", { name: "Song A" })).toBeVisible();
  });

  it("keeps the active song valid when a refreshed snapshot becomes shorter", () => {
    const view = render(React.createElement(PerformanceView, { snapshot }));

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "Song C" })).toBeVisible();

    view.rerender(
      React.createElement(PerformanceView, {
        snapshot: { ...snapshot, songs: snapshot.songs.slice(0, 1) },
      }),
    );
    expect(screen.getByRole("heading", { name: "Song A" })).toBeVisible();
    expect(screen.getByText("1/1")).toBeVisible();
  });

  it("uses arrow shortcuts without hijacking interactive controls or dialogs", () => {
    render(React.createElement(PerformanceView, { snapshot }));

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "Song B" })).toBeVisible();

    const select = document.createElement("select");
    document.body.append(select);
    fireEvent.keyDown(select, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "Song B" })).toBeVisible();
    select.remove();

    fireEvent.click(screen.getByLabelText("Open performance menu"));
    expect(screen.getByRole("dialog")).toBeVisible();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "Song B" })).toBeVisible();

    fireEvent.click(screen.getByLabelText("Close performance menu"));
    fireEvent.keyDown(window, { key: "ArrowLeft", ctrlKey: true });
    expect(screen.getByRole("heading", { name: "Song B" })).toBeVisible();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { name: "Song A" })).toBeVisible();
  });

  it("keeps an independent offset for every setlist entry", () => {
    const originalChords = snapshot.songs.map((song) => ({
      ...song.sections[0].lines[0].chords[0],
    }));
    render(React.createElement(PerformanceView, { snapshot }));

    expect(screen.getByLabelText("Transpose offset")).toHaveTextContent("0");
    expect(displayedChord()).toHaveTextContent("G");

    fireEvent.click(screen.getByLabelText("Transpose up"));
    fireEvent.click(screen.getByLabelText("Transpose up"));
    expect(screen.getByLabelText("Transpose offset")).toHaveTextContent("+2");
    expect(displayedChord()).toHaveTextContent("A");
    expect(displayedChord()).toHaveAttribute("data-chord-position", "12");

    fireEvent.click(screen.getByText("Next").closest("button")!);
    expect(screen.getByRole("heading", { name: "Song B" })).toBeVisible();
    expect(screen.getByLabelText("Transpose offset")).toHaveTextContent("0");
    expect(displayedChord()).toHaveTextContent("C");

    fireEvent.click(screen.getByText("Next").closest("button")!);
    expect(screen.getByRole("heading", { name: "Song C" })).toBeVisible();
    expect(screen.getByLabelText("Transpose offset")).toHaveTextContent("0");
    expect(displayedChord()).toHaveTextContent("Am");

    fireEvent.click(screen.getByLabelText("Transpose down"));
    expect(screen.getByLabelText("Transpose offset")).toHaveTextContent("-1");
    expect(displayedChord()).toHaveTextContent("G#m");
    expect(displayedChord()).toHaveAttribute("data-chord-position", "8");

    fireEvent.click(screen.getByText("Prev").closest("button")!);
    expect(screen.getByRole("heading", { name: "Song B" })).toBeVisible();
    expect(screen.getByLabelText("Transpose offset")).toHaveTextContent("0");
    expect(displayedChord()).toHaveTextContent("C");

    fireEvent.click(screen.getByText("Prev").closest("button")!);
    expect(screen.getByRole("heading", { name: "Song A" })).toBeVisible();
    expect(screen.getByLabelText("Transpose offset")).toHaveTextContent("+2");
    expect(displayedChord()).toHaveTextContent("A");

    fireEvent.click(screen.getByText("Next").closest("button")!);
    fireEvent.click(screen.getByText("Next").closest("button")!);
    expect(screen.getByLabelText("Transpose offset")).toHaveTextContent("-1");
    expect(displayedChord()).toHaveTextContent("G#m");

    expect(
      snapshot.songs.map((song) => song.sections[0].lines[0].chords[0]),
    ).toEqual(originalChords);
    expect(originalChords).toEqual([
      { id: "chord-a", symbol: "G", position: 12 },
      { id: "chord-b", symbol: "C", position: 4 },
      { id: "chord-c", symbol: "Am", position: 8 },
    ]);
  });
});
