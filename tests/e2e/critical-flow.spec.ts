import { test, expect } from "@playwright/test";

test("song, setlist, performance, and persistent publishing flow", async ({
  page,
}) => {
  await page.goto("/songs/new");
  await page.getByLabel("Title").fill("Amazing Grace");
  await page.getByLabel("Artist").fill("Traditional");
  await page
    .getByTestId("smart-paste-input")
    .fill(
      "[Verse 1]\nG       C\nAmazing grace\n[Chorus]\n[G]I once was [D]lost",
    );
  await page.getByTestId("parse-song").click();
  await expect(page.getByText("Chart editor")).toBeVisible();
  await page.getByLabel("Lyrics").first().fill("Amazing grace, how sweet");
  await page.getByTestId("save-song").click();
  await expect(page).toHaveURL(/\/library/);
  await expect(page.getByText("Amazing Grace")).toBeVisible();

  await page.goto("/setlists");
  await page.getByPlaceholder("New setlist name…").fill("Friday Night");
  await page.getByRole("button", { name: "Create setlist" }).click();
  await page.getByLabel("Add song").selectOption({ index: 1 });
  await page.getByLabel("Performance key").fill("A");
  await page.getByLabel("Arrangement cue").fill("Count four, quiet verse");
  await page.getByRole("button", { name: "Save" }).click();
  const editorUrl = page.url();
  await page.getByRole("link", { name: "Perform" }).click();
  await expect(page.getByText("Performance key")).toBeVisible();
  await expect(page.getByText("Count four, quiet verse")).toBeVisible();

  await page.goto(editorUrl);
  await page.getByRole("button", { name: "Publish setlist" }).click();
  const shareLink = page.getByRole("link", { name: "Open public link" });
  await expect(shareLink).toBeVisible();
  const firstShareUrl = await shareLink.getAttribute("href");
  expect(firstShareUrl).toMatch(/^\/s\//);
  await page.goto(firstShareUrl!);
  await expect(page.getByText("Shared setlist")).toBeVisible();
  await expect(page.getByText("Count four, quiet verse")).toBeVisible();

  await page.goto(editorUrl);
  await page.getByLabel("Add song").selectOption({ index: 1 });
  await expect(page.getByText("2 songs")).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
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
});
