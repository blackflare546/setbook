import { test, expect, type Page } from "@playwright/test";

test.setTimeout(120_000);

test("shows the welcome once and keeps help and about accessible", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "One place for your songs and chord charts.",
    }),
  ).toBeVisible();
  const developerLink = page.getByRole("link", {
    name: "Glenn Mark L. Flores",
  });
  await expect(developerLink).toHaveAttribute(
    "href",
    "https://www.facebook.com/glennmark5466/",
  );
  await expect(page.getByRole("link", { name: "Facebook" })).toHaveCount(0);

  await page.getByRole("button", { name: /Open Song Library/ }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByLabel("Theme")).toHaveValue("light");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/library$/);

  await page.getByLabel("Theme").selectOption("dark");
  await expect(
    page.getByRole("link", { name: "Welcome", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "About", exact: true }).click();
  await page.getByRole("link", { name: /View Welcome Page/ }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(
    page.getByRole("heading", {
      name: "One place for your songs and chord charts.",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("landing-page")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );

  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "SetBook" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Glenn Mark L. Flores" }),
  ).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Facebook" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /View Welcome Page/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Help", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "How to use SetBook" }),
  ).toBeVisible();
  await expect(
    page.getByText("Shared setlists are read-only.", { exact: false }),
  ).toBeVisible();

  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/welcome", "/about", "/help"]) {
      await page.goto(route);
      await expectNoPageOverflow(page);
    }
  }
});

const title = "How Great Is Our God — Extended Live Arrangement";
const longMobileSource = Array.from(
  { length: 30 },
  (_, index) =>
    `${index ? "" : "        C#                         A                 B             C#m\n"}Lift him up and shout his name over all and continue with a very long lyric line`,
).join("\n");
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
How great, how great is our God.

[Bridge]
        E                 B
Turn it up this sound of praise
            A
Make it louder than any other
        E                 B        C#m   A   B
Lift him up and shout his name over all

[Chorus]
G
How great is our God, sing with me,
Em7
How great is our God, and all will see,
C           D            G
How great, how great is our God.

[Outro]
G
How great is our God, sing with me,
Em7
How great is our God, and all will see,
C           D            G
How great, how great is our God.

[Tag]
G
Name above all names,
Em7
Worthy of all praise,
C
My heart will sing
D            G
How great is our God.

[Chorus]
G
How great is our God, sing with me,
Em7
How great is our God, and all will see,
C           D            G
How great, how great is our God.

[Ending]
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

async function selectKey(
  page: Page,
  label: "Song key" | "Performance key",
  query: string,
  option: string,
  index = 0,
) {
  const input = page
    .getByRole("combobox", { name: label, exact: true })
    .nth(index);
  await input.click();
  await input.fill(query);
  await page
    .getByRole("listbox", { name: `${label} options`, exact: true })
    .getByRole("option", { name: option, exact: true })
    .click();
}

test("mobile-first song, setlist, performance, and publishing flow", async ({
  page,
}) => {
  await page.goto("/songs/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Artist").fill("Chris Tomlin");
  const songKey = page.getByRole("combobox", {
    name: "Song key",
    exact: true,
  });
  await page.getByTestId("smart-paste-input").fill("[Verse]\nAm F C G");
  await expect(page.getByText("Possible Keys: C Major / A Minor")).toBeVisible();
  await expect(songKey).toHaveValue("");

  await page.getByTestId("smart-paste-input").fill(source);
  await expect(songKey).toHaveValue("G Major");
  await expect(page.getByText("Original Detected Key: G Major")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use Detected Key" }),
  ).toHaveCount(0);

  await selectKey(page, "Song key", "A major", "A Major");
  await expect(songKey).toHaveValue("A Major");
  await expect(page.getByText("Original Detected Key: G Major")).toBeVisible();

  await songKey.click();
  await songKey.fill("G");
  const songKeyOptions = page
    .getByRole("listbox", { name: "Song key options", exact: true })
    .getByRole("option");
  await expect(songKeyOptions).toHaveText([
    "G Major",
    "G# Major",
    "Gb Major",
    "G Minor",
    "G# Minor",
    "Gb Minor",
  ]);
  await songKeyOptions.filter({ hasText: /^G Major$/ }).click();
  await expect(songKey).toHaveValue("G Major");
  await expect(page.getByText("Original Detected Key: G Major")).toBeVisible();
  await page.getByLabel("Capo").selectOption("2");
  await page.getByTestId("save-song").click();
  await expect(page.getByText("Song saved")).toBeVisible();
  await expect(page.getByText("Song view")).toBeVisible();
  await expect(page).toHaveURL(/\/songs\/[0-9a-f-]+$/);
  const songViewUrl = page.url();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("link", { name: /Edit song/ })).toBeVisible();
  await expect(page.getByText("Chart editor")).toHaveCount(0);
  await expect(page.getByText("Capo 2")).toBeVisible();
  const wideChartLine = page
    .getByTestId("chart-line")
    .filter({ has: page.locator('[data-chord-position="45"]') });
  await expect(wideChartLine).toHaveCount(1);
  const renderedPositions = await wideChartLine
    .locator("[data-chord-position]")
    .evaluateAll((chords) =>
      chords.map((chord) => ({
        position: Number(chord.getAttribute("data-chord-position")),
        left: (chord as HTMLElement).style.left,
      })),
    );
  expect(renderedPositions).toEqual([
    { position: 8, left: "8ch" },
    { position: 26, left: "26ch" },
    { position: 35, left: "35ch" },
    { position: 41, left: "41ch" },
    { position: 45, left: "45ch" },
  ]);

  await page.getByLabel("Chart font sizes").click();
  await expect(page.getByLabel("Sections font scale")).toHaveText("80%");
  await expect(page.getByLabel("Chords font scale")).toHaveText("80%");
  await expect(page.getByLabel("Lyrics font scale")).toHaveText("80%");
  await expect(page.getByLabel("Line height value")).toHaveText("1.0");
  await expect(page.getByRole("button", { name: "Auto" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "2 Columns" }).click();
  await expect(page.locator('[data-chart-layout="two"]')).toHaveCSS(
    "column-count",
    "2",
  );
  await page.getByLabel("Decrease section font size").click();
  await expect(page.getByLabel("Sections font scale")).toHaveText("70%");
  await page.getByLabel("Increase section font size").click();
  await page.getByLabel("Increase section font size").click();
  await expect(page.getByLabel("Sections font scale")).toHaveText("90%");
  await expect(page.getByLabel("Chords font scale")).toHaveText("80%");
  await expect(page.getByLabel("Lyrics font scale")).toHaveText("80%");
  await page.getByLabel("Increase chord font size").click();
  await page.getByLabel("Increase lyric font size").click();
  await page.getByLabel("Increase line height").click();
  await expect(page.getByLabel("Line height value")).toHaveText("1.1");
  await expect(page.getByRole("button", { name: "2 Columns" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    wideChartLine.locator('[data-chord-position="45"]'),
  ).toHaveAttribute("style", /left: 45ch/);
  await page.getByLabel("Close font size controls").click();
  await page.reload();
  await page.getByLabel("Chart font sizes").click();
  await expect(page.getByLabel("Sections font scale")).toHaveText("90%");
  await expect(page.getByLabel("Chords font scale")).toHaveText("90%");
  await expect(page.getByLabel("Lyrics font scale")).toHaveText("90%");
  await expect(page.getByLabel("Line height value")).toHaveText("1.1");
  await expect(page.getByRole("button", { name: "2 Columns" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Auto" }).click();
  await page.getByLabel("Close font size controls").click();
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(page.locator('[data-chart-layout="auto"]')).toHaveCSS(
    "column-count",
    "2",
  );
  await page.getByLabel("Chart font sizes").click();
  await page.getByRole("button", { name: "1 Column" }).click();
  await page.getByLabel("Close font size controls").click();
  await expect(page.locator('[data-chart-layout="one"]')).toHaveCSS(
    "column-count",
    "1",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Chart font sizes").click();
  await page.getByRole("button", { name: "Auto" }).click();
  await page.getByLabel("Close font size controls").click();
  await expect(page.locator('[data-chart-layout="auto"]')).toHaveCSS(
    "column-count",
    "1",
  );

  await page.getByLabel("Transpose up").click();
  await expect(page.getByLabel("Transpose offset")).toHaveText("+1");
  await expect(page.getByLabel("Current key")).toHaveText("G# Major");
  await page.getByLabel("Reset transposition").click();
  await expect(page.getByLabel("Transpose offset")).toHaveText("0");

  await page.getByRole("link", { name: /Edit song/ }).click();
  await expect(page.getByText("Smart Paste")).toBeVisible();
  const songEditorUrl = page.url();
  await expect(page.getByText("Chart editor")).toHaveCount(0);
  await expect(page.getByTestId("smart-paste-input")).toHaveValue(source);
  await expect(page.getByLabel("Title")).toHaveValue(title);
  await expect(page.getByLabel("Artist")).toHaveValue("Chris Tomlin");
  await expect(
    page.getByRole("combobox", { name: "Song key", exact: true }),
  ).toHaveValue("G Major");
  await expect(page.getByLabel("Capo")).toHaveValue("2");
  await page.getByTestId("parse-song").click();
  await expect(page.getByText("Chart editor")).toBeVisible();
  await expect(page.getByText("Original Detected Key: G Major")).toBeVisible();
  await expect(page.getByLabel("Capo")).toHaveValue("2");

  await page.goto("/library");
  await page.getByLabel("Theme").selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.getByLabel("Theme")).toHaveValue("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByLabel("Theme").selectOption("light");
  await page.setViewportSize({ width: 390, height: 844 });
  const songActions = page.getByLabel(`Song actions for ${title}`);
  const songActionsBox = await songActions.boundingBox();
  expect(songActionsBox?.width).toBeGreaterThanOrEqual(44);
  expect(songActionsBox?.height).toBeGreaterThanOrEqual(44);
  await songActions.click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.mouse.click(12, 180);
  await expect(page.getByRole("menu")).toHaveCount(0);

  await songActions.click();
  await page.getByRole("menuitem", { name: "Duplicate" }).click();
  await expect(page.getByText("2 songs, available offline")).toBeVisible();
  const copyActions = page.getByLabel(`Song actions for ${title} copy`);
  await copyActions.click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByText("1 song, available offline")).toBeVisible();

  await songActions.click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page.getByText("Edit song chart")).toBeVisible();
  await page.goto("/library");
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page).toHaveURL(songViewUrl);
  await expect(page.getByText("Song view")).toBeVisible();

  await page.goto("/setlists");
  await page.getByPlaceholder("New setlist name…").fill("Friday Night");
  await page.getByRole("button", { name: "Create setlist" }).click();
  await expect(page.getByText("Setlist editor")).toBeVisible();
  await expect(page.getByText("Setlist saved")).toHaveCount(0);
  const setlistEditorUrl = page.url();

  await page.getByLabel("Venue").fill("Main room");
  await expect(page.getByText("Setlist saved")).toHaveCount(0);

  await page.getByRole("button", { name: "Add song" }).click();
  await page.getByLabel("Search songs").fill("great");
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await page.getByRole("button", { name: "Add song" }).click();
  await page.getByLabel("Search songs").fill("Chris");
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await expect(page.getByText("2 songs")).toBeVisible();
  await expect(page.getByText("Setlist saved")).toHaveCount(0);
  await selectKey(page, "Performance key", "A major", "A Major");
  await expect(
    page.getByRole("combobox", { name: "Performance key", exact: true }).nth(0),
  ).toHaveValue("A Major");
  await page
    .getByLabel("Arrangement cue")
    .nth(0)
    .fill("Count four, quiet verse");
  await page
    .getByPlaceholder("Load-in, tuning, transitions…")
    .fill("Guitar enters on Chorus\nDrums build during Bridge");
  await expect(
    page.getByRole("button", { name: "Publish setlist" }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Perform" })).toBeDisabled();
  await expect(
    page.getByText("Save changes before performing or publishing."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Setlist saved")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish setlist" }),
  ).toBeEnabled();
  await expect(page.getByRole("link", { name: "Perform" })).toBeVisible();
  await expect(page.getByText("Setlist saved")).toBeHidden({ timeout: 4_000 });

  await page.getByRole("link", { name: "Perform" }).click();
  await expect(page.getByText("Count four, quiet verse")).toBeVisible();
  const performanceUrl = page.url();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByLabel("Current key")).toHaveText("A Major");
  await expect(page.getByText("Capo 2")).toBeVisible();
  await expect(page.getByLabel("Enter fullscreen")).toBeHidden();
  const mobileWideLine = page
    .getByTestId("chart-line")
    .filter({ has: page.locator('[data-chord-position="45"]') })
    .first();
  const mobilePositions = await mobileWideLine
    .locator("[data-chord-position]")
    .evaluateAll((chords) =>
      chords.map((chord) => ({
        position: chord.getAttribute("data-chord-position"),
        left: (chord as HTMLElement).style.left,
      })),
    );
  expect(mobilePositions).toEqual([
    { position: "8", left: "8ch" },
    { position: "26", left: "26ch" },
    { position: "35", left: "35ch" },
    { position: "41", left: "41ch" },
    { position: "45", left: "45ch" },
  ]);

  await page
    .locator("[data-performance-chart-scroll]")
    .click({ position: { x: 20, y: 300 } });
  const performanceMenu = page.getByLabel("Open performance menu");
  await expect(performanceMenu).toHaveCount(1);
  const performanceMenuBox = await performanceMenu.boundingBox();
  expect(performanceMenuBox?.width).toBeGreaterThanOrEqual(44);
  expect(performanceMenuBox?.height).toBeGreaterThanOrEqual(44);
  await performanceMenu.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Appearance", { exact: true })).toBeVisible();
  await page.getByLabel("Performance theme").selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: /Band Notes/ }).click();
  await expect(page.getByRole("region", { name: "Band Notes" })).toContainText(
    "Guitar enters on Chorus",
  );
  await page
    .locator("[data-performance-chart-scroll]")
    .click({ position: { x: 20, y: 300 } });
  await page.getByLabel("Open performance menu").click();
  await page.getByRole("button", { name: /Band Notes/ }).click();
  await expect(page.getByRole("region", { name: "Band Notes" })).toHaveCount(0);
  await page
    .locator("[data-performance-chart-scroll]")
    .click({ position: { x: 20, y: 300 } });
  await page.getByLabel("Open performance menu").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByLabel("Transpose up").click();
  await page.getByLabel("Transpose up").click();
  await expect(page.getByLabel("Transpose offset")).toHaveText("+2");
  await expect(page.getByLabel("Current key")).toHaveText("B Major");
  await page.evaluate(() => {
    const performanceScroller = document.querySelector<HTMLElement>(
      "[data-performance-chart-scroll]",
    );
    if (performanceScroller)
      performanceScroller.scrollTop = performanceScroller.scrollHeight;
    const chartScroller = document.querySelector<HTMLElement>(
      "[data-performance-scroll-container]",
    );
    if (chartScroller) chartScroller.scrollLeft = chartScroller.scrollWidth;
  });
  await expect
    .poll(() =>
      page
        .locator("[data-performance-chart-scroll]")
        .evaluate((element) => element.scrollTop),
    )
    .toBeGreaterThan(0);
  await page
    .locator("[data-performance-chart-scroll]")
    .click({ position: { x: 20, y: 300 } });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator("[data-performance-chart-scroll]")
        .evaluate((element) => element.scrollTop),
    )
    .toBe(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLElement>(
            "[data-performance-scroll-container]",
          ),
        ).every(
          (container) =>
            container.scrollTop === 0 && container.scrollLeft === 0,
        ),
      ),
    )
    .toBe(true);
  await expect(page.getByLabel("Transpose offset")).toHaveText("0");
  await expect(page.getByLabel("Current key")).toHaveText("G Major");
  await page.getByLabel("Transpose down").click();
  await expect(page.getByLabel("Transpose offset")).toHaveText("-1");
  await expect(page.getByLabel("Current key")).toHaveText("F# Major");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.locator("[data-performance-chart-scroll]").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect
    .poll(() =>
      page
        .locator("[data-performance-chart-scroll]")
        .evaluate((element) => element.scrollTop),
    )
    .toBeGreaterThan(0);
  await page
    .locator("[data-performance-chart-scroll]")
    .click({ position: { x: 20, y: 300 } });
  await page.getByRole("button", { name: "Prev", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator("[data-performance-chart-scroll]")
        .evaluate((element) => element.scrollTop),
    )
    .toBe(0);
  await expect(page.getByLabel("Transpose offset")).toHaveText("+2");
  await expect(page.getByLabel("Current key")).toHaveText("B Major");

  await page.goto(songViewUrl);
  await expect(page.getByLabel("Current key")).toHaveText("G Major");

  await page.goto(setlistEditorUrl);
  await expect(page.getByText("Setlist saved")).toHaveCount(0);
  await page.getByRole("button", { name: "Publish setlist" }).click();
  await expect(page.getByText("Setlist published")).toBeVisible();
  await expect(page.getByText("Setlist saved")).toHaveCount(0);
  await expect(page.getByText("Setlist published")).toBeHidden({
    timeout: 4_000,
  });
  const shareLink = page.getByRole("link", { name: "Open public link" });
  await expect(shareLink).toBeVisible();
  await page.setViewportSize({ width: 768, height: 900 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const tabletShareBox = await shareLink.boundingBox();
  const tabletNavigationBox = await page.locator("nav.fixed").boundingBox();
  expect(tabletShareBox).not.toBeNull();
  expect(tabletNavigationBox).not.toBeNull();
  expect(tabletShareBox!.y + tabletShareBox!.height).toBeLessThan(
    tabletNavigationBox!.y,
  );
  const firstShareUrl = await shareLink.getAttribute("href");
  expect(firstShareUrl).toMatch(/^\/s\//);
  const publishedResponse = await page.request.get(
    `/api/published-setlists/${firstShareUrl!.split("/").at(-1)}`,
  );
  const publishedSnapshot = await publishedResponse.json();
  expect(publishedSnapshot).not.toHaveProperty("theme");
  await page.goto(firstShareUrl!);
  await expect(page.getByText("Shared setlist")).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(page.getByLabel("Open performance menu")).toHaveCount(1);
  await expect(page.locator("aside")).toHaveCount(0);
  await expect(page.getByText("Running order", { exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    const state = { element: null as Element | null };
    (
      window as unknown as {
        __setBookFullscreenState: { element: Element | null };
      }
    ).__setBookFullscreenState = state;
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => state.element,
    });
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: async () => {
        state.element = document.documentElement;
        document.dispatchEvent(new Event("fullscreenchange"));
      },
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: async () => {
        state.element = null;
        document.dispatchEvent(new Event("fullscreenchange"));
      },
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.element) {
        state.element = null;
        document.dispatchEvent(new Event("fullscreenchange"));
      }
    });
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  await page.getByLabel("Enter fullscreen").click();
  await expect(page.getByLabel("Exit fullscreen")).toHaveAttribute(
    "title",
    "Exit Fullscreen",
  );
  await page.getByLabel("Exit fullscreen").click();
  await expect(page.getByLabel("Enter fullscreen")).toHaveAttribute(
    "title",
    "Enter Fullscreen",
  );
  await page.evaluate(() => {
    (
      window as unknown as {
        __setBookFullscreenState: { element: Element | null };
      }
    ).__setBookFullscreenState.element = document.documentElement;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  await expect(page.getByLabel("Exit fullscreen")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Enter fullscreen")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByText("Count four, quiet verse")).toBeVisible();
  await page
    .locator("[data-performance-chart-scroll]")
    .click({ position: { x: 20, y: 300 } });
  await expect(page.getByText("1 of 2")).toBeVisible();
  await page.getByLabel("Open performance menu").click();
  await expect(page.getByText("Appearance", { exact: true })).toBeVisible();
  await page.getByLabel("Performance theme").selectOption("light");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByLabel("Performance theme").selectOption("dark");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.goto(setlistEditorUrl);
  await page.getByRole("button", { name: "Add song" }).click();
  await page.getByLabel("Search songs").fill("Chris");
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await expect(page.getByText("3 songs")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Update published setlist" }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Perform" })).toBeDisabled();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Setlist saved")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Update published setlist" }),
  ).toBeEnabled();
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
  await expect(page.getByText("1 of 3")).toBeVisible();

  const routes = [
    "/library",
    songViewUrl,
    songEditorUrl,
    setlistEditorUrl,
    performanceUrl,
    firstShareUrl!,
  ];
  for (const [width, height] of [
    [320, 667],
    [375, 667],
    [390, 844],
    [430, 932],
    [768, 900],
    [1024, 900],
  ]) {
    await page.setViewportSize({ width, height });
    for (const route of routes) {
      await page.goto(route);
      if (route === songEditorUrl) {
        await expect(page.getByText("Smart Paste")).toBeVisible();
        await expect(page.getByTestId("smart-paste-input")).toHaveValue(source);
      }
      if (
        route === songViewUrl ||
        route === performanceUrl ||
        route === firstShareUrl
      ) {
        await expect(page.getByLabel("Current key")).toBeVisible();
      }
      await expectNoPageOverflow(page);
    }
  }

  for (const [width, height] of [
    [375, 667],
    [390, 844],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(songEditorUrl);
    await expect(page.getByText("Smart Paste")).toBeVisible();
    await page.getByTestId("parse-song").click();
    await expect(page.getByText("Chart editor")).toBeVisible();
    const scrollState = await page.evaluate(() => {
      const pageRoot = document.scrollingElement ?? document.documentElement;
      const canScroll =
        Math.max(
          pageRoot.scrollHeight,
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
        ) > window.innerHeight;
      pageRoot.scrollTo(0, pageRoot.scrollHeight);
      window.scrollTo(0, document.body.scrollHeight);
      return {
        canScroll,
        root: [pageRoot.scrollHeight, pageRoot.clientHeight],
        body: [document.body.scrollHeight, document.body.clientHeight],
        html: [
          document.documentElement.scrollHeight,
          document.documentElement.clientHeight,
        ],
        viewport: window.innerHeight,
      };
    });
    expect(
      scrollState.canScroll,
      `review chart should scroll at ${width}x${height}: ${JSON.stringify(scrollState)}`,
    ).toBe(true);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  }

  await page.setViewportSize({ width: 320, height: 320 });
  await page.goto(performanceUrl);
  await expect(page.getByLabel("Current key")).toBeVisible();
  const scrollable = await page.evaluate(() => {
    const pageRoot = document.scrollingElement ?? document.documentElement;
    const canScroll = pageRoot.scrollHeight > pageRoot.clientHeight;
    pageRoot.scrollTo(0, pageRoot.scrollHeight);
    return canScroll;
  });
  expect(scrollable).toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);

  for (const [width, height] of [
    [320, 667],
    [375, 667],
    [390, 844],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/songs/new");
    const sourceEditor = page.getByTestId("smart-paste-input");
    await sourceEditor.fill(longMobileSource);
    const editorMetrics = await sourceEditor.evaluate((element) => {
      const editor = element as HTMLTextAreaElement;
      return {
        value: editor.value,
        wrap: editor.getAttribute("wrap"),
        whiteSpace: getComputedStyle(editor).whiteSpace,
        canScrollHorizontally: editor.scrollWidth > editor.clientWidth,
        canScrollVertically: editor.scrollHeight > editor.clientHeight,
      };
    });
    expect(editorMetrics).toEqual({
      value: longMobileSource,
      wrap: "off",
      whiteSpace: "pre",
      canScrollHorizontally: true,
      canScrollVertically: true,
    });
    const back = page.getByRole("button", { name: "Back", exact: true });
    const review = page.getByTestId("parse-song");
    const save = page.getByTestId("save-song");
    const cancel = page.getByRole("button", { name: "Cancel", exact: true });
    await review.scrollIntoViewIfNeeded();
    await expect(review).toBeVisible();
    await expect(save).toBeVisible();
    await expect(cancel).toBeVisible();
    const actionBox = await cancel.boundingBox();
    expect(actionBox?.y).toBeGreaterThanOrEqual(0);
    expect(
      (actionBox?.y ?? height) + (actionBox?.height ?? 0),
    ).toBeLessThanOrEqual(height);
    await back.scrollIntoViewIfNeeded();
    const backBox = await back.boundingBox();
    expect(backBox?.x).toBeLessThan(width / 3);
    expect(backBox?.height).toBeGreaterThanOrEqual(44);
    await expectNoPageOverflow(page);
  }

  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(setlistEditorUrl);
  await expect(page.getByText("3 songs")).toBeVisible();
  await page.getByRole("button", { name: "Delete Published Setlist" }).click();
  const deleteDialog = page.getByRole("dialog", {
    name: "Delete published setlist?",
  });
  await expect(deleteDialog).toContainText(
    "This will make the public link unavailable. Your local setlist will not be deleted.",
  );
  await deleteDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(shareLink).toHaveAttribute("href", firstShareUrl!);

  const deleteApiPattern = `**/api/published-setlists/${firstShareUrl!.split("/").at(-1)}`;
  await page.route(deleteApiPattern, async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ error: "Published setlist could not be deleted" }),
      });
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Delete Published Setlist" }).click();
  await deleteDialog
    .getByRole("button", { name: "Delete Published Setlist" })
    .click();
  await expect(
    page.getByRole("alert").filter({
      hasText: "Published setlist could not be deleted",
    }),
  ).toBeVisible();
  await expect(shareLink).toHaveAttribute("href", firstShareUrl!);
  await page.unroute(deleteApiPattern);

  await page.getByRole("button", { name: "Delete Published Setlist" }).click();
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        response.url().includes("/api/published-setlists/"),
    ),
    deleteDialog
      .getByRole("button", { name: "Delete Published Setlist" })
      .click(),
  ]);
  await expect(page.getByText("Published setlist deleted")).toBeVisible();
  await expect(shareLink).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Publish setlist" }),
  ).toBeVisible();
  await expect(page.getByText("3 songs")).toBeVisible();

  const deletedResponse = await page.request.get(firstShareUrl!);
  expect(deletedResponse.status()).toBe(404);
  const repeatedDeleteResponse = await page.request.delete(
    `/api/published-setlists/${firstShareUrl!.split("/").at(-1)}`,
  );
  expect(repeatedDeleteResponse.status()).toBe(204);
  await page.goto(firstShareUrl!);
  await expect(
    page.getByRole("heading", { name: "Setlist not found" }),
  ).toBeVisible();

  await page.goto(setlistEditorUrl);
  await expect(page.getByText("3 songs")).toBeVisible();
  await page.getByRole("button", { name: "Publish setlist" }).click();
  await expect(page.getByText("Setlist published")).toBeVisible();
  const republishedLink = page.getByRole("link", { name: "Open public link" });
  await expect(republishedLink).toBeVisible();
  const republishedUrl = await republishedLink.getAttribute("href");
  expect(republishedUrl).toMatch(/^\/s\//);
  await page.goto(republishedUrl!);
  await expect(page.getByText("Shared setlist")).toBeVisible();

  await page.goto("/setlists");
  const republishedDeletePattern = `**/api/published-setlists/${republishedUrl!.split("/").at(-1)}`;
  await page.route(republishedDeletePattern, async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ error: "Published setlist could not be deleted" }),
      });
      return;
    }
    await route.continue();
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Friday Night" }).click();
  await expect(
    page.getByRole("alert").filter({
      hasText: "Published setlist could not be deleted",
    }),
  ).toBeVisible();
  await expect(page.getByText("Friday Night", { exact: true })).toBeVisible();
  await page.unroute(republishedDeletePattern);

  page.once("dialog", (dialog) => dialog.accept());
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        response.url().includes("/api/published-setlists/"),
    ),
    page.getByRole("button", { name: "Delete Friday Night" }).click(),
  ]);
  await expect(page.getByText("Setlist deleted")).toBeVisible();
  await expect(page.getByText("No setlists yet")).toBeVisible();
  await expect(page.getByText("Setlist deleted")).toBeHidden({
    timeout: 4_000,
  });
  const deletedSetlistShare = await page.request.get(republishedUrl!);
  expect(deletedSetlistShare.status()).toBe(404);
});
