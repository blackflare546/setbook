import { expect, test, tutorialSettings, type Page } from "./fixtures";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import {
  encodeSongTransfer,
  type SongTransferV1,
} from "../../src/lib/song-transfer/song-transfer";

const transfer: SongTransferV1 = {
  version: 1,
  title: "Worthy — Dakila",
  artist: "SetBook Team",
  originalKey: "D",
  capo: 2,
  tags: ["worship", "Tagalog"],
  notes: "Lead softly into the chorus.",
  links: { audio: "https://example.com/audio" },
  chartText: `[Verse]
D/F#                 G
Dakila Ka, O Diyos

[Chorus]
Bm              A
Worthy of it all`,
};

async function qrImage(value: SongTransferV1) {
  return QRCode.toBuffer(await encodeSongTransfer(value), {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 720,
  });
}

async function uploadQr(page: Page, value: SongTransferV1) {
  await page.getByLabel("Upload QR image").setInputFiles({
    name: "setbook-song.png",
    mimeType: "image/png",
    buffer: await qrImage(value),
  });
}

test("imports an offline song QR, prevents exact duplicates, and handles changed matches", async ({
  page,
}) => {
  await page.goto("/library");
  await page.getByLabel("Theme").selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Scan song QR" }).click();
  await expect(
    page.getByRole("heading", { name: "Scan a song QR" }),
  ).toBeVisible();
  await expect(
    page.getByText("Camera access is unavailable", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCSS(
    "background-color",
    "rgb(32, 38, 46)",
  );

  await uploadQr(page, transfer);
  await expect(
    page.getByRole("heading", { name: "Review song import" }),
  ).toBeVisible();
  await expect(page.getByText("D/F#", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Import song" }).click();
  await expect(page.getByText("Song imported")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: transfer.title }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: `Show QR for ${transfer.title}` })
    .click();
  const exportedQr = page.getByRole("img", {
    name: `Song QR code for ${transfer.title}`,
  });
  await expect(exportedQr).toHaveAttribute("src", /^data:image\/png;base64,/);
  await expect(
    page.getByText("The complete song is inside this QR", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close song QR" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: `Song actions for ${transfer.title}` })
    .click();
  await page.getByRole("menuitem", { name: "Show QR" }).click();
  await expect(
    page.getByRole("img", { name: `Song QR code for ${transfer.title}` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close song QR" }).click();

  await page.getByRole("button", { name: "Scan song QR" }).click();
  await uploadQr(page, transfer);
  await expect(
    page.getByText("This exact song is already in your library", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open existing" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByTestId(/^song-row-/)).toHaveCount(1);

  await page.getByRole("button", { name: "Scan song QR" }).click();
  await uploadQr(page, { ...transfer, notes: "Updated arrangement cue" });
  await expect(
    page.getByText("already exists with different content", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Keep both" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Replace existing" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep both" }).click();
  await expect(page.getByTestId(/^song-row-/)).toHaveCount(2);
});

test("offers a single-song file when the chart is too large for one QR", async ({
  page,
}) => {
  const now = new Date().toISOString();
  const noisyNotes = randomBytes(12_000).toString("base64");
  const backup = {
    version: 1,
    exportedAt: now,
    songs: [
      {
        id: "large-song",
        title: "Large Song",
        artist: "SetBook Test",
        originalKey: "C",
        capo: null,
        tags: [],
        sections: [
          {
            id: "large-section",
            type: "verse",
            title: "Verse",
            lines: [
              {
                id: "large-line",
                lyrics: "A readable lyric",
                chords: [{ id: "large-chord", symbol: "C", position: 0 }],
              },
            ],
          },
        ],
        notes: noisyNotes,
        links: {},
        sourceText: "[Verse]\nC\nA readable lyric",
        createdAt: now,
        updatedAt: now,
      },
    ],
    setlists: [],
    settings: [tutorialSettings],
  };

  await page.goto("/library");
  const restoredDialog = page.waitForEvent("dialog");
  await page.locator('input[accept="application/json"]').setInputFiles({
    name: "large-song-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await (await restoredDialog).accept();

  await page.getByRole("button", { name: "Show QR for Large Song" }).click();
  await expect(
    page.getByRole("heading", {
      name: "This song is too large for one reliable QR",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download song file" }),
  ).toBeVisible();
});
