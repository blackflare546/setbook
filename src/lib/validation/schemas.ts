import { z } from "zod";

export const chordSchema = z.object({
  id: z.string(),
  symbol: z.string().min(1),
  position: z.number().int().nonnegative(),
});
export const songLineSchema = z.object({
  id: z.string(),
  lyrics: z.string(),
  chords: z.array(chordSchema),
});
export const songSectionSchema = z.object({
  id: z.string(),
  type: z.enum([
    "intro",
    "verse",
    "pre-chorus",
    "chorus",
    "bridge",
    "instrumental",
    "outro",
    "other",
  ]),
  title: z.string().min(1),
  lines: z.array(songLineSchema),
});
export const songSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  artist: z.string(),
  originalKey: z.string(),
  tags: z.array(z.string()),
  sections: z.array(songSectionSchema),
  notes: z.string(),
  links: z.object({ audio: z.url().optional(), reference: z.url().optional() }),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const setlistEntrySchema = z.object({
  id: z.string(),
  songId: z.string(),
  performanceKey: z.string().optional(),
  arrangementCue: z.string(),
});
export const setlistSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  venue: z.string(),
  date: z.string().optional(),
  notes: z.string(),
  entries: z.array(setlistEntrySchema),
  publishToken: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const publishedSongSchema = z.object({
  entryId: z.string(),
  title: z.string(),
  artist: z.string(),
  originalKey: z.string(),
  performanceKey: z.string(),
  arrangementCue: z.string(),
  sections: z.array(songSectionSchema),
  links: z
    .object({ audio: z.string().optional(), reference: z.string().optional() })
    .optional(),
});
export const publishedSnapshotSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1),
  venue: z.string(),
  date: z.string().optional(),
  notes: z.string().optional(),
  songs: z.array(publishedSongSchema),
  publishedAt: z.string(),
});
export type PublishedSnapshot = z.infer<typeof publishedSnapshotSchema>;
