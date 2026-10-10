import { expect, test, tutorialSettings, type Page } from "./fixtures";

const layouts = [
  { name: "mobile", width: 390, height: 844, minimumPadding: 128 },
  { name: "tablet", width: 768, height: 1024, minimumPadding: 160 },
  { name: "desktop", width: 1280, height: 800, minimumPadding: 128 },
];

for (const layout of layouts) {
  test(`keeps bottom clearance in the song library on ${layout.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: layout.width,
      height: layout.height,
    });
    await page.goto("/library");

    const library = page.getByTestId("song-library");
    await expect(library).toBeVisible();
    const bottomPadding = await library.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).paddingBottom),
    );

    expect(bottomPadding).toBeGreaterThanOrEqual(layout.minimumPadding);
  });
}

async function restoreLargeCollection(page: Page) {
  const now = new Date().toISOString();
  const songs = Array.from({ length: 125 }, (_, index) => ({
    id: `song-${index + 1}`,
    title:
      index === 0
        ? `Long ${"Library title ".repeat(20)}`
        : `Library Song ${String(index + 1).padStart(3, "0")}`,
    artist: "SetBook Test",
    originalKey: "C",
    capo: null,
    tags: [],
    sections: [
      {
        id: `section-${index + 1}`,
        type: "verse",
        title: "Verse",
        lines: [
          {
            id: `line-${index + 1}`,
            lyrics: `Lyric ${index + 1}`,
            chords: [{ id: `chord-${index + 1}`, symbol: "C", position: 0 }],
          },
        ],
      },
    ],
    notes: "",
    links: {},
    sourceText: "",
    createdAt: now,
    updatedAt: new Date(Date.parse(now) - index * 1_000).toISOString(),
  }));
  const setlists = Array.from({ length: 65 }, (_, index) => ({
    id: `setlist-${index + 1}`,
    name: `Setlist ${String(index + 1).padStart(2, "0")}`,
    venue: index === 64 ? "Searchable final venue" : "Main room",
    notes: "",
    entries: [],
    createdAt: now,
    updatedAt: new Date(Date.parse(now) - index * 1_000).toISOString(),
  }));
  const restoredDialog = page.waitForEvent("dialog");
  await page.locator('input[accept="application/json"]').setInputFiles({
    name: "large-collection.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        exportedAt: now,
        songs,
        setlists,
        settings: [tutorialSettings],
      }),
    ),
  });
  await (await restoredDialog).accept();
}

test("progressively renders and searches the full song and setlist collections", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      value: undefined,
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/library");
  await restoreLargeCollection(page);

  await expect(page.getByTestId(/^song-row-/)).toHaveCount(60);
  await expect(page.getByText("Showing 60 of 125")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 120));
  await expect(page.getByRole("button", { name: "Back to top" })).toBeVisible();
  await page.getByRole("button", { name: "Back to top" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(2);
  await page.getByRole("button", { name: "Show more" }).click();
  await expect(page.getByTestId(/^song-row-/)).toHaveCount(120);
  await page.getByPlaceholder("Search title, artist, or tag…").fill("125");
  await expect(
    page.getByRole("heading", { name: "Library Song 125" }),
  ).toBeVisible();
  await expect(page.getByText("Showing 1 of 1")).toBeVisible();
  await expect(page.getByText(/^Page \d/)).toHaveCount(0);
  await page.goto("/setlists");
  await expect(page.getByTestId(/^setlist-card-/)).toHaveCount(60);
  await expect(page.getByText("Showing 60 of 65")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 120));
  const setlistBackToTop = page.getByRole("button", { name: "Back to top" });
  await expect(setlistBackToTop).toBeVisible();
  await setlistBackToTop.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(2);
  await page
    .getByPlaceholder("Search setlists, venue, or owner…")
    .fill("final venue");
  await expect(page.getByRole("heading", { name: "Setlist 65" })).toBeVisible();
  await expect(page.getByText("Showing 1 of 1")).toBeVisible();
  await expect(page.getByText(/^Page \d/)).toHaveCount(0);

  await page.goto("/setlists/setlist-1");
  await page.getByRole("button", { name: "Add song" }).click();
  await expect(page.getByRole("button", { name: /SetBook Test/ })).toHaveCount(
    60,
  );
  await page.getByLabel("Search songs").fill("125");
  await expect(
    page.getByRole("button", { name: /Library Song 125/ }),
  ).toBeVisible();
  await expect(page.getByText("Showing 1 of 1")).toBeVisible();
});
