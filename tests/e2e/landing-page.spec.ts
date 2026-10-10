import { expect, test, type Page } from "./fixtures";

const viewports = [
  { name: "mobile", width: 320, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
];

for (const viewport of viewports) {
  test(`landing page is usable at ${viewport.name} size`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`);
    });

    await page.setViewportSize(viewport);
    await page.goto("/welcome");

    await expect(
      page.getByRole("heading", {
        name: "Your whole set, ready for the stage.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Open App" })).toBeVisible();
    await expect(
      page.getByLabel("SetBook responsive performance screenshots"),
    ).toBeVisible();
    await expect(
      page.getByText("Performance view · desktop, tablet, and mobile", {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByAltText(
        "SetBook performance view showing a two-column chord chart on desktop and tablet",
      ),
    ).toBeVisible();
    await expect(
      page.getByAltText(
        "SetBook mobile performance view showing a responsive single-column chord chart",
      ),
    ).toBeVisible();
    const supportLinks = page.locator(
      'a[href="https://buymeacoffee.com/glennmark"]',
    );
    await expect(supportLinks).toHaveCount(2);
    await expect(supportLinks.first()).toHaveAttribute(
      "href",
      "https://buymeacoffee.com/glennmark",
    );
    await expect(supportLinks.first()).toHaveAttribute("target", "_blank");
    await expectNoPageOverflow(page);

    await page.getByRole("link", { name: "SetBook home" }).focus();
    await expect(
      page.getByRole("link", { name: "SetBook home" }),
    ).toBeFocused();
    const focusedLogoStyle = await page
      .getByRole("link", { name: "SetBook home" })
      .evaluate((element) => getComputedStyle(element).boxShadow);
    expect(focusedLogoStyle).not.toBe("none");

    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}

test("landing calls to action reach the benefits and app", async ({ page }) => {
  await page.goto("/welcome");

  await page.getByRole("link", { name: "See how it works" }).click();
  await expect(page).toHaveURL(/#benefits$/);
  await expect(
    page.getByRole("heading", {
      name: "One calm workspace from first chord to final song.",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Open Song Library/ }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(
    page.getByRole("heading", { name: "Song library" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Buy me a coffee" })).toHaveCount(
    0,
  );
  await page.goto("/about");
  const aboutSupport = page.getByRole("link", { name: "Buy me a coffee" });
  await expect(aboutSupport).toBeVisible();
  await expect(aboutSupport).toHaveAttribute(
    "href",
    "https://buymeacoffee.com/glennmark",
  );
  await expect(aboutSupport).toHaveAttribute("target", "_blank");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(aboutSupport).toBeVisible();
  await expectNoPageOverflow(page);
});

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
