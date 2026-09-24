import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { PerformanceView } from "@/components/performance/performance-view";
import type { PublishedSnapshot } from "@/lib/validation/schemas";

const snapshot: PublishedSnapshot = {
  version: 1,
  name: "Test set",
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
          lines: [{ id: "line", lyrics: "Test", chords: [] }],
        },
      ],
    },
  ],
};

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(document, "fullscreenElement");
  Reflect.deleteProperty(document, "exitFullscreen");
  Reflect.deleteProperty(document.documentElement, "requestFullscreen");
});

describe("performance fullscreen control", () => {
  it("tracks enter, exit, and browser-controlled fullscreen changes", async () => {
    let fullscreenElement: Element | null = null;
    const requestFullscreen = vi.fn(async () => {
      fullscreenElement = document.documentElement;
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    const exitFullscreen = vi.fn(async () => {
      fullscreenElement = null;
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => fullscreenElement,
    });
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: requestFullscreen,
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: exitFullscreen,
    });

    render(React.createElement(PerformanceView, { snapshot }));

    const enterButton = await screen.findByRole("button", {
      name: "Enter fullscreen",
    });
    await waitFor(() => expect(enterButton).toBeEnabled());
    fireEvent.click(enterButton);
    expect(
      await screen.findByRole("button", { name: "Exit fullscreen" }),
    ).toHaveAttribute("title", "Exit Fullscreen");
    expect(requestFullscreen).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Exit fullscreen" }));
    expect(
      await screen.findByRole("button", { name: "Enter fullscreen" }),
    ).toHaveAttribute("title", "Enter Fullscreen");
    expect(exitFullscreen).toHaveBeenCalledOnce();

    fullscreenElement = document.documentElement;
    document.dispatchEvent(new Event("fullscreenchange"));
    expect(
      await screen.findByRole("button", { name: "Exit fullscreen" }),
    ).toBeInTheDocument();

    fullscreenElement = null;
    document.dispatchEvent(new Event("fullscreenchange"));
    expect(
      await screen.findByRole("button", { name: "Enter fullscreen" }),
    ).toBeInTheDocument();
  });
});
