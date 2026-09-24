import { test, expect, type Page } from "@playwright/test";

test.setTimeout(120_000);

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

test("mobile-first song, setlist, performance, and publishing flow", async ({
  page,
}) => {
  await page.goto("/songs/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Artist").fill("Chris Tomlin");
  await page.getByLabel("Song key").selectOption("G");
  await expect(page.getByLabel("Song key").locator("option")).toContainText([
    "Not set",
    "C Major",
  ]);
  await expect(page.getByLabel("Song key")).toContainText("E Minor");
  await page.getByLabel("Capo").selectOption("2");
  await page.getByTestId("smart-paste-input").fill(source);
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
  await expect(page.getByLabel("Sections font scale")).toHaveText("100%");
  await expect(page.getByLabel("Chords font scale")).toHaveText("100%");
  await expect(page.getByLabel("Lyrics font scale")).toHaveText("100%");
  await expect(page.getByLabel("Line height value")).toHaveText("1.4");
  await page.getByLabel("Increase section font size").click();
  await expect(page.getByLabel("Sections font scale")).toHaveText("110%");
  await expect(page.getByLabel("Chords font scale")).toHaveText("100%");
  await expect(page.getByLabel("Lyrics font scale")).toHaveText("100%");
  await page.getByLabel("Increase chord font size").click();
  await page.getByLabel("Increase lyric font size").click();
  await page.getByLabel("Increase line height").click();
  await expect(page.getByLabel("Line height value")).toHaveText("1.5");
  await expect(
    wideChartLine.locator('[data-chord-position="45"]'),
  ).toHaveAttribute("style", /left: 45ch/);
  await page.getByLabel("Close font size controls").click();
  await page.reload();
  await page.getByLabel("Chart font sizes").click();
  await expect(page.getByLabel("Sections font scale")).toHaveText("110%");
  await expect(page.getByLabel("Chords font scale")).toHaveText("110%");
  await expect(page.getByLabel("Lyrics font scale")).toHaveText("110%");
  await expect(page.getByLabel("Line height value")).toHaveText("1.5");
  await page.getByLabel("Close font size controls").click();

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
  await expect(page.getByLabel("Song key")).toHaveValue("G");
  await expect(page.getByLabel("Capo")).toHaveValue("2");
  await page.getByTestId("parse-song").click();
  await expect(page.getByText("Chart editor")).toBeVisible();
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
  await page.getByLabel("Performance key").nth(0).selectOption("A");
  await expect(page.getByLabel("Performance key").nth(0)).toContainText(
    "E Minor",
  );
  await page
    .getByLabel("Arrangement cue")
    .nth(0)
    .fill("Count four, quiet verse");
  await page
    .getByPlaceholder("Load-in, tuning, transitions…")
    .fill("Guitar enters on Chorus\nDrums build during Bridge");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Setlist saved")).toBeVisible();
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

  await page.getByLabel("Open performance menu").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Performance theme").selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: /Band Notes/ }).click();
  await expect(page.getByRole("region", { name: "Band Notes" })).toContainText(
    "Guitar enters on Chorus",
  );
  await page.getByLabel("Open performance menu").click();
  await page.getByRole("button", { name: /Band Notes/ }).click();
  await expect(page.getByRole("region", { name: "Band Notes" })).toHaveCount(0);
  await page.getByLabel("Open performance menu").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByLabel("Transpose up").click();
  await page.getByLabel("Transpose up").click();
  await expect(page.getByLabel("Transpose offset")).toHaveText("+2");
  await expect(page.getByLabel("Current key")).toHaveText("B Major");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByLabel("Transpose offset")).toHaveText("+2");
  await expect(page.getByLabel("Current key")).toHaveText("A Major");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Prev", exact: true }).click();
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
  const firstShareUrl = await shareLink.getAttribute("href");
  expect(firstShareUrl).toMatch(/^\/s\//);
  const publishedResponse = await page.request.get(
    `/api/published-setlists/${firstShareUrl!.split("/").at(-1)}`,
  );
  const publishedSnapshot = await publishedResponse.json();
  expect(publishedSnapshot).not.toHaveProperty("theme");
  await page.goto(firstShareUrl!);
  await expect(page.getByText("Shared setlist")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByText("Count four, quiet verse")).toBeVisible();
  await expect(page.getByText("1 of 2")).toBeVisible();
  await page.getByLabel("Open performance menu").click();
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

  await page.request.delete(
    `/api/published-setlists/${firstShareUrl!.split("/").at(-1)}`,
  );
});
