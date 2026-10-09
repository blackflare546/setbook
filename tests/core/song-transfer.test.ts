import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseText } from "@/core/parser/parser";
import { createEmptySong } from "@/core/songs/types";
import { SongbookDatabase } from "@/data/db/songbook-db";
import { SongRepository } from "@/data/repositories/song-repository";
import {
  importSongTransfer,
  inspectSongTransfer,
} from "@/lib/song-transfer/import-song-transfer";
import {
  createSongTransfer,
  decodeSongTransfer,
  deserializeSongTransferFile,
  encodeSongTransfer,
  serializeSongTransferFile,
  songFileName,
  SongTransferError,
} from "@/lib/song-transfer/song-transfer";

const chart = `[Verse]
D/F#                 G
Dakila Ka, O Diyos

[Chorus]
Bm              A
Worthy of it all`;

function transferSong() {
  const song = createEmptySong();
  return {
    ...song,
    title: "Worthy — Dakila",
    artist: "SetBook Team",
    originalKey: "D",
    capo: 2,
    tags: ["worship", "Tagalog"],
    notes: "Lead softly into the chorus.",
    links: { audio: "https://example.com/audio" },
    sections: parseText(chart),
  };
}

describe("offline song transfer", () => {
  it("round-trips complete Unicode song data through a compressed QR payload", async () => {
    const transfer = createSongTransfer(transferSong());
    const encoded = await encodeSongTransfer(transfer);
    const decoded = await decodeSongTransfer(encoded);

    expect(encoded).toMatch(/^setbook:song:v1:[gj]:/);
    expect(decoded).toEqual(transfer);
    expect(decoded.chartText).toContain("D/F#");
    expect(decoded.chartText).toContain("Dakila Ka, O Diyos");
  });

  it("round-trips the single-song file fallback", () => {
    const transfer = createSongTransfer(transferSong());
    expect(
      deserializeSongTransferFile(serializeSongTransferFile(transfer)),
    ).toEqual(transfer);
  });

  it("keeps legacy songs with an empty chart transferable", async () => {
    const empty = { ...createSongTransfer(transferSong()), chartText: "" };
    expect(await decodeSongTransfer(await encodeSongTransfer(empty))).toEqual(
      empty,
    );
  });

  it("supports existing songs with long metadata without crashing the library", async () => {
    const longTitle = `A very long arrangement ${"extended ".repeat(35)}`;
    const transfer = createSongTransfer({
      ...transferSong(),
      title: longTitle,
      artist: "Worship team ".repeat(30),
      notes: "Arrangement note. ".repeat(2_000),
    });

    expect(transfer.title).toBe(longTitle);
    expect(
      await decodeSongTransfer(await encodeSongTransfer(transfer)),
    ).toEqual(transfer);
    expect(songFileName(longTitle).length).toBeLessThanOrEqual(99);
  });

  it("rejects invalid and newer transfer versions with actionable errors", async () => {
    await expect(
      decodeSongTransfer("not-a-setbook-code"),
    ).rejects.toMatchObject({
      code: "invalid",
    });
    await expect(
      decodeSongTransfer("setbook:song:v9:j:e30"),
    ).rejects.toMatchObject({
      code: "unsupported-version",
      message: expect.stringContaining("newer SetBook version"),
    });
    expect(() =>
      deserializeSongTransferFile(JSON.stringify({ version: 9 })),
    ).toThrow(SongTransferError);
  });
});

describe("song transfer duplicate prevention", () => {
  let database: SongbookDatabase;
  let repository: SongRepository;

  beforeEach(() => {
    database = new SongbookDatabase(`song-transfer-${crypto.randomUUID()}`);
    repository = new SongRepository(database);
  });

  afterEach(async () => {
    await database.delete();
  });

  it("serializes simultaneous imports and reuses exact content", async () => {
    const transfer = createSongTransfer(transferSong());
    const [first, second] = await Promise.all([
      importSongTransfer(transfer, "keep-both", repository),
      importSongTransfer(transfer, "keep-both", repository),
    ]);

    expect(first.status).toBe("imported");
    expect(second.status).toBe("exact-existing");
    await expect(database.songs.count()).resolves.toBe(1);
  });

  it("reports changed matching songs and replaces without breaking setlists", async () => {
    const original = await importSongTransfer(
      createSongTransfer(transferSong()),
      "keep-both",
      repository,
    );
    if (original.status !== "imported") throw new Error("Expected import");
    await database.setlists.add({
      id: "setlist",
      name: "Sunday",
      venue: "",
      notes: "",
      entries: [
        {
          id: "entry",
          songId: original.song.id,
          arrangementCue: "",
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const changed = {
      ...createSongTransfer(transferSong()),
      notes: "Updated arrangement",
    };
    await expect(
      inspectSongTransfer(changed, repository),
    ).resolves.toMatchObject({
      status: "identity-conflict",
      existing: { id: original.song.id },
    });
    const replaced = await importSongTransfer(changed, "replace", repository);

    expect(replaced).toMatchObject({
      status: "imported",
      replaced: true,
      song: { id: original.song.id, notes: "Updated arrangement" },
    });
    expect((await database.setlists.get("setlist"))?.entries[0].songId).toBe(
      original.song.id,
    );
    await expect(database.songs.count()).resolves.toBe(1);
  });

  it("keeps a changed matching song as a separate copy when requested", async () => {
    const transfer = createSongTransfer(transferSong());
    await importSongTransfer(transfer, "keep-both", repository);
    const result = await importSongTransfer(
      { ...transfer, notes: "Different local version" },
      "keep-both",
      repository,
    );

    expect(result).toMatchObject({ status: "imported", replaced: false });
    await expect(database.songs.count()).resolves.toBe(2);
  });
});
