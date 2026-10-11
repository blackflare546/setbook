import type { Song } from "@/core/songs/types";
import type { SetlistSongEntry } from "@/core/setlists/types";
import { sectionsToText } from "@/core/parser/parser";
import { db, type SongbookDatabase } from "@/data/db/songbook-db";

export interface SongDeletion {
  song: Song;
  removedFromSetlists: Array<{
    setlistId: string;
    entries: Array<{ index: number; entry: SetlistSongEntry }>;
  }>;
}

export class SongRepository {
  constructor(private readonly database: SongbookDatabase = db) {}

  async list(): Promise<Song[]> {
    const songs = await this.database.songs
      .orderBy("updatedAt")
      .reverse()
      .toArray();
    return songs.map(normalizeSong);
  }
  async get(id: string): Promise<Song | undefined> {
    const song = await this.database.songs.get(id);
    return song ? normalizeSong(song) : undefined;
  }
  async save(song: Song): Promise<Song> {
    const saved = {
      ...song,
      sourceText: song.sourceText || sectionsToText(song.sections),
      updatedAt: new Date().toISOString(),
    };
    await this.database.songs.put(saved);
    return saved;
  }
  async delete(id: string): Promise<SongDeletion | undefined> {
    return this.database.transaction(
      "rw",
      this.database.songs,
      this.database.setlists,
      async () => {
        const song = await this.get(id);
        if (!song) return undefined;
        const affectedSetlists = await this.database.setlists
          .filter((setlist) =>
            setlist.entries.some((entry) => entry.songId === id),
          )
          .toArray();
        const now = new Date().toISOString();
        const removedFromSetlists = affectedSetlists.map((setlist) => ({
          setlistId: setlist.id,
          entries: setlist.entries.flatMap((entry, index) =>
            entry.songId === id ? [{ index, entry }] : [],
          ),
        }));

        if (affectedSetlists.length) {
          await this.database.setlists.bulkPut(
            affectedSetlists.map((setlist) => ({
              ...setlist,
              entries: setlist.entries.filter((entry) => entry.songId !== id),
              updatedAt: now,
            })),
          );
        }
        await this.database.songs.delete(id);
        return { song, removedFromSetlists };
      },
    );
  }
  async restoreDeletion(deletion: SongDeletion): Promise<void> {
    await this.database.transaction(
      "rw",
      this.database.songs,
      this.database.setlists,
      async () => {
        if (await this.database.songs.get(deletion.song.id)) {
          throw new Error("A song with this ID already exists.");
        }
        await this.database.songs.add(deletion.song);
        const now = new Date().toISOString();
        for (const removed of deletion.removedFromSetlists) {
          const setlist = await this.database.setlists.get(removed.setlistId);
          if (!setlist) continue;
          const entries = [...setlist.entries];
          for (const { index, entry } of removed.entries.toSorted(
            (left, right) => left.index - right.index,
          )) {
            if (entries.some((candidate) => candidate.id === entry.id)) continue;
            entries.splice(Math.min(index, entries.length), 0, entry);
          }
          await this.database.setlists.put({
            ...setlist,
            entries,
            updatedAt: now,
          });
        }
      },
    );
  }
  async duplicate(id: string): Promise<Song | undefined> {
    const song = await this.get(id);
    if (!song) return undefined;
    const now = new Date().toISOString();
    const copy = {
      ...structuredClone(song),
      id: crypto.randomUUID(),
      title: `${song.title} copy`,
      createdAt: now,
      updatedAt: now,
    };
    await this.database.songs.add(copy);
    return copy;
  }
  async saveTransfer(song: Song): Promise<Song> {
    const saved = {
      ...song,
      sourceText: song.sourceText || sectionsToText(song.sections),
      updatedAt: new Date().toISOString(),
    };
    await this.database.transaction("rw", this.database.songs, async () => {
      await this.database.songs.put(saved);
    });
    return saved;
  }
}

export const songRepository = new SongRepository();

function normalizeSong(song: Song): Song {
  return {
    ...song,
    capo: song.capo ?? null,
    sourceText: song.sourceText || sectionsToText(song.sections),
  };
}
