import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/data/db/songbook-db";
import { exportLibrary, importLibrary } from "@/data/repositories/backup";
import { settingsRepository } from "@/data/repositories/settings-repository";

describe("tutorial settings in backups", () => {
  afterEach(async () => {
    await db.transaction("rw", db.songs, db.setlists, db.settings, async () => {
      await Promise.all([db.songs.clear(), db.setlists.clear(), db.settings.clear()]);
    });
  });

  it("imports an older backup without tutorial data", async () => {
    await importLibrary(
      JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        songs: [],
        setlists: [],
        settings: [
          {
            id: "app",
            theme: "light",
            performanceFontSize: 18,
            chartFontSettings: {
              sectionScale: 130,
              chordScale: 100,
              lyricScale: 100,
              lineHeight: 1,
            },
            chartColors: {
              section: "#111111",
              chord: "#111111",
              lyric: "#111111",
            },
            darkChartColors: {
              section: "#FFFFFF",
              chord: "#93C5FD",
              lyric: "#FFFFFF",
            },
            chartLayout: "auto",
            hasSeenLandingPage: true,
          },
        ],
      }),
    );

    await expect(settingsRepository.get()).resolves.toMatchObject({
      hasSeenLandingPage: true,
      tutorialVersions: {},
    });
  });

  it("preserves tutorial versions in a round-trip", async () => {
    await settingsRepository.markTutorialSeen("library", 1);
    await settingsRepository.markTutorialSeen("performance", 1);

    const exported = await exportLibrary();
    await db.settings.clear();
    await importLibrary(exported);

    await expect(settingsRepository.get()).resolves.toMatchObject({
      tutorialVersions: { library: 1, performance: 1 },
    });
  });
});
