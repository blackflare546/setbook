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
