import QRCode from "qrcode";

const IMAGE_WIDTH = 960;
const QR_SIZE = 920;
const QR_OFFSET = 20;
const SINGLE_LINE_HEIGHT = 1040;
const DOUBLE_LINE_HEIGHT = 1090;
const MAX_DECODE_SIZE = 1600;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The image could not be loaded."));
    image.src = source;
  });
}

async function loadFileImage(file: File): Promise<HTMLImageElement> {
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Choose an image file containing a SetBook QR code.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Choose a QR image smaller than 20 MB.");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    return await loadImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function truncateLine(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
): string {
  if (context.measureText(value).width <= maxWidth) return value;
  let shortened = value;
  while (
    shortened.length > 1 &&
    context.measureText(`${shortened}…`).width > maxWidth
  ) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened.trimEnd()}…`;
}

function fitTitleLines(
  context: CanvasRenderingContext2D,
  title: string,
  maxWidth: number,
): string[] {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ["Untitled"];

  const lines = [""];
  for (const word of words) {
    const lineIndex = lines.length - 1;
    const candidate = lines[lineIndex] ? `${lines[lineIndex]} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      lines[lineIndex] = candidate;
    } else if (lines.length === 1) {
      lines.push(word);
    } else {
      lines[1] = `${lines[1]} ${word}`;
    }
  }
  return lines.slice(0, 2).map((line) => truncateLine(context, line, maxWidth));
}

function formatDate(value?: string): string | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export async function createSetlistQrImageDataUrl({
  value,
  title,
  venue,
  date,
}: {
  value: string;
  title: string;
  venue?: string;
  date?: string;
}): Promise<string> {
  const qrCanvas = document.createElement("canvas");
  const [, logoImage] = await Promise.all([
    QRCode.toCanvas(qrCanvas, value, {
      width: QR_SIZE,
      margin: 4,
      errorCorrectionLevel: "H",
      color: { dark: "#111827", light: "#FFFFFF" },
    }),
    loadImage("/setbook-mark.svg").catch(() => null),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_WIDTH;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available.");

  context.font = "700 48px Geist, Arial, sans-serif";
  const titleLines = fitTitleLines(context, title, 856);
  const details = [venue?.trim() || null, formatDate(date)]
    .filter((detail): detail is string => Boolean(detail))
    .join(" · ");
  const baseHeight =
    titleLines.length === 1 ? SINGLE_LINE_HEIGHT : DOUBLE_LINE_HEIGHT;
  canvas.height = baseHeight + (details ? 52 : 0);

  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, IMAGE_WIDTH, canvas.height);
  context.imageSmoothingEnabled = false;
  context.drawImage(qrCanvas, QR_OFFSET, QR_OFFSET, QR_SIZE, QR_SIZE);
  context.imageSmoothingEnabled = true;

  const plateSize = 116;
  const markSize = 96;
  const plateOffset = (IMAGE_WIDTH - plateSize) / 2;
  roundedRect(
    context,
    plateOffset,
    plateOffset,
    plateSize,
    plateSize,
    plateSize * 0.22,
  );
  context.fillStyle = "#FFFFFF";
  context.fill();
  if (logoImage) {
    const markOffset = (IMAGE_WIDTH - markSize) / 2;
    context.drawImage(logoImage, markOffset, markOffset, markSize, markSize);
  }

  context.fillStyle = "#111827";
  context.font = "700 48px Geist, Arial, sans-serif";
  context.textAlign = "center";
  const firstBaseline = titleLines.length === 1 ? 998 : 992;
  titleLines.forEach((line, index) =>
    context.fillText(line, IMAGE_WIDTH / 2, firstBaseline + index * 58),
  );
  if (details) {
    context.fillStyle = "#64748B";
    context.font = "500 30px Geist, Arial, sans-serif";
    context.fillText(
      truncateLine(context, details, 856),
      IMAGE_WIDTH / 2,
      firstBaseline + (titleLines.length - 1) * 58 + 43,
    );
  }
  return canvas.toDataURL("image/png");
}

function imageCanvas(
  image: HTMLImageElement,
  sourceX = 0,
  sourceY = 0,
  sourceWidth = image.naturalWidth,
  sourceHeight = image.naturalHeight,
): HTMLCanvasElement {
  const scale = Math.min(
    1,
    MAX_DECODE_SIZE / Math.max(sourceWidth, sourceHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Image canvas is unavailable.");
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}

export async function decodeQrImageFile(file: File): Promise<string> {
  const [{ BrowserQRCodeReader }, image] = await Promise.all([
    import("@zxing/browser"),
    loadFileImage(file),
  ]);
  const reader = new BrowserQRCodeReader();

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width < 1 || height < 1) {
    throw new Error("That image is empty or unsupported.");
  }
  if (Math.max(width, height) <= MAX_DECODE_SIZE) {
    try {
      return (await reader.decodeFromImageElement(image)).getText();
    } catch {
      // Canvas decoding below can recover QR codes surrounded by captions.
    }
  }

  const candidates: Array<
    [sourceX: number, sourceY: number, width: number, height: number]
  > = [[0, 0, width, height]];
  if (width !== height) {
    const square = Math.min(width, height);
    const centeredX = (width - square) / 2;
    const centeredY = (height - square) / 2;
    candidates.push([centeredX, 0, square, square]);
    if (centeredY > 0) {
      candidates.push([centeredX, centeredY, square, square]);
      candidates.push([centeredX, height - square, square, square]);
    }
  }

  for (const [sourceX, sourceY, sourceWidth, sourceHeight] of candidates) {
    const canvas = imageCanvas(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
    );
    try {
      return reader.decodeFromCanvas(canvas).getText();
    } catch {
      // Continue until every useful crop has been checked.
    } finally {
      canvas.width = 1;
      canvas.height = 1;
    }
  }
  throw new Error("No readable SetBook QR code was found in that image.");
}
