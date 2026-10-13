import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/data/db/songbook-db";
import { exportLibrary, importLibrary } from "@/data/repositories/backup";
import { settingsRepository } from "@/data/repositories/settings-repository";
import { createEmptySong } from "@/core/songs/types";

describe("tutorial settings in backups", () => {
  afterEach(async () => {
    await db.transaction("rw", db.songs, db.setlists, db.settings, async () => {
      await Promise.all([
        db.songs.clear(),
        db.setlists.clear(),
        db.settings.clear(),
      ]);
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

  it("adds new records while skipping duplicate IDs and existing settings", async () => {
    const existingSong = {
      ...createEmptySong(),
      id: "existing-song",
      title: "Current song",
    };
    const newSong = {
      ...createEmptySong(),
      id: "new-song",
      title: "New song",
    };
    const now = new Date().toISOString();
    const existingSetlist = {
      id: "existing-setlist",
      name: "Current setlist",
      venue: "",
      notes: "",
      entries: [],
      createdAt: now,
      updatedAt: now,
    };
    const newSetlist = {
      ...existingSetlist,
      id: "new-setlist",
      name: "New setlist",
    };
    const currentSettings = await settingsRepository.get();

    await db.songs.add(existingSong);
    await db.setlists.add(existingSetlist);
    await settingsRepository.save(currentSettings);

    const result = await importLibrary(
      JSON.stringify({
        version: 1,
        exportedAt: now,
        songs: [{ ...existingSong, title: "Backup version" }, newSong, newSong],
        setlists: [
          { ...existingSetlist, name: "Backup version" },
          newSetlist,
          newSetlist,
        ],
        settings: [{ ...currentSettings, theme: "dark" }],
      }),
    );

    expect(result).toEqual({
      songsAdded: 1,
      songsSkipped: 2,
      setlistsAdded: 1,
      setlistsSkipped: 2,
      settingsImported: false,
    });
    await expect(db.songs.get("existing-song")).resolves.toMatchObject({
      title: "Current song",
    });
    await expect(db.songs.get("new-song")).resolves.toMatchObject({
      title: "New song",
    });
    await expect(db.setlists.get("existing-setlist")).resolves.toMatchObject({
      name: "Current setlist",
    });
    await expect(db.setlists.get("new-setlist")).resolves.toMatchObject({
      name: "New setlist",
    });
    await expect(settingsRepository.get()).resolves.toMatchObject({
      theme: "light",
      lastBackupReminderAt: expect.any(String),
    });
  });

  it("starts a new backup reminder cooldown after a successful import", async () => {
    const beforeImport = Date.now();

    await importLibrary(
      JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        songs: [],
        setlists: [],
        settings: [],
      }),
    );

    const { lastBackupReminderAt } = await settingsRepository.get();
    expect(Date.parse(lastBackupReminderAt ?? "")).toBeGreaterThanOrEqual(
      beforeImport,
    );
  });

  it("rejects dangling setlist entries without partially importing data", async () => {
    const song = { ...createEmptySong(), id: "valid-song", title: "Valid" };
    const now = new Date().toISOString();

    await expect(
      importLibrary(
        JSON.stringify({
          version: 1,
          exportedAt: now,
          songs: [song],
          setlists: [
            {
              id: "broken-setlist",
              name: "Broken",
              venue: "",
              notes: "",
              entries: [
                { id: "missing", songId: "missing-song", arrangementCue: "" },
              ],
              createdAt: now,
              updatedAt: now,
            },
          ],
          settings: [],
        }),
      ),
    ).rejects.toThrow("missing song");
    await expect(db.songs.count()).resolves.toBe(0);
    await expect(db.setlists.count()).resolves.toBe(0);
    await expect(db.settings.count()).resolves.toBe(0);
  });

  it("strips publishing credentials when importing a backup", async () => {
    const now = new Date().toISOString();
    const result = await importLibrary(
      JSON.stringify({
        version: 1,
        exportedAt: now,
        songs: [],
        setlists: [
          {
            id: "published-setlist",
            name: "Imported",
            venue: "",
            notes: "",
            entries: [],
            publishToken: "legacy-token",
            shareBinding: {
              publicToken: "public-token",
              ownerCapability: "secret-owner-capability",
              revision: 1,
              etag: "etag",
            },
            createdAt: now,
            updatedAt: now,
          },
        ],
        settings: [],
      }),
    );

    expect(result.setlistsAdded).toBe(1);
    await expect(db.setlists.get("published-setlist")).resolves.toEqual(
      expect.not.objectContaining({
        publishToken: expect.anything(),
        shareBinding: expect.anything(),
      }),
    );
  });

  it("accepts a partial backup that references a song already on the device", async () => {
    const song = { ...createEmptySong(), id: "local-song", title: "Local" };
    const now = new Date().toISOString();
    await db.songs.add(song);

    await expect(
      importLibrary(
        JSON.stringify({
          version: 1,
          exportedAt: now,
          songs: [],
          setlists: [
            {
              id: "partial-setlist",
              name: "Partial",
              venue: "",
              notes: "",
              entries: [
                { id: "local-entry", songId: song.id, arrangementCue: "" },
              ],
              createdAt: now,
              updatedAt: now,
            },
          ],
          settings: [],
        }),
      ),
    ).resolves.toMatchObject({ setlistsAdded: 1 });
  });
});
