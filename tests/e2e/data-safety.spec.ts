import { expect, test } from "./fixtures";

test("rejects a backup with dangling setlist songs without partial import", async ({
  page,
}) => {
  const now = new Date().toISOString();
  await page.goto("/library");
  await page.locator('input[accept="application/json"]').setInputFiles({
    name: "broken-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        exportedAt: now,
        songs: [
          {
            id: "would-be-imported",
            title: "Should not import",
            artist: "SetBook Test",
            originalKey: "C",
            capo: null,
            tags: [],
            sections: [],
            notes: "",
            links: {},
            sourceText: "",
            createdAt: now,
            updatedAt: now,
          },
        ],
        setlists: [
          {
            id: "broken-setlist",
            name: "Broken setlist",
            venue: "",
            notes: "",
            entries: [
              {
                id: "missing-entry",
                songId: "not-in-the-backup",
                arrangementCue: "",
              },
            ],
            createdAt: now,
            updatedAt: now,
          },
        ],
        settings: [],
      }),
    ),
  });

  const dialog = page.getByRole("dialog", { name: "Import this backup?" });
  await dialog.getByRole("button", { name: "Import new items" }).click();
  await expect(
    page.getByRole("alert").filter({
      hasText: "That file is not a valid SetBook backup.",
    }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(
    page.getByRole("heading", { name: "Should not import" }),
  ).toHaveCount(0);
});
