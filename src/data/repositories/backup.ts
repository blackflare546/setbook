import { db } from "@/data/db/songbook-db";
import { songSchema, setlistSchema } from "@/lib/validation/schemas";
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
    }),
  ),
});

export async function exportLibrary(): Promise<string> {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      songs: await db.songs.toArray(),
      setlists: await db.setlists.toArray(),
      settings: await db.settings.toArray(),
    },
    null,
    2,
  );
}

export async function importLibrary(raw: string): Promise<void> {
  const backup = backupSchema.parse(JSON.parse(raw));
  await db.transaction("rw", db.songs, db.setlists, db.settings, async () => {
    await Promise.all([
      db.songs.clear(),
      db.setlists.clear(),
      db.settings.clear(),
    ]);
    await db.songs.bulkAdd(backup.songs);
    await db.setlists.bulkAdd(backup.setlists);
    await db.settings.bulkAdd(backup.settings);
  });
}
