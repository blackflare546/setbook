import { expect, test } from "./fixtures";

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

test("uses one setlist grid and applies shared updates explicitly", async ({
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
  const publicHeader = page.locator("[data-auto-hide-header]");
  const publicPagination = page.locator("[data-auto-hide-pagination]");
  await expect(publicHeader).toHaveAttribute("data-visible", "true");
  await expect(publicPagination).toHaveAttribute("data-visible", "true");
  await expect(publicHeader).toHaveAttribute("data-visible", "false", {
    timeout: 2_500,
  });
  await expect(publicPagination).toHaveAttribute("data-visible", "false");
  await page
    .locator("[data-performance-chart-scroll]")
    .click({ position: { x: 30, y: 300 } });
  await expect(publicHeader).toHaveAttribute("data-visible", "true");
  await expect(publicPagination).toHaveAttribute("data-visible", "true");
  await expect(
    page.getByRole("button", { name: "Import all songs" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Open in SetBook" }).click();
  await expect(page).toHaveURL(`/shared/${created.token}`);
  await expect(page.getByText(/Shared setlist · Read only/)).toBeVisible();
  await expect(page.getByText("C Major")).toBeVisible();
  await expect(page.getByText("Count four")).toBeVisible();
  const perform = page.getByRole("link", { name: "Perform" });
  await expect(perform).toHaveClass(/bg-indigo-600/);
  await expect(perform.locator("svg.lucide-play")).toBeVisible();
  await expect(page.getByRole("button", { name: "Update" })).toHaveCount(0);

  page.on("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: /Import all 1 song/ }).click();
  await expect(page.getByRole("status")).toContainText("1 song imported");
  await expect(page.getByRole("status")).toHaveCount(0, { timeout: 4000 });

  const revisionTwoResponse = await page.request.patch(
    `/api/published-setlists/${created.token}`,
    {
      headers: { authorization: `Bearer ${created.ownerCapability}` },
      data: {
        snapshot: { ...snapshot, name: "Updated team rehearsal" },
        expectedRevision: 1,
        expectedEtag: created.etag,
      },
    },
  );
  expect(revisionTwoResponse.status()).toBe(200);
  const revisionTwo = await revisionTwoResponse.json();

  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("button", { name: "Update" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Team rehearsal" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Update" }).click();
  await expect(
    page.getByRole("heading", { name: "Updated team rehearsal" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Update" })).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(
    "Shared setlist updated. No songs were imported.",
  );

  await page.goto("/setlists");
  await expect(page.getByRole("button", { name: "My Setlists" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Shared with me" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Updated team rehearsal" }),
  ).toBeVisible();
  await expect(page.getByText("Shared", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Status: Up to date")).toHaveClass(/emerald/);
  await expect(page.getByRole("button", { name: "Scan QR" })).toBeVisible();

  const revisionThreeResponse = await page.request.patch(
    `/api/published-setlists/${created.token}`,
    {
      headers: { authorization: `Bearer ${created.ownerCapability}` },
      data: {
        snapshot: { ...snapshot, name: "Third revision" },
        expectedRevision: revisionTwo.revision,
        expectedEtag: revisionTwo.etag,
      },
    },
  );
  expect(revisionThreeResponse.status()).toBe(200);
  const revisionThree = await revisionThreeResponse.json();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByLabel("Status: Update available")).toHaveClass(
    /amber/,
  );
  await expect(page.getByRole("button", { name: "Update" })).toBeVisible();

  const unfollow = page.getByRole("button", { name: "Unfollow" });
  await expect(unfollow).toHaveClass(/text-rose-600/);
  await unfollow.click();
  const unfollowDialog = page.getByRole("dialog", {
    name: "Unfollow Updated team rehearsal?",
  });
  await expect(unfollowDialog).toContainText(
    "It does not delete the owner’s shared setlist or any songs you already imported.",
  );
  await unfollowDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(
    page.getByRole("heading", { name: "Updated team rehearsal" }),
  ).toBeVisible();
  await unfollow.click();
  await unfollowDialog.getByRole("button", { name: "Unfollow" }).click();
  await expect(
    page.getByRole("heading", { name: "Updated team rehearsal" }),
  ).toHaveCount(0);

  await page.request.delete(`/api/published-setlists/${created.token}`, {
    headers: {
      authorization: `Bearer ${created.ownerCapability}`,
      "if-match": revisionThree.etag,
    },
  });
});
