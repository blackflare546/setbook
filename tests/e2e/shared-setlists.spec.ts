import { expect, test } from "./fixtures";
import QRCode from "qrcode";

const snapshot = {
  version: 2,
  name: "Team rehearsal",
  venue: "Studio A",
  date: "2026-01-10",
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

test("shows a useful recovery path when a shared link cannot load", async ({
  page,
}) => {
  await page.route("**/api/published-setlists/MissingShare", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Sharing is temporarily unavailable." }),
    }),
  );

  await page.goto("/shared/MissingShare");
  await expect(
    page.getByRole("heading", { name: "Shared setlist unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByText("Sharing is temporarily unavailable."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to setlists" }),
  ).toHaveAttribute("href", "/setlists");
});

test("opens a setlist from an uploaded QR image", async ({ page }) => {
  const createdResponse = await page.request.post("/api/published-setlists", {
    data: { snapshot },
  });
  expect(createdResponse.status()).toBe(201);
  const created = await createdResponse.json();
  const publicUrl = `http://localhost:3000/shared/${created.token}/performance`;

  await page.goto("/setlists");
  await page.getByRole("button", { name: "Scan QR" }).click();
  await page.getByLabel("Upload QR image").setInputFiles({
    name: "setlist-qr.png",
    mimeType: "image/png",
    buffer: await QRCode.toBuffer(publicUrl, {
      errorCorrectionLevel: "H",
      margin: 4,
      width: 920,
    }),
  });

  await expect(page).toHaveURL(`/shared/${created.token}`);
  await expect(
    page.getByRole("heading", { name: snapshot.name }),
  ).toBeVisible();
});

test("round-trips the decorated setlist QR image through upload", async ({
  page,
}) => {
  const setlistId = "decorated-qr-setlist";
  await page.goto("/setlists");
  await page.evaluate(async (id) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("musician-songbook");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(
          ["songs", "setlists"],
          "readwrite",
        );
        transaction.objectStore("songs").put({
          id: "decorated-qr-song",
          title: "Opening Song",
          artist: "SetBook",
          originalKey: "C",
          capo: null,
          tags: [],
          sections: [],
          notes: "",
          links: {},
          sourceText: "",
          createdAt: "2026-10-13T10:00:00.000Z",
          updatedAt: "2026-10-13T10:00:00.000Z",
        });
        transaction.objectStore("setlists").put({
          id,
          name: "Autumn Worship Night",
          venue: "Main Sanctuary",
          date: "2026-10-13",
          notes: "",
          entries: [
            {
              id: "decorated-qr-entry",
              songId: "decorated-qr-song",
              performanceKey: "C",
              arrangementCue: "",
            },
          ],
          createdAt: "2026-10-13T10:00:00.000Z",
          updatedAt: "2026-10-13T10:00:00.000Z",
        });
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
      };
    });
  }, setlistId);

  await page.goto(`/setlists/${setlistId}`);
  await page.getByRole("button", { name: "Publish setlist" }).click();
  await expect(page.getByText("Setlist shared", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "QR code" }).click();

  const qrImage = page.getByAltText(
    "Public setlist QR code for Autumn Worship Night",
  );
  await expect(qrImage).toHaveAttribute("src", /^data:image\/png/);
  await expect(qrImage).toHaveJSProperty("naturalWidth", 960);
  const dataUrl = await qrImage.getAttribute("src");
  expect(dataUrl).not.toBeNull();
  const qrBuffer = Buffer.from(dataUrl!.split(",", 2)[1], "base64");

  await page.getByRole("button", { name: "Done" }).click();
  await page.goto("/setlists");
  await page.getByRole("button", { name: "Scan QR" }).click();
  await page.getByLabel("Upload QR image").setInputFiles({
    name: "autumn-worship-night-qr.png",
    mimeType: "image/png",
    buffer: qrBuffer,
  });

  await expect(page).toHaveURL(/\/shared\/[A-Za-z0-9]+$/);
  await expect(
    page.getByRole("heading", { name: "Autumn Worship Night" }),
  ).toBeVisible();
});

test("shows an upload error instead of crashing on an image without a QR", async ({
  page,
}) => {
  await page.goto("/setlists");
  await page.getByRole("button", { name: "Scan QR" }).click();
  await page.getByLabel("Upload QR image").setInputFiles({
    name: "blank.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nVQAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(
    page.getByRole("alert").filter({
      hasText: "No readable SetBook QR code was found in that image.",
    }),
  ).toBeVisible();
});

test("shows the foreground swipe lesson in shared performance", async ({
  page,
}) => {
  const sharedSnapshot = {
    ...snapshot,
    songs: [
      snapshot.songs[0],
      {
        ...snapshot.songs[0],
        entryId: "entry-2",
        sharedSongId: "shared-song-2",
        contentHash: "hash-2",
        title: "Second Shared Song",
      },
    ],
  };
  const createdResponse = await page.request.post("/api/published-setlists", {
    data: { snapshot: sharedSnapshot },
  });
  expect(createdResponse.status()).toBe(201);
  const created = await createdResponse.json();
  await page.evaluate(() => {
    window.localStorage.removeItem(
      "setbook:performance-swipe-tutorial-seen-v1",
    );
  });

  await page.goto(`/shared/${created.token}/performance`);
  const tutorial = page.getByRole("dialog", {
    name: "Swipe across the chart",
  });
  await expect(tutorial).toBeVisible();
  await expect(
    tutorial.locator("[data-swipe-gesture-illustration]"),
  ).toBeVisible();
  await tutorial.getByRole("button", { name: "Got it" }).click();
  await expect(tutorial).toBeHidden();
});

test("uses one setlist grid and applies shared updates explicitly", async ({
  page,
}) => {
  const createdResponse = await page.request.post("/api/published-setlists", {
    data: { snapshot },
  });
  expect(createdResponse.status()).toBe(201);
  const created = await createdResponse.json();
  expect(created.url).toBe(`/shared/${created.token}/performance`);

  await page.goto(`/s/${created.token}`);
  await expect(page).toHaveURL(created.url);
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
  await expect(page.getByText("Studio A", { exact: true })).toBeVisible();
  const sharedDate = await page.evaluate(() =>
    new Date("2026-01-10T00:00:00").toLocaleDateString(),
  );
  await expect(page.getByText(sharedDate, { exact: true })).toBeVisible();
  await expect(page.getByText("C Major")).toBeVisible();
  await expect(page.getByText("Count four")).toBeVisible();
  const perform = page.getByRole("link", { name: "Perform" });
  await expect(perform).toHaveClass(/bg-indigo-600/);
  await expect(perform.locator("svg.lucide-play")).toBeVisible();
  await expect(page.getByRole("button", { name: "Update" })).toHaveCount(0);

  await page.getByRole("button", { name: /Import all 1 song/ }).click();
  const importDialog = page.getByRole("dialog", { name: "Import all songs?" });
  await expect(importDialog).toContainText(
    "This creates 1 private copy in My Library, including newer shared versions.",
  );
  await importDialog.getByRole("button", { name: "Import songs" }).click();
  await expect(page.getByRole("status")).toContainText("1 song imported");
  await expect(
    page.getByRole("button", { name: "Import Shared Song to My Library" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Import all 0 songs" }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toHaveCount(0, { timeout: 4000 });

  const revisionTwoResponse = await page.request.patch(
    `/api/published-setlists/${created.token}`,
    {
      headers: { authorization: `Bearer ${created.ownerCapability}` },
      data: {
        snapshot: {
          ...snapshot,
          name: "Updated team rehearsal",
          songs: snapshot.songs.map((song) => ({
            ...song,
            contentHash: "hash-2",
          })),
        },
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
  await expect(page.getByText("Newer shared version available")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import all 1 song" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Import all 1 song" }).click();
  await page
    .getByRole("dialog", { name: "Import all songs?" })
    .getByRole("button", { name: "Import songs" })
    .click();
  await expect(
    page.getByText("In your library", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Newer shared version available")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Import Shared Song to My Library" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Import all 0 songs" }),
  ).toBeDisabled();

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
  await expect(page.getByText("Studio A", { exact: true })).toBeVisible();
  await expect(page.getByText(sharedDate, { exact: true })).toBeVisible();
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
