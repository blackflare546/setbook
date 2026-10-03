import type { AppSettings } from "@/core/setlists/types";
import {
  DEFAULT_CHART_COLORS,
  DEFAULT_CHART_FONT_SETTINGS,
  type ChartColors,
  type ChartLayout,
  type ChartFontSettings,
} from "@/core/songs/chart-font-settings";
import { db, type SongbookDatabase } from "@/data/db/songbook-db";

const defaults: AppSettings = {
  id: "app",
  theme: "light",
  performanceFontSize: 18,
  chartFontSettings: DEFAULT_CHART_FONT_SETTINGS,
  chartColors: DEFAULT_CHART_COLORS,
  chartLayout: "auto",
  hasSeenLandingPage: false,
};

export class SettingsRepository {
  constructor(private readonly database: SongbookDatabase = db) {}

  private async update(
    changes: Partial<Omit<AppSettings, "id">>,
  ): Promise<AppSettings> {
    return this.database.transaction("rw", this.database.settings, async () => {
      const current = await this.get();
      return this.save({ ...current, ...changes });
    });
  }

  async get(): Promise<AppSettings> {
    const stored = await this.database.settings.get("app");
    return {
      ...defaults,
      ...stored,
      chartFontSettings: {
        ...DEFAULT_CHART_FONT_SETTINGS,
        ...stored?.chartFontSettings,
      },
      chartColors: {
        ...DEFAULT_CHART_COLORS,
        ...stored?.chartColors,
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
    return this.update({ chartFontSettings });
  }
  async saveChartLayout(chartLayout: ChartLayout): Promise<AppSettings> {
    return this.update({ chartLayout });
  }
  async saveChartColors(chartColors: ChartColors): Promise<AppSettings> {
    return this.update({ chartColors });
  }
  async saveTheme(theme: AppSettings["theme"]): Promise<AppSettings> {
    return this.update({ theme });
  }
  async markLandingPageSeen(): Promise<AppSettings> {
    return this.update({ hasSeenLandingPage: true });
  }
}
export const settingsRepository = new SettingsRepository();
