import { expect, test } from "./fixtures";

test("offers a route back to the library when a song is missing", async ({
  page,
}) => {
  await page.goto("/songs/missing-local-song");

  await expect(
    page.getByRole("heading", { name: "Song not found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to library" }),
  ).toHaveAttribute("href", "/library");
});
