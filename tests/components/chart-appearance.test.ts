import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { PerformanceView } from "@/components/performance/performance-view";
import { db } from "@/data/db/songbook-db";
import type { PublishedSnapshot } from "@/lib/validation/schemas";

const snapshot: PublishedSnapshot = {
  version: 1,
  name: "Typography test",
  venue: "",
  notes: "",
  publishedAt: "2026-01-01T00:00:00.000Z",
  songs: [
    {
      entryId: "entry",
      title: "Test song",
      artist: "",
      originalKey: "G",
      performanceKey: "G",
      capo: null,
      arrangementCue: "",
      sections: [
        {
          id: "section",
          type: "verse",
          title: "Verse",
          lines: [
            {
              id: "line",
              lyrics: "Test lyrics",
              chords: [{ id: "chord", symbol: "G", position: 4 }],
            },
          ],
        },
      ],
    },
  ],
};

beforeEach(async () => {
  await db.settings.clear();
});

afterEach(async () => {
  cleanup();
  await db.settings.clear();
});

describe("chart appearance settings", () => {
  it("customizes, resets, and persists colors without resetting typography", async () => {
    const view = render(
      React.createElement(PerformanceView, { snapshot, singleSong: true }),
    );

    fireEvent.click(screen.getByLabelText("Chart font sizes"));
    expect(
      await screen.findByLabelText("Sections font scale"),
    ).toHaveTextContent("130%");
    expect(screen.getByLabelText("Chords color")).toHaveValue("#4338ca");
    expect(screen.getByLabelText("Sections color")).toHaveValue("#000000");
    expect(screen.getByLabelText("Lyrics color")).toHaveValue("#020617");

    fireEvent.click(screen.getByLabelText("Decrease section font size"));
    fireEvent.change(screen.getByLabelText("Chords color"), {
      target: { value: "#123456" },
    });
    expect(screen.getByText("G")).toHaveStyle({ color: "#123456" });

    fireEvent.click(screen.getByRole("button", { name: "Reset Colors" }));
    expect(screen.getByLabelText("Chords color")).toHaveValue("#4338ca");
    expect(screen.getByLabelText("Sections font scale")).toHaveTextContent(
      "120%",
    );

    fireEvent.change(screen.getByLabelText("Lyrics color"), {
      target: { value: "#654321" },
    });
    await waitFor(async () => {
      await expect(db.settings.get("app")).resolves.toMatchObject({
        chartColors: { lyric: "#654321" },
        chartFontSettings: { sectionScale: 120 },
      });
    });

    view.unmount();
    render(
      React.createElement(PerformanceView, { snapshot, singleSong: true }),
    );

    await waitFor(() =>
      expect(screen.getByText("Test lyrics")).toHaveStyle({ color: "#654321" }),
    );
    fireEvent.click(screen.getByLabelText("Chart font sizes"));
    expect(
      await screen.findByLabelText("Sections font scale"),
    ).toHaveTextContent("120%");
    expect(screen.getByLabelText("Lyrics color")).toHaveValue("#654321");
  });
});
