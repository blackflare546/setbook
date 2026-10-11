import { db } from "@/data/db/songbook-db";
import { songSchema, setlistSchema } from "@/lib/validation/schemas";
import {
  DARK_CHART_COLORS,
  DEFAULT_CHART_COLORS,
  DEFAULT_CHART_FONT_SETTINGS,
} from "@/core/songs/chart-font-settings";
import { z } from "zod";

const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  songs: z.array(songSchema),
  setlists: z.array(setlistSchema),
  settings: z.array(
    z.object({
      id: z.literal("app"),
      theme: z.enum(["light", "dark", "system"]),
      performanceFontSize: z.number(),
      chartFontSettings: z
        .object({
          sectionScale: z.number().min(50).max(180),
          chordScale: z.number().min(50).max(200),
          lyricScale: z.number().min(50).max(200),
          lineHeight: z.number().min(1).max(2.5).default(1),
        })
        .default(DEFAULT_CHART_FONT_SETTINGS),
      chartColors: z
        .object({
          section: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
          chord: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
          lyric: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        })
        .default(DEFAULT_CHART_COLORS),
      darkChartColors: z
        .object({
          section: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
          chord: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
          lyric: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        })
        .default(DARK_CHART_COLORS),
      chartLayout: z.enum(["auto", "one", "two"]).default("auto"),
      hasSeenLandingPage: z.boolean().default(false),
      tutorialVersions: z
        .object({
          library: z.number().int().nonnegative().optional(),
          "song-editor": z.number().int().nonnegative().optional(),
          setlists: z.number().int().nonnegative().optional(),
          "setlist-editor": z.number().int().nonnegative().optional(),
          performance: z.number().int().nonnegative().optional(),
        })
        .default({}),
    }),
  ),
});

export async function exportLibrary(): Promise<string> {
  return db.transaction(
    "r",
    db.songs,
    db.setlists,
    db.settings,
    async () => {
      const songs = await db.songs.toArray();
      const songIds = new Set(songs.map((song) => song.id));
      const setlists = (await db.setlists.toArray()).map((setlist) => {
        const safe = {
          ...setlist,
          entries: setlist.entries.filter((entry) =>
            songIds.has(entry.songId),
          ),
        };
        delete safe.shareBinding;
        delete safe.publishToken;
        return safe;
      });
      return JSON.stringify(
        {
          version: 1,
          exportedAt: new Date().toISOString(),
          songs,
          setlists,
          settings: await db.settings.toArray(),
        },
        null,
        2,
      );
    },
  );
}

export interface ImportLibraryResult {
  songsAdded: number;
  songsSkipped: number;
  setlistsAdded: number;
  setlistsSkipped: number;
  settingsImported: boolean;
}

export async function importLibrary(raw: string): Promise<ImportLibraryResult> {
  const backup = backupSchema.parse(JSON.parse(raw));
  return db.transaction("rw", db.songs, db.setlists, db.settings, async () => {
    const uniqueSongs = [
      ...new Map(backup.songs.map((song) => [song.id, song])).values(),
    ];
    const localSetlists = backup.setlists.map((setlist) => {
      const local = { ...setlist };
      delete local.shareBinding;
      delete local.publishToken;
      return local;
    });
    const uniqueSetlists = [
      ...new Map(
        localSetlists.map((setlist) => [setlist.id, setlist]),
      ).values(),
    ];
    const existingSongs = new Set(
      (await db.songs.bulkGet(uniqueSongs.map((song) => song.id)))
        .filter((song) => song !== undefined)
        .map((song) => song.id),
    );
    const existingSetlists = new Set(
      (await db.setlists.bulkGet(uniqueSetlists.map((setlist) => setlist.id)))
        .filter((setlist) => setlist !== undefined)
        .map((setlist) => setlist.id),
    );
    const songsToAdd = uniqueSongs.filter(
      (song) => !existingSongs.has(song.id),
    );
    const setlistsToAdd = uniqueSetlists.filter(
      (setlist) => !existingSetlists.has(setlist.id),
    );
    const referencedSongIds = [
      ...new Set(
        setlistsToAdd.flatMap((setlist) =>
          setlist.entries.map((entry) => entry.songId),
        ),
      ),
    ];
    const existingReferencedSongIds = new Set(
      (await db.songs.bulkGet(referencedSongIds))
        .filter((song) => song !== undefined)
        .map((song) => song.id),
    );
    const availableSongIds = new Set([
      ...existingReferencedSongIds,
      ...uniqueSongs.map((song) => song.id),
    ]);
    const hasMissingSong = setlistsToAdd.some((setlist) =>
      setlist.entries.some((entry) => !availableSongIds.has(entry.songId)),
    );
    if (hasMissingSong) {
      throw new Error("Backup contains a setlist with a missing song.");
    }
    const settings = backup.settings[0];
    const settingsImported = Boolean(
      settings && !(await db.settings.get("app")),
    );

    if (songsToAdd.length) await db.songs.bulkAdd(songsToAdd);
    if (setlistsToAdd.length) await db.setlists.bulkAdd(setlistsToAdd);
    if (settingsImported && settings) await db.settings.add(settings);

    return {
      songsAdded: songsToAdd.length,
      songsSkipped: backup.songs.length - songsToAdd.length,
      setlistsAdded: setlistsToAdd.length,
      setlistsSkipped: backup.setlists.length - setlistsToAdd.length,
      settingsImported,
    };
  });
}
