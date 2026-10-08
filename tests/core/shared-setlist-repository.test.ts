import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SongbookDatabase } from "@/data/db/songbook-db";
import { SharedSetlistRepository } from "@/data/repositories/shared-setlist-repository";
import { createEmptySong } from "@/core/songs/types";

const snapshot = {
  version: 2 as const,
  name: "Team setlist",
  venue: "Studio",
  songs: [
    {
      entryId: "entry-1",
      sharedSongId: "shared-song-1",
      contentHash: "hash-1",
      title: "Shared Song",
      artist: "Artist",
      originalKey: "C",
      capo: null,
      performanceKey: "C",
      arrangementCue: "",
      sections: [],
    },
  ],
  publishedAt: "2026-01-01T00:00:00.000Z",
};

describe("shared setlist refresh", () => {
  let database: SongbookDatabase;
  let repository: SharedSetlistRepository;

  beforeEach(() => {
    database = new SongbookDatabase(`shared-refresh-${crypto.randomUUID()}`);
    repository = new SharedSetlistRepository(database);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await database.delete();
  });

  it("updates only the followed snapshot and never imports private songs", async () => {
    const privateSong = {
      ...createEmptySong(),
      id: "private-song",
      title: "Private",
    };
    await database.songs.add(privateSong);
    await repository.follow("abc123", {
      snapshot,
      revision: 1,
      etag: '"one"',
      updatedAt: snapshot.publishedAt,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...snapshot,
            name: "Updated team setlist",
            revision: 2,
            updatedAt: "2026-01-02T00:00:00.000Z",
          }),
          { status: 200, headers: { etag: '"two"' } },
        ),
      ),
    );

    const songsBefore = await database.songs.toArray();
    const refreshed = await repository.refresh("abc123");
    const songsAfter = await database.songs.toArray();

    expect(refreshed.revision).toBe(2);
    expect(refreshed.snapshot.name).toBe("Updated team setlist");
    expect(songsAfter).toEqual(songsBefore);
  });
});
