import {
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";

export const test = base.extend<{ tutorialState: void }>({
  tutorialState: [
    async ({ page }, use) => {
      await page.goto("/library");
      await page.locator(".driver-popover").waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      await page.locator(".driver-popover").waitFor({ state: "hidden" });
      await page.waitForFunction(
        () =>
          new Promise<boolean>((resolve) => {
            const request = indexedDB.open("musician-songbook");
            request.onerror = () => resolve(false);
            request.onsuccess = () => {
              const database = request.result;
              const transaction = database.transaction("settings", "readonly");
              const getRequest = transaction.objectStore("settings").get("app");
              getRequest.onerror = () => resolve(false);
              getRequest.onsuccess = () => {
                database.close();
                resolve(getRequest.result?.tutorialVersions?.library === 1);
              };
            };
          }),
      );
      await page.evaluate(
        () =>
          new Promise<void>((resolve, reject) => {
            const request = indexedDB.open("musician-songbook");
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const database = request.result;
              const transaction = database.transaction("settings", "readwrite");
              const store = transaction.objectStore("settings");
              const getRequest = store.get("app");
              getRequest.onerror = () => reject(getRequest.error);
              getRequest.onsuccess = () => {
                store.put({
                  ...(getRequest.result ?? {}),
                  id: "app",
                  tutorialVersions: {
                    library: 1,
                    "song-editor": 1,
                    setlists: 1,
                    "setlist-editor": 1,
                    performance: 1,
                  },
                });
              };
              transaction.onerror = () => reject(transaction.error);
              transaction.oncomplete = () => {
                database.close();
                resolve();
              };
            };
          }),
      );
      await use();
    },
    { auto: true },
  ],
});

export const tutorialSettings = {
  id: "app",
  theme: "light",
  performanceFontSize: 18,
  chartFontSettings: {
    sectionScale: 130,
    chordScale: 100,
    lyricScale: 100,
    lineHeight: 1,
  },
  chartColors: {
    section: "#000000",
    chord: "#4338CA",
    lyric: "#020617",
  },
  darkChartColors: {
    section: "#FFFFFF",
    chord: "#93C5FD",
    lyric: "#FFFFFF",
  },
  chartLayout: "auto",
  hasSeenLandingPage: false,
  tutorialVersions: {
    library: 1,
    "song-editor": 1,
    setlists: 1,
    "setlist-editor": 1,
    performance: 1,
  },
};

export { expect, type Locator, type Page };
