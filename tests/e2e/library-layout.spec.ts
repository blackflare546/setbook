import { expect, test } from "@playwright/test";

const layouts = [
  { name: "mobile", width: 390, height: 844, minimumPadding: 128 },
  { name: "tablet", width: 768, height: 1024, minimumPadding: 160 },
  { name: "desktop", width: 1280, height: 800, minimumPadding: 128 },
];

for (const layout of layouts) {
  test(`keeps bottom clearance in the song library on ${layout.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: layout.width,
      height: layout.height,
    });
    await page.goto("/library");

    const library = page.getByTestId("song-library");
    await expect(library).toBeVisible();
    const bottomPadding = await library.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).paddingBottom),
    );

    expect(bottomPadding).toBeGreaterThanOrEqual(layout.minimumPadding);
  });
}
