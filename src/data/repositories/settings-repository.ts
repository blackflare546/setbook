import type { AppSettings } from "@/core/setlists/types";
import {
  DARK_CHART_COLORS,
  DEFAULT_CHART_COLORS,
  DEFAULT_CHART_FONT_SETTINGS,
  type ChartColors,
  type ChartLayout,
  type ChartFontSettings,
} from "@/core/songs/chart-font-settings";
import { db, type SongbookDatabase } from "@/data/db/songbook-db";
import type { TutorialId } from "@/core/tutorials/types";

const defaults: AppSettings = {
  id: "app",
  theme: "light",
  performanceFontSize: 18,
  chartFontSettings: DEFAULT_CHART_FONT_SETTINGS,
  chartColors: DEFAULT_CHART_COLORS,
  darkChartColors: DARK_CHART_COLORS,
  chartLayout: "auto",
  hasSeenLandingPage: false,
  tutorialVersions: {},
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
      darkChartColors: {
        ...DARK_CHART_COLORS,
        ...stored?.darkChartColors,
      },
      tutorialVersions: { ...stored?.tutorialVersions },
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
  async saveDarkChartColors(
    darkChartColors: ChartColors,
  ): Promise<AppSettings> {
    return this.update({ darkChartColors });
  }
  async saveTheme(theme: AppSettings["theme"]): Promise<AppSettings> {
    return this.update({ theme });
  }
  async markLandingPageSeen(): Promise<AppSettings> {
    return this.update({ hasSeenLandingPage: true });
  }
  async markTutorialSeen(
    tutorialId: TutorialId,
    version: number,
  ): Promise<AppSettings> {
    const current = await this.get();
    return this.update({
      tutorialVersions: {
        ...current.tutorialVersions,
        [tutorialId]: version,
      },
    });
  }
  async resetTutorial(tutorialId: TutorialId): Promise<AppSettings> {
    const current = await this.get();
    const tutorialVersions = { ...current.tutorialVersions };
    delete tutorialVersions[tutorialId];
    return this.update({ tutorialVersions });
  }
  async resetAllTutorials(): Promise<AppSettings> {
    return this.update({ tutorialVersions: {} });
  }
}
export const settingsRepository = new SettingsRepository();
