import { expect, test } from "./fixtures";

test("shows a recovery path when an edited song no longer exists", async ({
  page,
}) => {
  await page.goto("/songs/missing-local-song/edit");

  await expect(
    page.getByRole("heading", { name: "Song not found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to library" }),
  ).toHaveAttribute("href", "/library");
});

test("confirms before discarding a new song draft", async ({ page }) => {
  await page.goto("/songs/new");
  await page.getByLabel("Title").fill("Unsaved draft");

  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Discard unsaved changes?",
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Title")).toHaveValue("Unsaved draft");

  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await dialog.getByRole("button", { name: "Discard changes" }).click();
  await expect(page).toHaveURL(/\/library$/);
});

test("rejects structurally invalid chart edits before saving", async ({
  page,
}) => {
  await page.goto("/songs/new");
  await page.getByLabel("Title").fill("Validation draft");
  await page.getByTestId("smart-paste-input").fill("[Verse]\nG\nLyrics");
  await page.getByTestId("parse-song").click();

  await page.getByLabel(/Chord 1 symbol/).fill("");
  await page.getByTestId("save-song").click();
  await expect(
    page.getByRole("alert").filter({
      hasText: "Chord symbols cannot be empty.",
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/songs\/new$/);
});

test("regenerates Smart Paste source after structured chart edits", async ({
  page,
}) => {
  await page.goto("/songs/new");
  await page.getByLabel("Title").fill("Regenerated source");
  await page
    .getByTestId("smart-paste-input")
    .fill("[Verse]\nG\nOriginal lyric");
  await page.getByTestId("parse-song").click();

  await page.getByLabel(/Lyrics, Verse line 1/).fill("Updated lyric");
  await page.getByTestId("save-song").click();
  await expect(page.getByText("Song view")).toBeVisible();
  await page.getByRole("link", { name: /Edit song/ }).click();

  await expect(page.getByTestId("smart-paste-input")).toHaveValue(
    "[Verse]\nG\nUpdated lyric",
  );
});
