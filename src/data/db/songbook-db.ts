import Dexie, { type EntityTable } from "dexie";
import type { Song } from "@/core/songs/types";
import type {
  AppSettings,
  FollowedSharedSetlist,
  Setlist,
} from "@/core/setlists/types";

export class SongbookDatabase extends Dexie {
  songs!: EntityTable<Song, "id">;
  setlists!: EntityTable<Setlist, "id">;
  settings!: EntityTable<AppSettings, "id">;
  sharedSetlists!: EntityTable<FollowedSharedSetlist, "publicToken">;

  constructor(name = "musician-songbook") {
    super(name);
    this.version(1).stores({
      songs: "id, title, artist, originalKey, updatedAt, *tags",
      setlists: "id, name, date, updatedAt, publishToken",
      settings: "id",
    });
    this.version(2).stores({
      songs:
        "id, title, artist, originalKey, updatedAt, *tags, [sharedSource.publicToken+sharedSource.sharedSongId]",
      setlists: "id, name, date, updatedAt, publishToken, shareBinding.publicToken",
      settings: "id",
      sharedSetlists: "publicToken, status, lastCheckedAt, role",
    });
  }
}

export const db = new SongbookDatabase();
