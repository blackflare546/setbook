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
  if (shouldUseBlob()) {
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
  try {
    if (shouldUseBlob()) {
      const result = await get(blobPath(token), { access: "public" });
      if (!result || result.statusCode !== 200) return null;
      return deserializeSnapshot(await new Response(result.stream).text());
    }
    return deserializeSnapshot(await readFile(localPath(token), "utf8"));
  } catch {
    return null;
  }
}

export async function deletePublishedSnapshot(token: string): Promise<void> {
  try {
    if (shouldUseBlob()) await del(blobPath(token));
    else await unlink(localPath(token));
  } catch {
    /* idempotent */
  }
}
