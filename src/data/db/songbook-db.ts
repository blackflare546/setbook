import Dexie, { type EntityTable } from "dexie";
import type { Song } from "@/core/songs/types";
import type { AppSettings, Setlist } from "@/core/setlists/types";

export class SongbookDatabase extends Dexie {
  songs!: EntityTable<Song, "id">;
  setlists!: EntityTable<Setlist, "id">;
  settings!: EntityTable<AppSettings, "id">;

  constructor(name = "musician-songbook") {
    super(name);
    this.version(1).stores({
      songs: "id, title, artist, originalKey, updatedAt, *tags",
      setlists: "id, name, date, updatedAt, publishToken",
      settings: "id",
    });
  }
}

export const db = new SongbookDatabase();
