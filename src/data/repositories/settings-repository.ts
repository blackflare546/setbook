import type { AppSettings } from "@/core/setlists/types";
import { db, type SongbookDatabase } from "@/data/db/songbook-db";

const defaults: AppSettings = {
  id: "app",
  theme: "system",
  performanceFontSize: 18,
};

export class SettingsRepository {
  constructor(private readonly database: SongbookDatabase = db) {}
  async get(): Promise<AppSettings> {
    return (await this.database.settings.get("app")) ?? defaults;
  }
  async save(settings: AppSettings): Promise<AppSettings> {
    await this.database.settings.put(settings);
    return settings;
  }
}
export const settingsRepository = new SettingsRepository();
