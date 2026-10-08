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
  capo: z.number().int().min(1).max(12).nullable().default(null),
  tags: z.array(z.string()),
  sections: z.array(songSectionSchema),
  notes: z.string(),
  links: z.object({ audio: z.url().optional(), reference: z.url().optional() }),
  sourceText: z.string().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
  sharedSource: z
    .object({
      publicToken: z.string(),
      sharedSongId: z.string(),
      importedRevision: z.number().int().positive(),
      contentHash: z.string(),
    })
    .optional(),
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
  shareBinding: z
    .object({
      publicToken: z.string(),
      ownerCapability: z.string(),
      editorCapability: z.string().optional(),
      revision: z.number().int().positive(),
      etag: z.string(),
      accessMode: z.enum(["view", "editable"]),
      sharedBy: z.string().optional(),
      includeNotes: z.boolean().default(false),
      includeLinks: z.boolean().default(false),
    })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const publishedSongSchema = z.object({
  entryId: z.string(),
  sharedSongId: z.string().optional(),
  contentHash: z.string().optional(),
  title: z.string(),
  artist: z.string(),
  originalKey: z.string(),
  capo: z.number().int().min(1).max(12).nullable().default(null),
  performanceKey: z.string(),
  arrangementCue: z.string(),
  sections: z.array(songSectionSchema),
  links: z
    .object({ audio: z.string().optional(), reference: z.string().optional() })
    .optional(),
});
export const legacyPublishedSnapshotSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1),
  venue: z.string(),
  date: z.string().optional(),
  notes: z.string().optional(),
  songs: z.array(publishedSongSchema),
  publishedAt: z.string(),
});
export const publishedSnapshotV2Schema = z.object({
  version: z.literal(2),
  name: z.string().min(1),
  venue: z.string(),
  date: z.string().optional(),
  notes: z.string().optional(),
  sharedBy: z.string().max(80).optional(),
  songs: z.array(
    publishedSongSchema.extend({
      sharedSongId: z.string().min(1),
      contentHash: z.string().min(1),
    }),
  ),
  publishedAt: z.string(),
});
export const publishedSnapshotSchema = z.discriminatedUnion("version", [
  legacyPublishedSnapshotSchema,
  publishedSnapshotV2Schema,
]);
export type PublishedSnapshot = z.infer<typeof publishedSnapshotSchema>;
export type PublishedSnapshotV2 = z.infer<typeof publishedSnapshotV2Schema>;

export const sharedAccessModeSchema = z.enum(["view", "editable"]);
export const sharedSetlistRecordSchema = z.object({
  schemaVersion: z.literal(2),
  publicToken: z.string(),
  revision: z.number().int().positive(),
  accessMode: sharedAccessModeSchema,
  snapshot: publishedSnapshotV2Schema,
  ownerVerifier: z.string(),
  editorVerifier: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SharedSetlistRecord = z.infer<typeof sharedSetlistRecordSchema>;
