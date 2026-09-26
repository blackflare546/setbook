import { expect, test, type Page } from "@playwright/test";

const setlistId = "sortable-setlist";

async function restoreSetlistFixture(page: Page) {
  const now = new Date().toISOString();
  const songs = [
    { id: "song-a", title: "Alpha Song", originalKey: "C" },
    { id: "song-b", title: "Bravo Song", originalKey: "D" },
    { id: "song-c", title: "Charlie Song", originalKey: "E" },
  ].map((song) => ({
    ...song,
    artist: "SetBook Test",
    capo: null,
    tags: [],
    sections: [
      {
        id: `section-${song.id}`,
        type: "verse",
        title: "Verse",
        lines: Array.from({ length: 70 }, (_, index) => ({
          id: `line-${song.id}-${index}`,
          lyrics: `Chart line ${index + 1} for ${song.title}`,
          chords: [
            {
              id: `chord-${song.id}-${index}`,
              symbol: song.originalKey,
              position: 0,
            },
          ],
        })),
      },
    ],
    notes: "",
    links: {},
    sourceText: "",
    createdAt: now,
    updatedAt: now,
  }));
  const backup = {
    version: 1,
    exportedAt: now,
    songs,
    setlists: [
      {
        id: setlistId,
        name: "Sortable Setlist",
        venue: "Main room",
        notes: "",
        entries: [
          {
            id: "entry-a",
            songId: "song-a",
            performanceKey: "F",
            arrangementCue: "Alpha cue",
          },
          {
            id: "entry-b",
            songId: "song-b",
            performanceKey: "G",
            arrangementCue: "Bravo cue",
          },
          {
            id: "entry-c",
            songId: "song-c",
            performanceKey: "A",
            arrangementCue: "Charlie cue",
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
    settings: [],
  };

  await page.goto("/library");
  const restoredDialog = page.waitForEvent("dialog");
  await page.locator('input[type="file"]').setInputFiles({
    name: "sortable-setlist.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await (await restoredDialog).accept();
}

async function keyboardDrag(
  page: Page,
  accessibleName: string,
  arrows: string[],
) {
  const handle = page.getByRole("button", { name: accessibleName });
  await handle.focus();
  await page.keyboard.press("Space");
  for (const arrow of arrows) {
    await page.keyboard.press(arrow);
    await page.waitForTimeout(150);
  }
  await page.keyboard.press("Space");
}

async function pointerDrag(
  page: Page,
  accessibleName: string,
  targetEntryId: string,
) {
  const sourceBox = await page
    .getByRole("button", { name: accessibleName })
    .boundingBox();
  const target = page.getByTestId(`setlist-entry-${targetEntryId}`);
  const targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  await page.mouse.move(
    sourceBox!.x + sourceBox!.width / 2,
    sourceBox!.y + sourceBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox!.x + targetBox!.width / 2,
    targetBox!.y + targetBox!.height / 3,
    { steps: 10 },
  );
  await expect(target.locator("div.bg-indigo-500")).toBeVisible();
  await page.mouse.up();
}

async function expectEntryOrder(page: Page, titles: string[]) {
  await expect(
    page.locator('[data-testid^="setlist-entry-"]').getByRole("heading"),
  ).toHaveText(titles);
}

test("setlist cards open from the full surface without hijacking actions", async ({
  page,
}) => {
  await restoreSetlistFixture(page);
  await page.goto("/setlists");

  const card = page.getByTestId(`setlist-card-${setlistId}`);
  page.once("dialog", (dialog) => dialog.dismiss());
  await card.getByRole("button", { name: "Delete Sortable Setlist" }).click();
  await expect(page).toHaveURL(/\/setlists$/);

  await card.click({ position: { x: 12, y: 12 } });
  await expect(page).toHaveURL(`/setlists/${setlistId}`);
  await page.goto("/setlists");

  const titleBox = await card.getByRole("heading").boundingBox();
  expect(titleBox).not.toBeNull();
  await page.mouse.click(
    titleBox!.x + titleBox!.width / 2,
    titleBox!.y + titleBox!.height / 2,
  );
  await expect(page).toHaveURL(`/setlists/${setlistId}`);
  await page.goto("/setlists");

  const cardLink = page.getByRole("link", { name: "Open Sortable Setlist" });
  await cardLink.focus();
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(`/setlists/${setlistId}`);
});

test("dragging reorders complete entries and persists only after Save", async ({
  page,
}) => {
  await restoreSetlistFixture(page);
  await page.goto(`/setlists/${setlistId}`);
  await expectEntryOrder(page, ["Alpha Song", "Bravo Song", "Charlie Song"]);

  await pointerDrag(page, "Drag song 3: Charlie Song", "entry-a");
  await expectEntryOrder(page, ["Charlie Song", "Alpha Song", "Bravo Song"]);
  await expect(
    page.getByRole("combobox", { name: "Performance key", exact: true }).nth(0),
  ).toHaveValue("A Major");
  await expect(page.getByLabel("Arrangement cue").nth(0)).toHaveValue(
    "Charlie cue",
  );
  await expect(page.getByText("Setlist saved")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Perform" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Publish setlist" }),
  ).toBeDisabled();

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Setlist saved")).toBeVisible();
  await page.reload();
  await expectEntryOrder(page, ["Charlie Song", "Alpha Song", "Bravo Song"]);
  await expect(page.getByLabel("Arrangement cue").nth(0)).toHaveValue(
    "Charlie cue",
  );

  await keyboardDrag(page, "Drag song 1: Charlie Song", [
    "ArrowDown",
    "ArrowDown",
  ]);
  await expectEntryOrder(page, ["Alpha Song", "Bravo Song", "Charlie Song"]);
  await expect(
    page.getByRole("combobox", { name: "Performance key", exact: true }).nth(2),
  ).toHaveValue("A Major");
  await expect(page.getByLabel("Arrangement cue").nth(2)).toHaveValue(
    "Charlie cue",
  );
  await expect(page.getByRole("button", { name: "Perform" })).toBeDisabled();

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Setlist saved")).toBeVisible();
  await page.reload();
  await expectEntryOrder(page, ["Alpha Song", "Bravo Song", "Charlie Song"]);
});

test("mobile performance reveals controls for meaningful scrolls and taps", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await restoreSetlistFixture(page);
  await page.goto(`/performance/${setlistId}`);

  const scroller = page.locator("[data-performance-chart-scroll]");
  const header = page.locator("[data-auto-hide-header]");
  const pagination = page.locator("[data-auto-hide-pagination]");
  await expect(header).toHaveAttribute("data-visible", "false");
  await expect(pagination).toHaveAttribute("data-visible", "false");
  await expect(page.getByLabel("Open performance menu")).toHaveCount(0);
  await expect
    .poll(() => scroller.evaluate((element) => element.clientHeight))
    .toBe(844);

  await scroller.evaluate((element) => {
    element.scrollTop = 4;
  });
  await expect(header).toHaveAttribute("data-visible", "false");
  await expect(pagination).toHaveAttribute("data-visible", "false");

  await scroller.evaluate((element) => {
    element.scrollTop = 320;
  });
  await expect(header).toHaveAttribute("data-visible", "true");
  await expect(pagination).toHaveAttribute("data-visible", "true");
  await expect(page.getByLabel("Open performance menu")).toBeVisible();
  const readingPosition = await scroller.evaluate((element) =>
    Math.round(element.scrollTop),
  );
  await page.waitForTimeout(400);
  await expect(header).toHaveAttribute("data-visible", "true");
  await expect(pagination).toHaveAttribute("data-visible", "true");
  await expect
    .poll(() => scroller.evaluate((element) => Math.round(element.scrollTop)))
    .toBe(readingPosition);

  await scroller.evaluate((element) => {
    element.scrollTop -= 120;
  });
  await expect(header).toHaveAttribute("data-visible", "true");
  await expect(pagination).toHaveAttribute("data-visible", "true");

  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight - element.clientHeight - 20;
  });
  await expect(header).toHaveAttribute("data-visible", "true");
  await expect(pagination).toHaveAttribute("data-visible", "true");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bravo Song" })).toBeVisible();
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollTop))
    .toBe(0);

  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight - element.clientHeight - 20;
  });
  await expect(header).toHaveAttribute("data-visible", "true");
  await expect(pagination).toHaveAttribute("data-visible", "true");
  const bottomPosition = await scroller.evaluate((element) =>
    Math.round(element.scrollTop),
  );

  const performanceMenu = page.getByLabel("Open performance menu");
  await expect(performanceMenu).toBeVisible();
  await expect
    .poll(() => scroller.evaluate((element) => Math.round(element.scrollTop)))
    .toBe(bottomPosition);
  await performanceMenu.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(header).toHaveAttribute("data-visible", "false", {
    timeout: 3_000,
  });
  await expect(pagination).toHaveAttribute("data-visible", "false");

  await scroller.evaluate((element) => {
    element.scrollTop -= 100;
  });
  await expect(header).toHaveAttribute("data-visible", "true");
  await expect(pagination).toHaveAttribute("data-visible", "true");
  await expect(header).toHaveAttribute("data-visible", "false", {
    timeout: 3_000,
  });
  await expect(pagination).toHaveAttribute("data-visible", "false");

  await scroller.click({ position: { x: 20, y: 300 } });
  await expect(pagination).toHaveAttribute("data-visible", "true");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Charlie Song" }),
  ).toBeVisible();
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollTop))
    .toBe(0);
  await expect(header).toHaveAttribute("data-visible", "false");
  await expect(pagination).toHaveAttribute("data-visible", "false");

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(header).toHaveAttribute("data-visible", "false");
  await expect(pagination).toHaveAttribute("data-visible", "false");
  await expect
    .poll(() => scroller.evaluate((element) => element.clientHeight))
    .toBe(390);

  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(header).toHaveAttribute("data-visible", "true");
    await expect(pagination).toHaveAttribute("data-visible", "true");
    await expect(page.getByLabel("Open performance menu")).toBeVisible();
    await expect
      .poll(() =>
        scroller.evaluate((element) => getComputedStyle(element).overflowY),
      )
      .toBe("visible");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1,
        ),
      )
      .toBe(true);
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(header).toHaveAttribute("data-visible", "true");
  await expect(pagination).toHaveAttribute("data-visible", "true");
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
