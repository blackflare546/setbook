import type { AppSettings } from "@/core/setlists/types";
import {
  DEFAULT_CHART_FONT_SETTINGS,
  type ChartLayout,
  type ChartFontSettings,
} from "@/core/songs/chart-font-settings";
import { db, type SongbookDatabase } from "@/data/db/songbook-db";

const defaults: AppSettings = {
  id: "app",
  theme: "system",
  performanceFontSize: 18,
  chartFontSettings: DEFAULT_CHART_FONT_SETTINGS,
  chartLayout: "auto",
};

export class SettingsRepository {
  constructor(private readonly database: SongbookDatabase = db) {}
  async get(): Promise<AppSettings> {
    const stored = await this.database.settings.get("app");
    return {
      ...defaults,
      ...stored,
      chartFontSettings: {
        ...DEFAULT_CHART_FONT_SETTINGS,
        ...stored?.chartFontSettings,
      },
    };
  }
  async save(settings: AppSettings): Promise<AppSettings> {
    await this.database.settings.put(settings);
    return settings;
  }
  async saveChartFontSettings(
    chartFontSettings: ChartFontSettings,
  ): Promise<AppSettings> {
    const current = await this.get();
    return this.save({ ...current, chartFontSettings });
  }
  async saveChartLayout(chartLayout: ChartLayout): Promise<AppSettings> {
    const current = await this.get();
    return this.save({ ...current, chartLayout });
  }
}
export const settingsRepository = new SettingsRepository();
