import { expect, test } from "./fixtures";

test("announces navigation state and provides one keyboard-reachable main area", async ({
  page,
}) => {
  const response = await page.goto("/library");
  const headers = response?.headers() ?? {};
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["permissions-policy"]).toContain("camera=(self)");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-powered-by"]).toBeUndefined();

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toHaveAttribute("href", "#main-content");
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await expect(
    page.getByRole("link", { name: "Song library", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  for (const route of ["/library", "/setlists", "/help", "/about"]) {
    await page.goto(route);
    await expect(page.getByRole("main")).toHaveCount(1);
  }
});

test("offers recovery from an unknown route", async ({ page }) => {
  const response = await page.goto("/this-screen-does-not-exist");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to library" }),
  ).toHaveAttribute("href", "/library");
});

test("keeps the mobile shell compact while editing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/songs/new");

  const mobileNavigation = page.getByTestId("mobile-primary-navigation");
  const title = page.getByLabel("Title", { exact: true });
  const chordSheet = page.getByLabel("Chord sheet", { exact: true });

  await expect(mobileNavigation).toBeVisible();
  await expect(title).toHaveAttribute("autocomplete", "off");
  await expect(chordSheet).toHaveAttribute("autocomplete", "off");

  await title.focus();
  await expect(mobileNavigation).toBeVisible();
  await page.setViewportSize({ width: 390, height: 544 });
  await expect(mobileNavigation).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(mobileNavigation).toBeVisible();
  await title.evaluate((element) => element.blur());

  const header = page.getByTestId("app-header");
  await expect(header).toHaveCSS("position", "relative");
  await page.evaluate(() => window.scrollTo(0, 300));
  await expect
    .poll(async () => (await header.boundingBox())?.y ?? 0)
    .toBeLessThan(0);
});
