import type { Setlist } from "@/core/setlists/types";
import { db, type SongbookDatabase } from "@/data/db/songbook-db";
import { duplicateSetlist } from "@/core/setlists/operations";

export class SetlistRepository {
  constructor(private readonly database: SongbookDatabase = db) {}
  list(): Promise<Setlist[]> {
    return this.database.setlists.orderBy("updatedAt").reverse().toArray();
  }
  get(id: string): Promise<Setlist | undefined> {
    return this.database.setlists.get(id);
  }
  async save(setlist: Setlist): Promise<Setlist> {
    const saved = { ...setlist, updatedAt: new Date().toISOString() };
    await this.database.setlists.put(saved);
    return saved;
  }
  delete(id: string): Promise<void> {
    return this.database.setlists.delete(id);
  }
  async duplicate(id: string): Promise<Setlist | undefined> {
    const source = await this.get(id);
    if (!source) return undefined;
    const copy = duplicateSetlist(source);
    await this.database.setlists.add(copy);
    return copy;
  }
}
export const setlistRepository = new SetlistRepository();
