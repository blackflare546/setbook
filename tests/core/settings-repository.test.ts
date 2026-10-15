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

  it("defaults and persists Nashville display preferences", async () => {
    await expect(repository.get()).resolves.toMatchObject({
      chartNotation: "chords",
      nashvilleMinorMode: "relative-major",
    });

    await repository.saveChartNotation("nashville");
    await repository.saveNashvilleMinorMode("tonic-one");

    await expect(repository.get()).resolves.toMatchObject({
      chartNotation: "nashville",
      nashvilleMinorMode: "tonic-one",
    });
  });

  it("defaults tutorial versions and updates them without changing other settings", async () => {
    await expect(repository.get()).resolves.toMatchObject({
      tutorialVersions: {},
      theme: "light",
    });

    await repository.markTutorialSeen("library", 1);
    await repository.markTutorialSeen("performance", 2);

    await expect(repository.get()).resolves.toMatchObject({
      tutorialVersions: { library: 1, performance: 2 },
      theme: "light",
    });
  });

  it("preserves concurrent tutorial updates", async () => {
    await Promise.all([
      repository.markTutorialSeen("library", 1),
      repository.markTutorialSeen("performance", 2),
      repository.markTutorialSeen("setlists", 1),
    ]);

    await expect(repository.get()).resolves.toMatchObject({
      tutorialVersions: { library: 1, performance: 2, setlists: 1 },
    });
  });

  it("keeps landing, tutorial, and PWA settings isolated during concurrent updates", async () => {
    const snoozedUntil = new Date("2026-11-12T12:00:00.000Z");

    await Promise.all([
      repository.markLandingPageSeen(),
      repository.markTutorialSeen("library", 1),
      repository.snoozeInstallPrompt(snoozedUntil),
    ]);
    await repository.markLandingPageSeen();

    await expect(repository.get()).resolves.toMatchObject({
      hasSeenLandingPage: true,
      tutorialVersions: { library: 1 },
      installPromptSnoozedUntil: snoozedUntil.toISOString(),
    });
  });

  it("resets one tutorial or all tutorials", async () => {
    await repository.markTutorialSeen("library", 1);
    await repository.markTutorialSeen("setlists", 1);

    await repository.resetTutorial("library");
    await expect(repository.get()).resolves.toMatchObject({
      tutorialVersions: { setlists: 1 },
    });

    await repository.resetAllTutorials();
    await expect(repository.get()).resolves.toMatchObject({
      tutorialVersions: {},
    });
  });

  it("persists PWA prompt and backup reminder timestamps without losing settings", async () => {
    const installSnooze = new Date("2026-10-26T12:00:00.000Z");
    const backupSeen = new Date("2026-10-12T12:00:00.000Z");

    await repository.snoozeInstallPrompt(installSnooze);
    await repository.markBackupReminderSeen(backupSeen);

    await expect(repository.get()).resolves.toMatchObject({
      theme: "light",
      installPromptSnoozedUntil: installSnooze.toISOString(),
      lastBackupReminderAt: backupSeen.toISOString(),
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
