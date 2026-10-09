import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SongbookDatabase } from "@/data/db/songbook-db";
import { SettingsRepository } from "@/data/repositories/settings-repository";
import {
  DARK_CHART_COLORS,
  DEFAULT_CHART_COLORS,
} from "@/core/songs/chart-font-settings";

describe("settings theme defaults", () => {
  let database: SongbookDatabase;
  let repository: SettingsRepository;

  beforeEach(() => {
    database = new SongbookDatabase(`settings-${crypto.randomUUID()}`);
    repository = new SettingsRepository(database);
  });

  afterEach(async () => {
    await database.delete();
  });

  it("defaults new users to the light theme", async () => {
    await expect(repository.get()).resolves.toMatchObject({ theme: "light" });
  });

  it.each(["dark", "system"] as const)(
    "preserves an explicitly saved %s preference",
    async (theme) => {
      const settings = await repository.get();
      await repository.save({ ...settings, theme });
      await expect(repository.get()).resolves.toMatchObject({ theme });
    },
  );

  it("defaults and persists chart colors independently of typography", async () => {
    const settings = await repository.get();
    expect(settings.chartColors).toEqual(DEFAULT_CHART_COLORS);
    expect(settings.darkChartColors).toEqual(DARK_CHART_COLORS);
    expect(settings.chartFontSettings.sectionScale).toBe(130);

    const chartColors = { ...settings.chartColors, chord: "#123456" };
    await repository.saveChartColors(chartColors);

    await expect(repository.get()).resolves.toMatchObject({
      chartColors,
      chartFontSettings: settings.chartFontSettings,
      chartLayout: settings.chartLayout,
    });
  });

  it("persists dark chart colors without changing light chart colors", async () => {
    const settings = await repository.get();
    const darkChartColors = { ...settings.darkChartColors, chord: "#BFDBFE" };

    await repository.saveDarkChartColors(darkChartColors);

    await expect(repository.get()).resolves.toMatchObject({
      chartColors: DEFAULT_CHART_COLORS,
      darkChartColors,
    });
  });
});
