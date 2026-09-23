import type { Setlist } from "@/core/setlists/types";
import type { Song } from "@/core/songs/types";
import {
  publishedSnapshotSchema,
  type PublishedSnapshot,
} from "@/lib/validation/schemas";

export interface PublishOptions {
  includeNotes: boolean;
  includeLinks: boolean;
}

export function createPublishedSnapshot(
  setlist: Setlist,
  songs: Song[],
  options: PublishOptions,
): PublishedSnapshot {
  const songMap = new Map(songs.map((song) => [song.id, song]));
  return publishedSnapshotSchema.parse({
    version: 1,
    name: setlist.name,
    venue: setlist.venue,
    date: setlist.date,
    notes: options.includeNotes ? setlist.notes : undefined,
    songs: setlist.entries.flatMap((entry) => {
      const song = songMap.get(entry.songId);
      if (!song) return [];
      return [
        {
          entryId: entry.id,
          title: song.title,
          artist: song.artist,
          originalKey: song.originalKey,
          performanceKey: entry.performanceKey || song.originalKey,
          arrangementCue: entry.arrangementCue,
          sections: song.sections,
          links: options.includeLinks ? song.links : undefined,
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
