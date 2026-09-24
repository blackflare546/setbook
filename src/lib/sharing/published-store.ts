import { del, get, put } from "@vercel/blob";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PublishedSnapshot } from "@/lib/validation/schemas";
import { deserializeSnapshot, serializeSnapshot } from "./snapshot";

const directory = path.join(process.cwd(), "data", "published-setlists");
const blobPath = (token: string) => `published-setlists/${token}.json`;
const localPath = (token: string) => path.join(directory, `${token}.json`);
const shouldUseBlob = () =>
  Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const isVercelRuntime = () =>
  process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);

export class PublishedStoreConfigurationError extends Error {
  constructor() {
    super(
      "Public sharing is not configured. Connect a Vercel Blob store to this project and redeploy.",
    );
    this.name = "PublishedStoreConfigurationError";
  }
}

function usesBlobStorage(): boolean {
  if (shouldUseBlob()) return true;
  if (isVercelRuntime()) throw new PublishedStoreConfigurationError();
  return false;
}

function isMissingLocalFile(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

export function publishedStoreErrorResponse(error: unknown): {
  error: string;
  status: number;
} {
  if (error instanceof PublishedStoreConfigurationError)
    return { error: error.message, status: 503 };
  return {
    error:
      "Published setlist storage is unavailable. Check the Vercel Blob connection and environment configuration.",
    status: 502,
  };
}

export function createPublicToken(length = 8): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function savePublishedSnapshot(
  token: string,
  snapshot: PublishedSnapshot,
): Promise<void> {
  const body = serializeSnapshot(snapshot);
  if (usesBlobStorage()) {
    await put(blobPath(token), body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return;
  }
  await mkdir(directory, { recursive: true });
  await writeFile(localPath(token), body, "utf8");
}

export async function readPublishedSnapshot(
  token: string,
): Promise<PublishedSnapshot | null> {
  if (usesBlobStorage()) {
    const result = await get(blobPath(token), { access: "public" });
    if (!result || result.statusCode !== 200) return null;
    return deserializeSnapshot(await new Response(result.stream).text());
  }
  try {
    return deserializeSnapshot(await readFile(localPath(token), "utf8"));
  } catch (error) {
    if (isMissingLocalFile(error)) return null;
    throw error;
  }
}

export async function deletePublishedSnapshot(token: string): Promise<void> {
  try {
    if (usesBlobStorage()) await del(blobPath(token));
    else await unlink(localPath(token));
  } catch (error) {
    if (isMissingLocalFile(error)) return;
    throw error;
  }
}
