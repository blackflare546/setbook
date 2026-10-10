import { expect, test, type Locator, type Page } from "./fixtures";

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function luminance(color: string) {
  const values =
    color
      .match(/[\d.]+/g)
      ?.slice(0, 3)
      .map(Number) ?? [];
  return (
    channel(values[0] ?? 0) * 0.2126 +
    channel(values[1] ?? 0) * 0.7152 +
    channel(values[2] ?? 0) * 0.0722
  );
}

function ratio(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

async function elementContrast(locator: Locator, pseudo?: "::placeholder") {
  const colors = await locator.evaluate(
    (element, requestedPseudo) => ({
      foreground: getComputedStyle(element, requestedPseudo).color,
      background: getComputedStyle(element).backgroundColor,
    }),
    pseudo,
  );
  return ratio(colors.foreground, colors.background);
}

async function expectNoOverflow(page: Page) {
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

test("dark theme keeps core surfaces and controls readable", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  await page.goto("/library");
  await page.getByLabel("Theme").selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(18, 22, 27)",
  );
  await expect
    .poll(() => elementContrast(page.locator("body")))
    .toBeGreaterThanOrEqual(4.5);

  const search = page.getByPlaceholder("Search title, artist, or tag…");
  await expect
    .poll(() => elementContrast(search, "::placeholder"))
    .toBeGreaterThanOrEqual(4.5);
  await search.focus();
  await expect(search).toBeFocused();

  for (const viewport of [
    { width: 320, height: 844 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of ["/library", "/setlists", "/help", "/about"]) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveClass(/dark/);
      await expectNoOverflow(page);
    }
  }

  await page.reload();
  await expect(page.getByLabel("Theme")).toHaveValue("dark");
  expect(runtimeErrors).toEqual([]);
});
