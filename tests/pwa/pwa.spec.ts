import { expect, test } from "@playwright/test";

const emulateStandalone = () => {
  const browserMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = (query: string) =>
    query === "(display-mode: standalone)"
      ? ({
          matches: true,
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent: () => false,
        } as MediaQueryList)
      : browserMatchMedia(query);
};

test("serves an installable manifest and secured service worker", async ({
  page,
  request,
}) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    id: "/",
    short_name: "SetBook",
    start_url: "/library",
    scope: "/",
    display: "standalone",
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]),
  );

  const workerResponse = await request.get("/sw.js");
  expect(workerResponse.ok()).toBe(true);
  expect(workerResponse.headers()["content-type"]).toContain(
    "application/javascript",
  );
  expect(workerResponse.headers()["cache-control"]).toContain("no-store");
  expect(workerResponse.headers()["content-security-policy"]).toBe(
    "default-src 'self'; script-src 'self'",
  );

  await page.goto("/library");
  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator)) return false;
    await navigator.serviceWorker.ready;
    return Boolean(navigator.serviceWorker.controller);
  });
});

test("keeps local routes available offline without caching APIs", async ({
  context,
  page,
}) => {
  await page.goto("/library");
  await page.waitForFunction(async () => {
    await navigator.serviceWorker.ready;
    return Boolean(navigator.serviceWorker.controller);
  });

  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("musician-songbook");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("songs", "readwrite");
          transaction.objectStore("songs").put({
            id: "offline-song",
            title: "Offline Song",
            artist: "SetBook",
            originalKey: "C",
            capo: null,
            tags: [],
            sections: [
              {
                id: "offline-section",
                type: "verse",
                title: "Verse 1",
                lines: [
                  {
                    id: "offline-line",
                    lyrics: "Ready when the network is gone",
                    chords: [{ id: "offline-chord", symbol: "C", position: 0 }],
                  },
                ],
              },
            ],
            notes: "",
            links: {},
            sourceText: "[Verse 1]\nC\nReady when the network is gone",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
        };
      }),
  );

  await page.reload();
  await expect(page.getByText("Offline Song")).toBeVisible();
  await page.goto("/songs/offline-song");
  await expect(page.getByText("Ready when the network is gone")).toBeVisible();
  await page.evaluate(() => fetch("/api/health").then((response) => response.text()));

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Ready when the network is gone")).toBeVisible();
  await page.goto("/library");
  await expect(page.getByText("Offline Song")).toBeVisible();
  await page.goto("/setlists");
  await expect(
    page.getByRole("heading", { name: "Setlists", exact: true }),
  ).toBeVisible();

  const apiResult = await page.evaluate(async () => {
    try {
      await fetch(`/api/health?offline=${Date.now()}`);
      return "resolved";
    } catch {
      return "rejected";
    }
  });
  expect(apiResult).toBe("rejected");

  await page.goto("/songs/not-previously-visited");
  await expect(page.getByRole("heading", { name: "You’re offline" })).toBeVisible();
});

test("offers installation after organic library onboarding and remembers dismissal", async ({
  page,
}) => {
  await page.goto("/library");
  await page.locator(".driver-popover").waitFor({ state: "visible" });
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => undefined,
      userChoice: Promise.resolve({ outcome: "dismissed", platform: "web" }),
    });
    window.dispatchEvent(event);
  });

  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Keep SetBook ready for the stage" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(
    page.getByRole("heading", { name: "Keep SetBook ready for the stage" }),
  ).toHaveCount(0);

  await page.reload();
  await page.waitForTimeout(1_500);
  await expect(
    page.getByRole("heading", { name: "Keep SetBook ready for the stage" }),
  ).toHaveCount(0);
  await page.goto("/help");
  await expect(
    page.getByRole("heading", { name: "Install SetBook", exact: true }),
  ).toBeVisible();
});

test("keeps an install prompt captured before React hydration", async ({
  context,
  page,
}) => {
  await context.addInitScript(() => {
    const promptEvent = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(promptEvent, {
      prompt: async () => {
        window.sessionStorage.setItem("setbook-install-prompt-called", "yes");
      },
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
    });
    window.__setbookInstallPrompt = promptEvent as unknown as NonNullable<
      typeof window.__setbookInstallPrompt
    >;
  });

  await page.goto("/help");
  await page.getByRole("button", { name: "Install SetBook" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.sessionStorage.getItem("setbook-install-prompt-called"),
      ),
    )
    .toBe("yes");
});

test("gives manual browser instructions when no native prompt is available", async ({
  page,
}) => {
  await page.goto("/about");
  await page.getByRole("button", { name: "Show install options" }).click();
  await expect(
    page.getByText("Chrome has not made its native prompt available yet."),
  ).toBeVisible();
});

test("detects standalone mode and handles persistent storage outcomes", async ({
  browser,
}) => {
  for (const outcome of ["granted", "denied", "unsupported"] as const) {
    const context = await browser.newContext();
    await context.addInitScript(emulateStandalone);
    await context.addInitScript((storageOutcome) => {
      const storage =
        storageOutcome === "unsupported"
          ? {}
          : {
              persisted: async () => false,
              persist: async () => storageOutcome === "granted",
            };
      Object.defineProperty(navigator, "storage", {
        configurable: true,
        value: storage,
      });
    }, outcome);

    const page = await context.newPage();
    await page.goto("/help");
    await expect(page.getByText("Installed", { exact: true })).toBeVisible();
    const protectionButton = page.getByRole("button", {
      name: "Protect offline data",
    });
    await protectionButton.click();
    if (outcome === "granted") {
      await expect(protectionButton).toHaveCount(0);
    } else {
      await expect(protectionButton).toBeVisible();
    }
    await context.close();
  }
});

test("a successful backup import starts the installed-app reminder cooldown", async ({
  page,
}) => {
  await page.addInitScript(emulateStandalone);
  await page.goto("/library");
  await expect(page.getByTestId("song-library")).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("musician-songbook");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("songs", "readwrite");
          transaction.objectStore("songs").put({
            id: "backup-reminder-song",
            title: "Back Me Up",
            artist: "SetBook",
            originalKey: "C",
            capo: null,
            tags: [],
            sections: [],
            notes: "",
            links: {},
            sourceText: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
        };
      }),
  );

  await page.reload();
  await expect(page.getByText("Back Me Up")).toBeVisible();
  await page.locator(".driver-popover").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.locator(".driver-popover").waitFor({ state: "hidden" });

  await expect(
    page.getByRole("heading", { name: "Keep a fresh backup" }),
  ).toBeVisible();
  await page
    .locator('input[type="file"][accept="application/json"]')
    .setInputFiles({
      name: "recent-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          version: 1,
          exportedAt: new Date().toISOString(),
          songs: [],
          setlists: [],
          settings: [],
        }),
      ),
    });
  await page
    .getByRole("dialog", { name: "Import this backup?" })
    .getByRole("button", { name: "Import new items" })
    .click();
  await expect(
    page.getByText("Nothing new to import; duplicates were skipped", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Keep a fresh backup" }),
  ).toHaveCount(0);

  const reminderTimestamp = await page.evaluate(
    () =>
      new Promise<string | undefined>((resolve, reject) => {
        const request = indexedDB.open("musician-songbook");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("settings", "readonly");
          const settingsRequest = transaction.objectStore("settings").get("app");
          settingsRequest.onerror = () => reject(settingsRequest.error);
          settingsRequest.onsuccess = () => {
            resolve(settingsRequest.result?.lastBackupReminderAt);
            database.close();
          };
        };
      }),
  );
  expect(Date.parse(reminderTimestamp ?? "")).not.toBeNaN();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Keep a fresh backup" }),
  ).toHaveCount(0);
});
