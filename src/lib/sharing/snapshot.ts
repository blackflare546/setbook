import type { Setlist } from "@/core/setlists/types";
import type { Song } from "@/core/songs/types";
import {
  publishedSnapshotSchema,
  publishedSnapshotV2Schema,
  type PublishedSnapshot,
  type PublishedSnapshotV2,
} from "@/lib/validation/schemas";

export interface PublishOptions {
  includeNotes: boolean;
  includeLinks: boolean;
  sharedBy?: string;
}

export function sharedSongContentHash(value: unknown): string {
  const input = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function createPublishedSnapshot(
  setlist: Setlist,
  songs: Song[],
  options: PublishOptions,
): PublishedSnapshotV2 {
  const songMap = new Map(songs.map((song) => [song.id, song]));
  return publishedSnapshotV2Schema.parse({
    version: 2,
    name: setlist.name,
    venue: setlist.venue,
    date: setlist.date,
    notes: options.includeNotes ? setlist.notes : undefined,
    sharedBy: options.sharedBy?.trim() || undefined,
    songs: setlist.entries.flatMap((entry) => {
      const song = songMap.get(entry.songId);
      if (!song) return [];
      return [
        {
          entryId: entry.id,
          sharedSongId: song.id,
          title: song.title,
          artist: song.artist,
          originalKey: song.originalKey,
          capo: song.capo,
          performanceKey: entry.performanceKey || song.originalKey,
          arrangementCue: entry.arrangementCue,
          sections: song.sections,
          links: options.includeLinks ? song.links : undefined,
          contentHash: sharedSongContentHash({
            title: song.title,
            artist: song.artist,
            originalKey: song.originalKey,
            capo: song.capo,
            sections: song.sections,
            links: options.includeLinks ? song.links : undefined,
          }),
        },
      ];
    }),
    publishedAt: new Date().toISOString(),
  });
}

export function serializeSnapshot(snapshot: PublishedSnapshot): string {
  return JSON.stringify(publishedSnapshotSchema.parse(snapshot));
}

export function deserializeSnapshot(value: string): PublishedSnapshot {
  return publishedSnapshotSchema.parse(JSON.parse(value));
}
