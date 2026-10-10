"use client";

import { useEffect } from "react";
import type { DriveStep } from "driver.js";
import {
  TUTORIAL_VERSIONS,
  type TutorialId,
} from "@/core/tutorials/types";
import { settingsRepository } from "@/data/repositories/settings-repository";

const steps: Record<TutorialId, DriveStep[]> = {
  library: [
    {
      element: '[data-tour="library-header"]',
      popover: {
        title: "Your song library",
        description:
          "Every chart is kept in this browser and remains available offline.",
      },
    },
    {
      element: '[data-tour="library-actions"]',
      popover: {
        title: "Add, scan, or back up",
        description:
          "Create a chart, import one from a QR code, or move your complete library with backup and restore.",
      },
    },
    {
      element: '[data-tour="library-search"]',
      popover: {
        title: "Find songs quickly",
        description:
          "Search every saved title, artist, or tag, then switch between recent and alphabetical order.",
      },
    },
    {
      element: '[data-tour="library-collection"]',
      popover: {
        title: "Open and manage charts",
        description:
          "Open a song to perform it. Its actions let you edit, duplicate, share, or delete the chart.",
      },
    },
  ],
  "song-editor": [
    {
      element: '[data-tour="song-editor-header"]',
      popover: {
        title: "Create a song chart",
        description:
          "SetBook turns an ordinary chord sheet into a structured, editable performance chart.",
      },
    },
    {
      element: '[data-tour="song-editor-metadata"]',
      popover: {
        title: "Add the essentials",
        description:
          "Give the song a title and artist, then confirm its key and optional capo.",
      },
    },
    {
      element: '[data-tour="song-editor-paste"]',
      popover: {
        title: "Paste what you already use",
        description:
          "Chord rows, inline chords, section headings, and intentional spacing are recognized automatically.",
      },
    },
    {
      element: '[data-tour="song-editor-actions"]',
      popover: {
        title: "Review or save",
        description:
          "Review the detected structure when you want to fine-tune it, or save the chart immediately.",
      },
    },
  ],
  setlists: [
    {
      element: '[data-tour="setlists-header"]',
      popover: {
        title: "Plan your shows",
        description:
          "Setlists keep a running order, performance keys, cues, notes, and sharing in one place.",
      },
    },
    {
      element: '[data-tour="setlists-create"]',
      popover: {
        title: "Create or follow",
        description:
          "Name a new setlist or scan a bandmate's shared setlist QR code.",
      },
    },
    {
      element: '[data-tour="setlists-search"]',
      popover: {
        title: "Find a setlist",
        description:
          "Search by setlist, venue, or owner and switch the sort order whenever you need.",
      },
    },
    {
      element: '[data-tour="setlists-collection"]',
      popover: {
        title: "Your setlists and shared copies",
        description:
          "Open your own setlists to edit them. Followed setlists remain clearly marked and read-only.",
      },
    },
  ],
  "setlist-editor": [
    {
      element: '[data-tour="setlist-editor-header"]',
      popover: {
        title: "Build the set",
        description:
          "Save your changes, then open Performance View when the running order is ready.",
      },
    },
    {
      element: '[data-tour="setlist-editor-details"]',
      popover: {
        title: "Add show details",
        description:
          "Keep the setlist name, venue, and date with the songs for quick reference.",
      },
    },
    {
      element: '[data-tour="setlist-editor-order"]',
      popover: {
        title: "Shape the running order",
        description:
          "Add songs from your library, arrange them, and choose a performance key or cue for each entry.",
      },
    },
    {
      element: '[data-tour="setlist-editor-notes"]',
      popover: {
        title: "Keep band notes together",
        description:
          "Store load-in details, tuning reminders, transitions, and other notes for the whole band.",
      },
    },
    {
      element: '[data-tour="setlist-editor-share"]',
      popover: {
        title: "Share a read-only copy",
        description:
          "Publish one stable link or QR code, then update that same shared copy as the show changes.",
      },
    },
  ],
  performance: [
    {
      element: '[data-tour="performance-menu"]',
      popover: {
        title: "Performance controls",
        description:
          "Open the running order, band notes, theme, typography, colors, and chart layout.",
      },
    },
    {
      element: '[data-tour="performance-key"]',
      popover: {
        title: "Transpose for the moment",
        description:
          "Change the displayed key without altering the master song saved in your library.",
      },
    },
    {
      element: '[data-tour="performance-chart"]',
      popover: {
        title: "Your stage-ready chart",
        description:
          "The chart stays focused on lyrics, chords, sections, and any arrangement cue you added.",
      },
    },
    {
      element: '[data-tour="performance-fullscreen"]',
      popover: {
        title: "Remove distractions",
        description:
          "Use fullscreen on supported larger screens for a focused performance view.",
      },
    },
    {
      element: '[data-tour="performance-navigation"]',
      popover: {
        title: "Move through the set",
        description:
          "Use Previous and Next to follow the running order without returning to the editor.",
      },
    },
  ],
};

export function AreaTutorial({
  id,
  ready = true,
  onActiveChange,
}: {
  id: TutorialId;
  ready?: boolean;
  onActiveChange?: (active: boolean) => void;
}) {
  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    let destroy: (() => void) | undefined;

    async function start() {
      const url = new URL(window.location.href);
      const forced = url.searchParams.get("tutorial") === id;
      const version = TUTORIAL_VERSIONS[id];
      const settings = await settingsRepository.get();
      if (cancelled || (!forced && (settings.tutorialVersions[id] ?? 0) >= version)) {
        return;
      }

      if (forced) {
        url.searchParams.delete("tutorial");
        window.history.replaceState(window.history.state, "", url);
      }

      try {
        const { driver } = await import("driver.js");
        if (cancelled) return;

        const driverObject = driver({
          steps: steps[id],
          animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          smoothScroll: true,
          allowKeyboardControl: true,
          allowScroll: true,
          disableActiveInteraction: true,
          skipMissingElement: true,
          waitForElement: 750,
          showProgress: true,
          progressText: "{{current}} of {{total}}",
          nextBtnText: "Next",
          prevBtnText: "Back",
          doneBtnText: "Done",
          closeBtnLabel: "Close tutorial",
          stagePadding: 8,
          stageRadius: 12,
          popoverClass: "setbook-tutorial",
          onDestroyed: () => {
            onActiveChange?.(false);
            void settingsRepository.markTutorialSeen(id, version);
          },
        });
        destroy = () => driverObject.destroy();
        onActiveChange?.(true);
        driverObject.drive();
      } catch {
        onActiveChange?.(false);
        // Tutorials are progressive enhancement; the underlying screen must work.
      }
    }

    void start();
    return () => {
      cancelled = true;
      destroy?.();
      onActiveChange?.(false);
    };
  }, [id, onActiveChange, ready]);

  return null;
}
