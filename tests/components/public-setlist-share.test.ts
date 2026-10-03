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
import { createPublicShareLinks } from "@/components/performance/public-setlist-share";
import type { PublishedSnapshot } from "@/lib/validation/schemas";

const snapshot: PublishedSnapshot = {
  version: 1,
  name: "Sunday Set",
  venue: "Public venue",
  notes: "Do not include these notes in share content",
  publishedAt: "2026-01-01T00:00:00.000Z",
  songs: [
    {
      entryId: "entry",
      title: "Public Song",
      artist: "Public Artist",
      originalKey: "G",
      performanceKey: "G",
      capo: null,
      arrangementCue: "Public cue",
      sections: [
        {
          id: "section",
          type: "verse",
          title: "Verse",
          lines: [{ id: "line", lyrics: "Public lyrics", chords: [] }],
        },
      ],
    },
  ],
};

function setPublicUrl() {
  window.history.replaceState({}, "", "/s/public-token?view=1");
  return window.location.href;
}

function removeNativeShare() {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: undefined,
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "clipboard");
  Reflect.deleteProperty(document, "execCommand");
  window.history.replaceState({}, "", "/");
});

describe("public setlist sharing", () => {
  it("uses the native share sheet with only the public title and current URL", async () => {
    const url = setPublicUrl();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });

    render(
      React.createElement(PerformanceView, { snapshot, publicMode: true }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Share public setlist" }),
    );

    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        title: "Sunday Set",
        text: "Check out this setlist",
        url,
      }),
    );
    expect(JSON.stringify(share.mock.calls)).not.toContain(snapshot.notes);
    expect(screen.queryByRole("menuitem", { name: "Copy Link" })).toBeNull();
  });

  it("shows the fallback only on public views and copies the current URL", async () => {
    const url = setPublicUrl();
    removeNativeShare();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const view = render(
      React.createElement(PerformanceView, { snapshot, publicMode: true }),
    );
    const shareButton = screen.getByRole("button", {
      name: "Share public setlist",
    });
    expect(shareButton).toHaveClass("h-11");
    fireEvent.click(shareButton);

    expect(screen.getByRole("menuitem", { name: "Facebook" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Messenger" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "WhatsApp" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Email" })).toBeVisible();
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy Link" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(url));
    expect(await screen.findByText("Link copied")).toBeVisible();

    view.unmount();
    render(React.createElement(PerformanceView, { snapshot }));
    expect(
      screen.queryByRole("button", { name: "Share public setlist" }),
    ).toBeNull();
  });

  it("opens each social fallback with the public URL", () => {
    const url = setPublicUrl();
    removeNativeShare();
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(
      React.createElement(PerformanceView, { snapshot, publicMode: true }),
    );
    const links = createPublicShareLinks(snapshot.name, url);

    for (const [label, target] of [
      ["Facebook", links.facebook],
      ["Messenger", links.messenger],
      ["WhatsApp", links.whatsapp],
      ["Email", links.email],
    ] as const) {
      fireEvent.click(
        screen.getByRole("button", { name: "Share public setlist" }),
      );
      fireEvent.click(screen.getByRole("menuitem", { name: label }));
      expect(open).toHaveBeenLastCalledWith(
        target,
        "_blank",
        "noopener,noreferrer",
      );
    }
  });

  it("uses the legacy copy fallback and never reports a failed copy as successful", async () => {
    setPublicUrl();
    removeNativeShare();
    const execCommand = vi.fn().mockReturnValue(false);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });
    render(
      React.createElement(PerformanceView, { snapshot, publicMode: true }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Share public setlist" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy Link" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Unable to copy link",
    );
    expect(screen.queryByText("Link copied")).toBeNull();
    expect(execCommand).toHaveBeenCalledWith("copy");
  });
});
