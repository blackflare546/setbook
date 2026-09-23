import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptySong } from "@/core/songs/types";
import { SongbookDatabase } from "@/data/db/songbook-db";
import { SongRepository } from "@/data/repositories/song-repository";

describe("song capo persistence", () => {
  let database: SongbookDatabase;
  let repository: SongRepository;

  beforeEach(() => {
    database = new SongbookDatabase(`song-capo-${crypto.randomUUID()}`);
    repository = new SongRepository(database);
  });

  afterEach(async () => {
    await database.delete();
  });

  it("defaults new songs to no capo", () => {
    expect(createEmptySong().capo).toBeNull();
  });

  it.each([null, 1, 2, 12] as const)("persists capo %s", async (capo) => {
    const song = { ...createEmptySong(), title: "Capo test", capo };
    await repository.save(song);
    await expect(repository.get(song.id)).resolves.toMatchObject({ capo });
  });
});
