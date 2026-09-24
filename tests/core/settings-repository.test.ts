import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SongbookDatabase } from "@/data/db/songbook-db";
import { SettingsRepository } from "@/data/repositories/settings-repository";

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
});
