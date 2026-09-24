import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
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
  it("keeps an independent offset for every setlist entry", () => {
    const originalChords = snapshot.songs.map(
      (song) => ({ ...song.sections[0].lines[0].chords[0] }),
    );
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

    expect(snapshot.songs.map((song) => song.sections[0].lines[0].chords[0])).toEqual(
      originalChords,
    );
    expect(originalChords).toEqual([
      { id: "chord-a", symbol: "G", position: 12 },
      { id: "chord-b", symbol: "C", position: 4 },
      { id: "chord-c", symbol: "Am", position: 8 },
    ]);
  });
});
