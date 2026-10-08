import { expect, test } from "@playwright/test";

const snapshot = {
  version: 2,
  name: "Collaborative rehearsal",
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

test("follows, imports, edits, and protects a shared setlist", async ({
  page,
}) => {
  const createdResponse = await page.request.post("/api/published-setlists", {
    data: { snapshot, accessMode: "editable" },
  });
  expect(createdResponse.status()).toBe(201);
  const created = await createdResponse.json();

  await page.goto(created.url);
  await expect(page.getByRole("link", { name: "Open in SetBook" })).toBeVisible();
  await page.getByRole("link", { name: "Open in SetBook" }).click();
  await expect(page).toHaveURL(`/shared/${created.token}`);
  await expect(page.getByText(/Shared setlist · viewer/)).toBeVisible();
  await page.getByRole("button", { name: "Import all" }).click();
  await expect(page.getByRole("status")).toContainText("1 song imported");

  await page.goto("/setlists");
  await page.getByRole("button", { name: "Shared with me" }).click();
  await expect(
    page.getByRole("heading", { name: "Collaborative rehearsal" }),
  ).toBeVisible();

  await page.goto(`/shared/${created.token}#editor=${created.editorCapability}`);
  await expect(page.getByText(/Shared setlist · editor/)).toBeVisible();
  await page.getByLabel("Setlist name").fill("Updated rehearsal");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().endsWith(`/api/published-setlists/${created.token}`),
    ),
    page.getByRole("button", { name: "Save changes" }).click(),
  ]);
  await expect(page.getByText("Shared setlist updated")).toBeVisible();
  await expect(page.getByText("Stop Sharing")).toHaveCount(0);

  const latest = await page.request.get(
    `/api/published-setlists/${created.token}`,
  );
  expect((await latest.json()).name).toBe("Updated rehearsal");
  await page.request.delete(`/api/published-setlists/${created.token}`, {
    headers: {
      authorization: `Bearer ${created.ownerCapability}`,
      "if-match": latest.headers()["etag"],
    },
  });
});
