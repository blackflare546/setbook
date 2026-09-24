import { expect, test } from "@playwright/test";

test("keeps Performance Key options accessible throughout a long desktop setlist", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: "Song library" }),
  ).toBeVisible();
  const now = new Date().toISOString();
  const backup = {
    version: 1,
    exportedAt: now,
    songs: [
      {
        id: "key-selector-song",
        title: "Position Test Song",
        artist: "SetBook",
        originalKey: "G",
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
        id: "long-key-selector-setlist",
        name: "Long Key Selector Setlist",
        venue: "",
        notes: "",
        entries: Array.from({ length: 18 }, (_, index) => ({
          id: `entry-${index + 1}`,
          songId: "key-selector-song",
          arrangementCue: "",
        })),
        createdAt: now,
        updatedAt: now,
      },
    ],
    settings: [],
  };
  const restoredDialog = page.waitForEvent("dialog");
  await page.locator('input[type="file"]').setInputFiles({
    name: "long-setlist.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await (await restoredDialog).accept();

  await page.goto("/setlists/long-key-selector-setlist");
  const selectors = page.getByRole("combobox", {
    name: "Performance key",
    exact: true,
  });
  await expect(selectors).toHaveCount(18);

  await selectors.nth(0).scrollIntoViewIfNeeded();
  await selectors.nth(0).click();
  await expect(
    page.getByRole("listbox", { name: "Performance key options" }),
  ).toBeVisible();
  await selectors.nth(0).fill("E minor");
  await page
    .getByRole("listbox", { name: "Performance key options" })
    .getByRole("option", { name: "E Minor", exact: true })
    .click();
  await expect(selectors.nth(0)).toHaveValue("E Minor");
  await expect(selectors.nth(1)).toHaveValue("G Major");

  await selectors.nth(8).scrollIntoViewIfNeeded();
  await selectors.nth(8).click();
  await expect(
    page.getByRole("listbox", { name: "Performance key options" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await selectors.nth(17).evaluate((element) =>
    element.scrollIntoView({ block: "end", behavior: "auto" }),
  );
  await selectors.nth(17).click();
  const lastList = page.getByRole("listbox", {
    name: "Performance key options",
  });
  await expect(lastList).toHaveAttribute("data-side", "top");
  const listBox = await lastList.boundingBox();
  expect(listBox).not.toBeNull();
  expect(listBox!.y).toBeGreaterThanOrEqual(0);
  expect(listBox!.y + listBox!.height).toBeLessThanOrEqual(720);

  const options = lastList.getByRole("option");
  expect(await options.count()).toBeGreaterThan(10);
  const lastOption = options.last();
  await lastOption.scrollIntoViewIfNeeded();
  await expect(lastOption).toBeVisible();
  const lastLabel = (await lastOption.textContent())!.trim();
  await lastOption.click();
  await expect(selectors.nth(17)).toHaveValue(lastLabel);
  await expect(selectors.nth(0)).toHaveValue("E Minor");
  await expect(selectors.nth(1)).toHaveValue("G Major");
});
