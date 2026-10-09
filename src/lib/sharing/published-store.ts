import {
  BlobNotFoundError,
  BlobPreconditionFailedError,
  del,
  get,
  head,
  put,
} from "@vercel/blob";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  sharedSetlistRecordSchema,
  type PublishedSnapshot,
  type SharedSetlistRecord,
} from "@/lib/validation/schemas";

const directory = path.join(process.cwd(), "data", "published-setlists");
export const SHARED_SETLIST_BLOB_PREFIX = "setbook-shared-setlists";
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

export class SharedRecordConflictError extends Error {
  constructor() {
    super("The shared setlist changed before this operation completed.");
    this.name = "SharedRecordConflictError";
  }
}

function serverSecret(): string {
  const value = process.env.SHARE_CAPABILITY_SECRET;
  if (value) return value;
  if (isVercelRuntime()) throw new PublishedStoreConfigurationError();
  return "setbook-local-development-capability-secret";
}

export const recordBlobPath = (token: string) =>
  `${SHARED_SETLIST_BLOB_PREFIX}/${token}.json`;
const recordLocalPath = (token: string) =>
  path.join(directory, `${token}.json`);

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
  if (
    error instanceof SharedRecordConflictError ||
    error instanceof BlobPreconditionFailedError
  )
    return {
      error:
        "Someone updated this setlist. Load the latest version before saving.",
      status: 409,
    };
  return {
    error:
      "Shared setlist storage is unavailable. Check the Vercel Blob connection and environment configuration.",
    status: 502,
  };
}

export function createPublicToken(length = 20): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function createCapability(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
    "base64url",
  );
}

export function capabilityVerifier(capability: string): string {
  return createHmac("sha256", serverSecret())
    .update(`capability:${capability}`)
    .digest("base64url");
}

export function capabilityMatches(
  capability: string | null,
  verifier: string | null,
): boolean {
  if (!capability || !verifier) return false;
  const actual = Buffer.from(capabilityVerifier(capability));
  const expected = Buffer.from(verifier);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function localEtag(body: string): string {
  return `\"${createHash("sha256").update(body).digest("hex")}\"`;
}

export interface StoredSharedRecord {
  record: SharedSetlistRecord;
  etag: string;
}

export async function createSharedRecord(
  record: SharedSetlistRecord,
): Promise<string> {
  const body = JSON.stringify(sharedSetlistRecordSchema.parse(record));
  if (usesBlobStorage()) {
    const result = await put(recordBlobPath(record.publicToken), body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return result.etag;
  }
  await mkdir(directory, { recursive: true });
  await writeFile(recordLocalPath(record.publicToken), body, {
    encoding: "utf8",
    flag: "wx",
  });
  return localEtag(body);
}

export async function readSharedRecord(
  token: string,
): Promise<StoredSharedRecord | null> {
  if (usesBlobStorage()) {
    const pathname = recordBlobPath(token);
    let metadata;
    let result;
    try {
      metadata = await head(pathname);
      const versionedUrl = new URL(metadata.url);
      versionedUrl.searchParams.set("setbook-etag", metadata.etag);
      result = await get(versionedUrl.toString(), { access: "public" });
    } catch (error) {
      if (error instanceof BlobNotFoundError) return null;
      throw error;
    }
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const body = await new Response(result.stream).text();
    return {
      record: sharedSetlistRecordSchema.parse(JSON.parse(body)),
      etag: result.blob.etag || metadata.etag,
    };
  }
  try {
    const body = await readFile(recordLocalPath(token), "utf8");
    return {
      record: sharedSetlistRecordSchema.parse(JSON.parse(body)),
      etag: localEtag(body),
    };
  } catch (error) {
    if (isMissingLocalFile(error)) return null;
    throw error;
  }
}

export async function replaceSharedRecord(
  record: SharedSetlistRecord,
  expectedEtag: string,
): Promise<string> {
  const body = JSON.stringify(sharedSetlistRecordSchema.parse(record));
  if (usesBlobStorage()) {
    const result = await put(recordBlobPath(record.publicToken), body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      ifMatch: expectedEtag,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return result.etag;
  }
  const pathname = recordLocalPath(record.publicToken);
  let current: string;
  try {
    current = await readFile(pathname, "utf8");
  } catch (error) {
    if (isMissingLocalFile(error)) throw new SharedRecordConflictError();
    throw error;
  }
  if (localEtag(current) !== expectedEtag)
    throw new SharedRecordConflictError();
  const temporary = `${pathname}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, body, "utf8");
  await rename(temporary, pathname);
  return localEtag(body);
}

export async function deleteSharedRecord(token: string): Promise<void> {
  if (usesBlobStorage()) {
    try {
      await del(recordBlobPath(token));
    } catch (error) {
      if (error instanceof BlobNotFoundError) return;
      throw error;
    }
    return;
  }
  const pathname = recordLocalPath(token);
  try {
    await unlink(pathname);
  } catch (error) {
    if (isMissingLocalFile(error)) return;
    throw error;
  }
}

export async function readPublishedSnapshot(
  token: string,
): Promise<PublishedSnapshot | null> {
  return (await readSharedRecord(token))?.record.snapshot ?? null;
}
