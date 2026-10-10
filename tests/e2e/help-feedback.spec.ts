import { expect, test } from "@playwright/test";

test("help feedback form is responsive, keyboard accessible, and validates locally", async ({
  page,
}) => {
  let submissionRequests = 0;
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("request", (request) => {
    if (request.url().includes("formspree.io/f/")) {
      submissionRequests += 1;
    }
  });

  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/help");

  await expect(
    page.getByRole("heading", { name: "Help improve SetBook" }),
  ).toBeVisible();
  await expect(page.getByLabel("Feedback type")).toHaveValue("general");

  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByLabel("Your feedback")).toBeFocused();
  expect(
    await page
      .getByLabel("Your feedback")
      .evaluate(
        (element: HTMLTextAreaElement) => element.validity.valueMissing,
      ),
  ).toBe(true);
  expect(submissionRequests).toBe(0);

  await page.getByLabel("Feedback type").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Your feedback")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel(/Email/)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Send feedback" }),
  ).toBeFocused();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    )
    .toBe(true);

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(
    page.getByRole("heading", { name: "Help improve SetBook" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    )
    .toBe(true);
  expect(runtimeErrors).toEqual([]);
});
