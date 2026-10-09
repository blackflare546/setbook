import { z } from "zod";
import type { Song } from "@/core/songs/types";
import { parseText, sectionsToText } from "@/core/parser/parser";

const SONG_QR_PREFIX = "setbook:song:v1";
const FUTURE_SONG_QR_RE = /^setbook:song:v(\d+):/;

export const songTransferV1Schema = z.object({
  version: z.literal(1),
  title: z.string().min(1),
  artist: z.string(),
  originalKey: z.string(),
  capo: z.number().int().min(1).max(12).nullable(),
  tags: z.array(z.string()),
  notes: z.string(),
  links: z.object({
    audio: z.url().optional(),
    reference: z.url().optional(),
  }),
  chartText: z.string(),
});

const compactSongTransferSchema = z.object({
  v: z.literal(1),
  t: z.string(),
  a: z.string(),
  k: z.string(),
  c: z.number().nullable(),
  g: z.array(z.string()),
  n: z.string(),
  l: z.object({ a: z.string().optional(), r: z.string().optional() }),
  s: z.string(),
});

export type SongTransferV1 = z.infer<typeof songTransferV1Schema>;

export class SongTransferError extends Error {
  constructor(
    message: string,
    readonly code: "invalid" | "unsupported-version" | "too-large",
  ) {
    super(message);
    this.name = "SongTransferError";
  }
}

export function createSongTransfer(song: Song): SongTransferV1 {
  return {
    version: 1,
    title: song.title,
    artist: song.artist,
    originalKey: song.originalKey,
    capo: song.capo,
    tags: song.tags,
    notes: song.notes,
    links: song.links,
    chartText: sectionsToText(song.sections),
  };
}

function toCompact(transfer: SongTransferV1) {
  return {
    v: 1 as const,
    t: transfer.title,
    a: transfer.artist,
    k: transfer.originalKey,
    c: transfer.capo,
    g: transfer.tags,
    n: transfer.notes,
    l: { a: transfer.links.audio, r: transfer.links.reference },
    s: transfer.chartText,
  };
}

function fromCompact(value: unknown): SongTransferV1 {
  const compact = compactSongTransferSchema.parse(value);
  return songTransferV1Schema.parse({
    version: 1,
    title: compact.t,
    artist: compact.a,
    originalKey: compact.k,
    capo: compact.c,
    tags: compact.g,
    notes: compact.n,
    links: { audio: compact.l.a, reference: compact.l.r },
    chartText: compact.s,
  });
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function compress(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  const stream = byteStream(bytes).pipeThrough(
    new CompressionStream("gzip") as unknown as TransformStream<
      Uint8Array,
      Uint8Array
    >,
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompress(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new SongTransferError(
      "This browser cannot read compressed SetBook song QR codes.",
      "invalid",
    );
  }
  const stream = byteStream(bytes).pipeThrough(
    new DecompressionStream("gzip") as unknown as TransformStream<
      Uint8Array,
      Uint8Array
    >,
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function byteStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

export async function encodeSongTransfer(
  transfer: SongTransferV1,
): Promise<string> {
  const validated = songTransferV1Schema.parse(transfer);
  const bytes = new TextEncoder().encode(JSON.stringify(toCompact(validated)));
  const compressed = await compress(bytes);
  return compressed
    ? `${SONG_QR_PREFIX}:g:${bytesToBase64Url(compressed)}`
    : `${SONG_QR_PREFIX}:j:${bytesToBase64Url(bytes)}`;
}

export async function decodeSongTransfer(raw: string): Promise<SongTransferV1> {
  const value = raw.trim();
  const futureVersion = value.match(FUTURE_SONG_QR_RE);
  if (futureVersion && futureVersion[1] !== "1") {
    throw new SongTransferError(
      "This song QR was created by a newer SetBook version. Update SetBook to import it.",
      "unsupported-version",
    );
  }
  const match = value.match(/^setbook:song:v1:(g|j):([A-Za-z0-9_-]+)$/);
  if (!match) {
    throw new SongTransferError(
      "This is not a valid SetBook song QR code.",
      "invalid",
    );
  }
  try {
    const encoded = base64UrlToBytes(match[2]);
    const bytes = match[1] === "g" ? await decompress(encoded) : encoded;
    return fromCompact(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (error) {
    if (error instanceof SongTransferError) throw error;
    throw new SongTransferError(
      "This SetBook song QR code is damaged or invalid.",
      "invalid",
    );
  }
}

export function serializeSongTransferFile(transfer: SongTransferV1): string {
  return JSON.stringify(songTransferV1Schema.parse(transfer), null, 2);
}

export function deserializeSongTransferFile(raw: string): SongTransferV1 {
  try {
    const value = JSON.parse(raw);
    if (value?.version && value.version !== 1) {
      throw new SongTransferError(
        "This song file was created by a newer SetBook version. Update SetBook to import it.",
        "unsupported-version",
      );
    }
    return songTransferV1Schema.parse(value);
  } catch (error) {
    if (error instanceof SongTransferError) throw error;
    throw new SongTransferError(
      "That file is not a valid SetBook song file.",
      "invalid",
    );
  }
}

function normalizedIdentity(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function songTransferIdentity(transfer: SongTransferV1): string {
  return `${normalizedIdentity(transfer.title)}\u0000${normalizedIdentity(transfer.artist)}`;
}

export function songTransferFingerprint(transfer: SongTransferV1): string {
  const normalized = {
    ...songTransferV1Schema.parse(transfer),
    title: transfer.title.trim().replace(/\s+/g, " "),
    artist: transfer.artist.trim().replace(/\s+/g, " "),
    tags: transfer.tags.map((tag) => tag.trim()).toSorted(),
    chartText: sectionsToText(parseText(transfer.chartText)),
  };
  const input = JSON.stringify(normalized);
  let hash = BigInt("14695981039346656037");
  const prime = BigInt("1099511628211");
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(36);
}

export function songFileName(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 80)
    .replace(/-$/g, "");
  return `${slug || "setbook-song"}.setbook-song.json`;
}
