import { test, expect, type Page } from "@playwright/test";

test.setTimeout(120_000);

const title = "How Great Is Our God — Extended Live Arrangement";
const source = `[Intro] G Em7 C2 D

[Verse 1]
G                   Em7
The splendor of a King, clothed in majesty,
                    C2
Let all the earth rejoice, all the earth rejoice.

[Chorus]
G
How great is our God, sing with me,
Em7
How great is our God, and all will see,
C           D            G
How great, how great is our God.`;

async function expectNoPageOverflow(page: Page) {
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

test("mobile-first song, setlist, performance, and publishing flow", async ({
  page,
}) => {
  await page.goto("/songs/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Artist").fill("Chris Tomlin");
  await page.getByLabel("Original key").fill("G");
  await page.getByTestId("smart-paste-input").fill(source);
  await page.getByTestId("parse-song").click();
  await expect(page.getByText("Chart editor")).toBeVisible();
  await page.getByTestId("save-song").click();
  await expect(page.getByText("Song saved")).toBeVisible();
  await expect(page.getByText("Song view")).toBeVisible();
  await expect(page).toHaveURL(/\/songs\/[0-9a-f-]+$/);
  const songViewUrl = page.url();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("link", { name: /Edit song/ })).toBeVisible();
  await expect(page.getByText("Chart editor")).toHaveCount(0);

  await page.getByLabel("Transpose up").click();
  await expect(page.getByLabel("Transpose offset")).toHaveText("+1");
  await expect(page.getByLabel("Current key")).toHaveText("G#");
  await page.getByLabel("Reset transposition").click();
  await expect(page.getByLabel("Transpose offset")).toHaveText("0");

  await page.getByRole("link", { name: /Edit song/ }).click();
  await expect(page.getByText("Chart editor")).toBeVisible();
  const songEditorUrl = page.url();
  await page.getByRole("button", { name: "Smart Paste" }).click();
  await expect(page.getByTestId("smart-paste-input")).toHaveValue(source);
  await page.getByRole("button", { name: "Back to editor" }).click();
  await expect(page.getByText("Chart editor")).toBeVisible();

  await page.goto("/library");
  await page.getByLabel("Theme").selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.getByLabel("Theme")).toHaveValue("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByLabel("Theme").selectOption("light");
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page).toHaveURL(songViewUrl);
  await expect(page.getByText("Song view")).toBeVisible();

  await page.goto("/setlists");
  await page.getByPlaceholder("New setlist name…").fill("Friday Night");
  await page.getByRole("button", { name: "Create setlist" }).click();
  await expect(page.getByText("Setlist saved")).toBeVisible();
  const setlistEditorUrl = page.url();

  await page.getByRole("button", { name: "Add song" }).click();
  await page.getByLabel("Search songs").fill("great");
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await expect(page.getByText("1 song")).toBeVisible();
  await page.getByLabel("Performance key").fill("A");
  await page.getByLabel("Arrangement cue").fill("Count four, quiet verse");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Setlist saved")).toBeVisible();

  await page.getByRole("link", { name: "Perform" }).click();
  await expect(page.getByText("Count four, quiet verse")).toBeVisible();
  const performanceUrl = page.url();
  await expect(page.getByLabel("Current key")).toHaveText("A");
  await page.getByLabel("Transpose down").click();
  await expect(page.getByLabel("Transpose offset")).toHaveText("-1");
  await expect(page.getByLabel("Current key")).toHaveText("G#");

  await page.goto(setlistEditorUrl);
  await page.getByRole("button", { name: "Publish setlist" }).click();
  const shareLink = page.getByRole("link", { name: "Open public link" });
  await expect(shareLink).toBeVisible();
  const firstShareUrl = await shareLink.getAttribute("href");
  expect(firstShareUrl).toMatch(/^\/s\//);
  await page.goto(firstShareUrl!);
  await expect(page.getByText("Shared setlist")).toBeVisible();
  await expect(page.getByText("Count four, quiet verse")).toBeVisible();

  await page.goto(setlistEditorUrl);
  await page.getByRole("button", { name: "Add song" }).click();
  await page.getByLabel("Search songs").fill("Chris");
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await expect(page.getByText("2 songs")).toBeVisible();
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" &&
        response.url().includes("/api/published-setlists/"),
    ),
    page.getByRole("button", { name: "Update published setlist" }).click(),
  ]);
  await expect(shareLink).toHaveAttribute("href", firstShareUrl!);
  await page.goto(firstShareUrl!);
  await expect(page.getByText("1 of 2")).toBeVisible();

  const routes = [
    "/library",
    songViewUrl,
    songEditorUrl,
    setlistEditorUrl,
    performanceUrl,
    firstShareUrl!,
  ];
  for (const width of [320, 375, 390, 430, 768, 1024]) {
    await page.setViewportSize({ width, height: width < 768 ? 700 : 800 });
    for (const route of routes) {
      await page.goto(route);
      await expectNoPageOverflow(page);
    }
  }

  await page.setViewportSize({ width: 320, height: 320 });
  await page.goto(performanceUrl);
  const scrollable = await page.evaluate(() => {
    const canScroll =
      document.documentElement.scrollHeight > window.innerHeight;
    window.scrollTo(0, document.documentElement.scrollHeight);
    return canScroll;
  });
  expect(scrollable).toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);

  await page.request.delete(
    `/api/published-setlists/${firstShareUrl!.split("/").at(-1)}`,
  );
});
