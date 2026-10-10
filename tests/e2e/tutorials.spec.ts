import { expect, test } from "@playwright/test";

test("shows the Library tutorial once, supports keyboard navigation, and replays on demand", async ({
  page,
}) => {
  await page.goto("/library");

  const popover = page.locator(".driver-popover");
  await expect(popover).toBeVisible();
  await expect(popover.getByText("Your song library")).toBeVisible();
  await expect(popover.getByText("1 of 4")).toBeVisible();

  const nextButton = popover.getByRole("button", { name: "Next" });
  await nextButton.focus();
  await page.keyboard.press("Enter");
  await expect(popover.getByText("Add, scan, or back up")).toBeVisible();
  await expect(popover.getByText("2 of 4")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();

  await page.reload();
  await expect(popover).toBeHidden();

  await page.goto("/library?tutorial=library");
  await expect(page).toHaveURL(/\/library$/);
  await expect(popover.getByText("Your song library")).toBeVisible();

  await popover.getByRole("button", { name: "Next" }).click();
  await popover.getByRole("button", { name: "Next" }).click();
  await popover.getByRole("button", { name: "Next" }).click();
  await popover.getByRole("button", { name: "Done" }).click();
  await expect(popover).toBeHidden();
});

test("launches tutorials from Help and explains unavailable prerequisites", async ({
  page,
}) => {
  await page.goto("/help");

  const performanceCard = page
    .getByRole("heading", { name: "Performance View" })
    .locator("xpath=ancestor::div[contains(@class, 'rounded-2xl')]");
  await expect(
    performanceCard.getByText("Add at least one song to a setlist"),
  ).toBeVisible();
  await expect(
    performanceCard.getByRole("button", { name: "Start tutorial" }),
  ).toBeDisabled();

  const libraryCard = page
    .getByRole("heading", { name: "Song Library" })
    .locator("xpath=ancestor::div[contains(@class, 'rounded-2xl')]");
  await libraryCard.getByRole("button", { name: "Start tutorial" }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.locator(".driver-popover")).toContainText(
    "Your song library",
  );
});

test("uses dark styling and disables tour animation for reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/about");
  await page.getByLabel("Theme").selectOption("dark");
  await page.goto("/library");

  const popover = page.locator(".driver-popover");
  await expect(popover).toBeVisible();
  await expect(popover).toHaveCSS("background-color", "rgb(26, 31, 38)");
  await expect
    .poll(() =>
      popover.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).transitionDuration),
      ),
    )
    .toBeLessThanOrEqual(0.00001);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    )
    .toBe(true);
});

test("starts each contextual tutorial when its area becomes ready", async ({
  page,
}) => {
  await page.goto("/songs/new");
  const songTutorial = page.locator(".driver-popover");
  await expect(songTutorial).toContainText("Create a song chart");
  await songTutorial.getByRole("button", { name: "Next" }).click();
  await expect(songTutorial).toContainText("Add the essentials");
  await expect(songTutorial).toContainText("title and artist");
  await songTutorial.getByRole("button", { name: "Next" }).click();
  await expect(songTutorial).toContainText("Automatic key detection");
  await expect(songTutorial).toContainText("suggests the song's likely key");
  await page.keyboard.press("Escape");

  await page.goto("/library");
  await expect(page.locator(".driver-popover")).toBeVisible();
  await page.keyboard.press("Escape");

  const now = new Date().toISOString();
  const restoredDialog = page.waitForEvent("dialog");
  await page.locator('input[accept="application/json"]').setInputFiles({
    name: "tutorial-data.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        exportedAt: now,
        songs: [
          {
            id: "tutorial-song",
            title: "Tutorial Song",
            artist: "SetBook",
            originalKey: "C",
            capo: null,
            tags: [],
            sections: [
              {
                id: "tutorial-section",
                type: "verse",
                title: "Verse",
                lines: [
                  {
                    id: "tutorial-line",
                    lyrics: "A tutorial lyric",
                    chords: [
                      {
                        id: "tutorial-chord",
                        symbol: "C",
                        position: 0,
                      },
                    ],
                  },
                ],
              },
            ],
            notes: "",
            links: {},
            sourceText: "[Verse]\nC\nA tutorial lyric",
            createdAt: now,
            updatedAt: now,
          },
        ],
        setlists: [
          {
            id: "tutorial-setlist",
            name: "Tutorial Setlist",
            venue: "",
            notes: "Watch the transitions.",
            entries: [
              {
                id: "tutorial-entry",
                songId: "tutorial-song",
                arrangementCue: "Start softly",
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
  await (await restoredDialog).accept();

  await page.goto("/setlists");
  await expect(page.locator(".driver-popover")).toContainText("Plan your shows");
  await page.keyboard.press("Escape");

  await page.goto("/setlists/tutorial-setlist");
  await expect(page.locator(".driver-popover")).toContainText("Build the set");
  await page.keyboard.press("Escape");

  await page.goto("/performance/tutorial-setlist");
  const performanceTutorial = page.locator(".driver-popover");
  await expect(performanceTutorial).toContainText("Performance controls");
  const performanceHeader = page.locator("[data-auto-hide-header]");
  const performanceNavigation = page.locator("[data-auto-hide-pagination]");
  await expect(performanceHeader).toHaveAttribute("data-visible", "true");
  await expect(performanceNavigation).toHaveAttribute("data-visible", "true");
  await expect(page.getByLabel("Open performance menu")).toBeVisible();
  await page.waitForTimeout(2_300);
  await expect(performanceHeader).toHaveAttribute("data-visible", "true");
  await expect(performanceNavigation).toHaveAttribute("data-visible", "true");
  await expect(page.getByLabel("Open performance menu")).toBeVisible();
});

test("starts the Setlist Editor tutorial before the running order has songs", async ({
  page,
}) => {
  await page.goto("/setlists");
  await expect(page.locator(".driver-popover")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByPlaceholder("New setlist name…").fill("Empty Tutorial Set");
  await page.getByRole("button", { name: "Create setlist" }).click();

  await expect(page.getByText("0 songs")).toBeVisible();
  await expect(page.locator(".driver-popover")).toContainText("Build the set");
});
