import type { Song } from "@/core/songs/types";
import { sectionsToText } from "@/core/parser/parser";
import { db, type SongbookDatabase } from "@/data/db/songbook-db";

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
  delete(id: string): Promise<void> {
    return this.database.songs.delete(id);
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
}

export const songRepository = new SongRepository();

function normalizeSong(song: Song): Song {
  return {
    ...song,
    capo: song.capo ?? null,
    sourceText: song.sourceText || sectionsToText(song.sections),
  };
}
