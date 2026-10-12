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

  it("removes deleted songs from setlists and restores both on undo", async () => {
    const song = { ...createEmptySong(), title: "Referenced song" };
    await repository.save(song);
    const now = new Date().toISOString();
    await database.setlists.add({
      id: "setlist",
      name: "Sunday",
      venue: "",
      notes: "",
      entries: [
        {
          id: "before",
          songId: "another-song",
          arrangementCue: "",
        },
        { id: "referenced", songId: song.id, arrangementCue: "Cue" },
      ],
      createdAt: now,
      updatedAt: now,
    });

    const deletion = await repository.delete(song.id);
    expect(deletion).toBeDefined();
    await expect(repository.get(song.id)).resolves.toBeUndefined();
    await expect(database.setlists.get("setlist")).resolves.toMatchObject({
      entries: [{ id: "before" }],
    });

    await repository.restoreDeletion(deletion!);
    await expect(repository.get(song.id)).resolves.toMatchObject({
      title: "Referenced song",
    });
    await expect(database.setlists.get("setlist")).resolves.toMatchObject({
      entries: [{ id: "before" }, { id: "referenced", arrangementCue: "Cue" }],
    });
  });
});
