import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SongbookDatabase } from "@/data/db/songbook-db";
import { SongRepository } from "@/data/repositories/song-repository";
import { importSharedSong } from "@/lib/sharing/import-song";

const sharedSong = {
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
};

describe("shared song imports", () => {
  let database: SongbookDatabase;
  let repository: SongRepository;

  beforeEach(() => {
    database = new SongbookDatabase(`shared-import-${crypto.randomUUID()}`);
    repository = new SongRepository(database);
  });

  afterEach(async () => {
    await database.delete();
  });

  it("reuses an identical imported song", async () => {
    const first = await importSharedSong(
      "public-token",
      1,
      sharedSong,
      false,
      repository,
    );
    const second = await importSharedSong(
      "public-token",
      1,
      sharedSong,
      false,
      repository,
    );

    expect(first.existed).toBe(false);
    expect(second).toMatchObject({
      existed: true,
      song: { id: first.song.id },
    });
    await expect(database.songs.count()).resolves.toBe(1);
  });

  it("serializes simultaneous imports of the same shared version", async () => {
    const [first, second] = await Promise.all([
      importSharedSong("public-token", 1, sharedSong, false, repository),
      importSharedSong("public-token", 1, sharedSong, false, repository),
    ]);

    expect(first.song.id).toBe(second.song.id);
    await expect(database.songs.count()).resolves.toBe(1);
  });

  it("finds the current version even when an older import also exists", async () => {
    await importSharedSong(
      "public-token",
      1,
      { ...sharedSong, contentHash: "old-hash", title: "Old title" },
      false,
      repository,
    );
    const current = await importSharedSong(
      "public-token",
      2,
      sharedSong,
      false,
      repository,
    );
    const repeated = await importSharedSong(
      "public-token",
      2,
      sharedSong,
      false,
      repository,
    );

    expect(current.existed).toBe(false);
    expect(repeated).toMatchObject({
      existed: true,
      song: { id: current.song.id },
    });
    await expect(database.songs.count()).resolves.toBe(2);
  });
});
