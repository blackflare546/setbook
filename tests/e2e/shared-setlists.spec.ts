import { expect, test } from "@playwright/test";

const snapshot = {
  version: 2,
  name: "Team rehearsal",
  venue: "Studio A",
  notes: "Bring in-ears",
  sharedBy: "The Test Band",
  songs: [
    {
      entryId: "entry-1",
      sharedSongId: "shared-song-1",
      contentHash: "hash-1",
      title: "Shared Song",
      artist: "Test Artist",
      originalKey: "C",
      capo: null,
      performanceKey: "C",
      arrangementCue: "Count four",
      sections: [],
    },
  ],
  publishedAt: "2026-01-01T00:00:00.000Z",
};

test("follows, refreshes, and explicitly imports a read-only shared setlist", async ({
  page,
}) => {
  const createdResponse = await page.request.post("/api/published-setlists", {
    data: { snapshot },
  });
  expect(createdResponse.status()).toBe(201);
  const created = await createdResponse.json();

  await page.goto(created.url);
  await expect(
    page.getByRole("link", { name: "Open in SetBook" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import all songs" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Open in SetBook" }).click();
  await expect(page).toHaveURL(`/shared/${created.token}`);
  await expect(page.getByText(/Shared setlist · Read only/)).toBeVisible();

  await page.getByRole("button", { name: "Refresh" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Shared setlist refreshed. No songs were imported.",
  );

  page.on("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: /Import all 1 song/ }).click();
  await expect(page.getByRole("status")).toContainText("1 song imported");

  await page.goto("/setlists");
  await page.getByRole("button", { name: "Shared with me" }).click();
  await expect(
    page.getByRole("heading", { name: "Team rehearsal" }),
  ).toBeVisible();
  await expect(page.getByLabel("Status: Up to date")).toHaveClass(/emerald/);
  await expect(page.getByRole("button", { name: "Scan QR" })).toBeVisible();

  await page.request.delete(`/api/published-setlists/${created.token}`, {
    headers: {
      authorization: `Bearer ${created.ownerCapability}`,
      "if-match": created.etag,
    },
  });
});
