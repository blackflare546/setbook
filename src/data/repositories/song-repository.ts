import type { Song } from "@/core/songs/types";
import { db, type SongbookDatabase } from "@/data/db/songbook-db";

export class SongRepository {
  constructor(private readonly database: SongbookDatabase = db) {}

  list(): Promise<Song[]> {
    return this.database.songs.orderBy("updatedAt").reverse().toArray();
  }
  get(id: string): Promise<Song | undefined> {
    return this.database.songs.get(id);
  }
  async save(song: Song): Promise<Song> {
    const saved = { ...song, updatedAt: new Date().toISOString() };
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
