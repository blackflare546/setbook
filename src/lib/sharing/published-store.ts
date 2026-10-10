import {
  BlobNotFoundError,
  BlobPreconditionFailedError,
  del,
  get,
  head,
  list,
  put,
} from "@vercel/blob";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  publishedSnapshotSchema,
  sharedSetlistRecordSchema,
  type PublishedSnapshot,
  type SharedSetlistRecord,
} from "@/lib/validation/schemas";

const directory = path.join(process.cwd(), "data", "published-setlists");
export const SHARED_SETLIST_BLOB_PREFIX = "setbook-shared-setlists";
export const HISTORICAL_V2_BLOB_PREFIX = "shared-setlists-v2";
export const LEGACY_BLOB_PREFIX = "published-setlists";
const CLEANUP_STATE_BLOB_PATH =
  "setbook-maintenance/published-setlists-cleanup.json";
const cleanupStateLocalPath = path.join(directory, ".cleanup-state.json");
const DEFAULT_RETENTION_DAYS = 30;
export const CLEANUP_BATCH_SIZE = 100;

const shouldUseBlob = () =>
  Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const isVercelRuntime = () =>
  process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);

export class PublishedStoreConfigurationError extends Error {
  constructor(message?: string) {
    super(
      message ??
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

function historicalRecordKey(token: string): string {
  return createHmac("sha256", serverSecret())
    .update(`record:${token}`)
    .digest("hex");
}

export const recordBlobPath = (token: string) =>
  `${SHARED_SETLIST_BLOB_PREFIX}/${token}.json`;
export const historicalRecordBlobPath = (token: string) =>
  `${HISTORICAL_V2_BLOB_PREFIX}/${historicalRecordKey(token)}.json`;
export const legacyBlobPath = (token: string) =>
  `${LEGACY_BLOB_PREFIX}/${token}.json`;
const recordLocalPath = (token: string) => path.join(directory, `${token}.json`);
const historicalRecordLocalPath = (token: string) =>
  path.join(directory, `v2-${historicalRecordKey(token)}.json`);
const legacyLocalPath = recordLocalPath;

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
      error: "The setlist changed while it was being saved. Please try again.",
      status: 409,
    };
  return {
    error:
      "Shared setlist storage is unavailable. Check the Vercel Blob connection and environment configuration.",
    status: 502,
  };
}

export function publicationRetentionDays(): number {
  const raw = process.env.PUBLISHED_SETLIST_RETENTION_DAYS;
  if (!raw) return DEFAULT_RETENTION_DAYS;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new PublishedStoreConfigurationError(
      "PUBLISHED_SETLIST_RETENTION_DAYS must be a positive integer.",
    );
  return value;
}

export function publicationExpiration(now = new Date()): string {
  return new Date(
    now.getTime() + publicationRetentionDays() * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export function isPublicationExpired(
  record: SharedSetlistRecord,
  now = new Date(),
): boolean {
  if (!record.expiresAt) return false;
  const expiresAt = Date.parse(record.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= now.getTime();
}

export function isPublicationAvailable(
  record: SharedSetlistRecord,
  now = new Date(),
): boolean {
  return record.status !== "revoked" && !isPublicationExpired(record, now);
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

type SharedRecordLocation = "current" | "historical-v2";

export interface StoredSharedRecord {
  record: SharedSetlistRecord;
  etag: string;
  location: SharedRecordLocation;
  pathname: string;
}

function locationPath(token: string, location: SharedRecordLocation): string {
  if (usesBlobStorage())
    return location === "current"
      ? recordBlobPath(token)
      : historicalRecordBlobPath(token);
  return location === "current"
    ? recordLocalPath(token)
    : historicalRecordLocalPath(token);
}

async function readBlobBody(pathname: string): Promise<{
  body: string;
  etag: string;
} | null> {
  try {
    const metadata = await head(pathname);
    const versionedUrl = new URL(metadata.url);
    versionedUrl.searchParams.set("setbook-etag", metadata.etag);
    const result = await get(versionedUrl.toString(), { access: "public" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return {
      body: await new Response(result.stream).text(),
      etag: metadata.etag,
    };
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }
}

async function readStoredAt(
  pathname: string,
  location: SharedRecordLocation,
): Promise<StoredSharedRecord | null> {
  let stored: { body: string; etag: string } | null;
  if (usesBlobStorage()) stored = await readBlobBody(pathname);
  else {
    try {
      const body = await readFile(pathname, "utf8");
      stored = { body, etag: localEtag(body) };
    } catch (error) {
      if (isMissingLocalFile(error)) return null;
      throw error;
    }
  }
  if (!stored) return null;
  const json = JSON.parse(stored.body);
  const parsed = sharedSetlistRecordSchema.safeParse(json);
  if (!parsed.success && publishedSnapshotSchema.safeParse(json).success)
    return null;
  if (!parsed.success) throw parsed.error;
  return {
    record: parsed.data,
    etag: stored.etag,
    location,
    pathname,
  };
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
  const current = await readStoredAt(
    locationPath(token, "current"),
    "current",
  );
  if (current) return current;
  return readStoredAt(
    locationPath(token, "historical-v2"),
    "historical-v2",
  );
}

export async function replaceSharedRecord(
  stored: StoredSharedRecord,
  record: SharedSetlistRecord,
): Promise<StoredSharedRecord> {
  const body = JSON.stringify(sharedSetlistRecordSchema.parse(record));
  if (usesBlobStorage()) {
    const result = await put(stored.pathname, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      ifMatch: stored.etag,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return { ...stored, record, etag: result.etag };
  }
  let current: string;
  try {
    current = await readFile(stored.pathname, "utf8");
  } catch (error) {
    if (isMissingLocalFile(error)) throw new SharedRecordConflictError();
    throw error;
  }
  if (localEtag(current) !== stored.etag) throw new SharedRecordConflictError();
  const temporary = `${stored.pathname}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, body, "utf8");
  await rename(temporary, stored.pathname);
  return { ...stored, record, etag: localEtag(body) };
}

async function deleteLegacySnapshot(token: string): Promise<void> {
  if (usesBlobStorage()) {
    await del(legacyBlobPath(token));
    return;
  }
  try {
    const body = await readFile(legacyLocalPath(token), "utf8");
    if (sharedSetlistRecordSchema.safeParse(JSON.parse(body)).success) return;
    await unlink(legacyLocalPath(token));
  } catch (error) {
    if (isMissingLocalFile(error)) return;
    throw error;
  }
}

export async function deleteSharedRecord(
  stored: StoredSharedRecord,
): Promise<void> {
  if (usesBlobStorage()) {
    try {
      await del(stored.pathname, { ifMatch: stored.etag });
    } catch (error) {
      if (error instanceof BlobNotFoundError) return;
      throw error;
    }
    return;
  }
  try {
    const body = await readFile(stored.pathname, "utf8");
    if (localEtag(body) !== stored.etag) throw new SharedRecordConflictError();
    await unlink(stored.pathname);
  } catch (error) {
    if (isMissingLocalFile(error)) return;
    throw error;
  }
}

export async function revokeAndDeleteSharedRecord(
  stored: StoredSharedRecord,
): Promise<void> {
  let revoked = stored;
  if (stored.record.status !== "revoked")
    revoked = await replaceSharedRecord(stored, {
      ...stored.record,
      status: "revoked",
    });
  await deleteLegacySnapshot(revoked.record.publicToken);
  await deleteSharedRecord(revoked);
}

async function readLegacySnapshot(
  token: string,
): Promise<PublishedSnapshot | null> {
  if (usesBlobStorage()) {
    const result = await readBlobBody(legacyBlobPath(token));
    if (!result) return null;
    return publishedSnapshotSchema.parse(JSON.parse(result.body));
  }
  try {
    const body = await readFile(legacyLocalPath(token), "utf8");
    const json = JSON.parse(body);
    if (sharedSetlistRecordSchema.safeParse(json).success) return null;
    return publishedSnapshotSchema.parse(json);
  } catch (error) {
    if (isMissingLocalFile(error)) return null;
    throw error;
  }
}

export interface PublishedPublication {
  snapshot: PublishedSnapshot;
  expiresAt?: string;
}

export async function readPublishedPublication(
  token: string,
  now = new Date(),
): Promise<PublishedPublication | null> {
  const v2 = await readSharedRecord(token);
  if (v2)
    return isPublicationAvailable(v2.record, now)
      ? { snapshot: v2.record.snapshot, expiresAt: v2.record.expiresAt }
      : null;
  const legacy = await readLegacySnapshot(token);
  return legacy ? { snapshot: legacy } : null;
}

export async function readPublishedSnapshot(
  token: string,
): Promise<PublishedSnapshot | null> {
  return (await readPublishedPublication(token))?.snapshot ?? null;
}

type CleanupSource = SharedRecordLocation;
interface CleanupState {
  source: CleanupSource;
  cursor?: string;
}
interface ListedRecord {
  pathname: string;
  location: SharedRecordLocation;
}

function parseCleanupState(value: unknown): CleanupState {
  if (!value || typeof value !== "object") return { source: "current" };
  const candidate = value as Record<string, unknown>;
  const source =
    candidate.source === "historical-v2" ? "historical-v2" : "current";
  return {
    source,
    cursor: typeof candidate.cursor === "string" ? candidate.cursor : undefined,
  };
}

async function readCleanupState(): Promise<CleanupState> {
  try {
    if (usesBlobStorage()) {
      const stored = await readBlobBody(CLEANUP_STATE_BLOB_PATH);
      return stored
        ? parseCleanupState(JSON.parse(stored.body))
        : { source: "current" };
    }
    return parseCleanupState(
      JSON.parse(await readFile(cleanupStateLocalPath, "utf8")),
    );
  } catch (error) {
    if (isMissingLocalFile(error) || error instanceof SyntaxError)
      return { source: "current" };
    throw error;
  }
}

async function writeCleanupState(state: CleanupState): Promise<void> {
  const body = JSON.stringify(state);
  if (usesBlobStorage()) {
    await put(CLEANUP_STATE_BLOB_PATH, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return;
  }
  await mkdir(directory, { recursive: true });
  await writeFile(cleanupStateLocalPath, body, "utf8");
}

function validListedPath(
  pathname: string,
  location: SharedRecordLocation,
): boolean {
  return location === "current"
    ? new RegExp(
        `^${SHARED_SETLIST_BLOB_PREFIX}/[A-Za-z0-9]{6,40}\\.json$`,
      ).test(pathname)
    : new RegExp(`^${HISTORICAL_V2_BLOB_PREFIX}/[a-f0-9]{64}\\.json$`).test(
        pathname,
      );
}

async function listCleanupBatch(
  state: CleanupState,
): Promise<{ records: ListedRecord[]; next: CleanupState }> {
  if (usesBlobStorage()) {
    const prefix =
      state.source === "current"
        ? `${SHARED_SETLIST_BLOB_PREFIX}/`
        : `${HISTORICAL_V2_BLOB_PREFIX}/`;
    let result;
    try {
      result = await list({
        prefix,
        limit: CLEANUP_BATCH_SIZE,
        cursor: state.cursor,
      });
    } catch (error) {
      if (!state.cursor) throw error;
      result = await list({ prefix, limit: CLEANUP_BATCH_SIZE });
    }
    return {
      records: result.blobs
        .filter((blob) => validListedPath(blob.pathname, state.source))
        .map((blob) => ({ pathname: blob.pathname, location: state.source })),
      next:
        result.hasMore && result.cursor
          ? { source: state.source, cursor: result.cursor }
          : {
              source:
                state.source === "current" ? "historical-v2" : "current",
            },
    };
  }

  await mkdir(directory, { recursive: true });
  const names = (await readdir(directory)).toSorted();
  const matching = names
    .map((name) => path.join(directory, name))
    .filter((pathname) => {
      const name = path.basename(pathname);
      return state.source === "current"
        ? /^[A-Za-z0-9]{6,40}\.json$/.test(name)
        : /^v2-[a-f0-9]{64}\.json$/.test(name);
    });
  const firstAfterCursor = state.cursor
    ? matching.findIndex((pathname) => pathname > state.cursor!)
    : 0;
  const start = firstAfterCursor < 0 ? matching.length : firstAfterCursor;
  const selected = matching.slice(start, start + CLEANUP_BATCH_SIZE);
  const hasMore = start + selected.length < matching.length;
  return {
    records: selected.map((pathname) => ({
      pathname,
      location: state.source,
    })),
    next:
      hasMore && selected.length
        ? { source: state.source, cursor: selected.at(-1) }
        : {
            source:
              state.source === "current" ? "historical-v2" : "current",
          },
  };
}

export interface CleanupResult {
  scanned: number;
  active: number;
  expired: number;
  deleted: number;
  missing: number;
  conflicts: number;
  malformed: number;
  failed: number;
}

export async function cleanupPublishedSetlists(
  now = new Date(),
): Promise<CleanupResult> {
  const result: CleanupResult = {
    scanned: 0,
    active: 0,
    expired: 0,
    deleted: 0,
    missing: 0,
    conflicts: 0,
    malformed: 0,
    failed: 0,
  };
  const state = await readCleanupState();
  const batch = await listCleanupBatch(state);

  for (const listed of batch.records) {
    result.scanned += 1;
    try {
      const stored = await readStoredAt(listed.pathname, listed.location);
      if (!stored) {
        result.missing += 1;
        continue;
      }
      const expectedPath = usesBlobStorage()
        ? listed.location === "current"
          ? recordBlobPath(stored.record.publicToken)
          : historicalRecordBlobPath(stored.record.publicToken)
        : listed.location === "current"
          ? recordLocalPath(stored.record.publicToken)
          : historicalRecordLocalPath(stored.record.publicToken);
      if (listed.pathname !== expectedPath) {
        result.malformed += 1;
        continue;
      }
      if (
        stored.record.status !== "revoked" &&
        !isPublicationExpired(stored.record, now)
      ) {
        result.active += 1;
        continue;
      }
      if (stored.record.status !== "revoked") result.expired += 1;
      await revokeAndDeleteSharedRecord(stored);
      result.deleted += 1;
    } catch (error) {
      if (
        error instanceof BlobPreconditionFailedError ||
        error instanceof SharedRecordConflictError
      )
        result.conflicts += 1;
      else if (
        error instanceof SyntaxError ||
        (error instanceof Error && error.name === "ZodError")
      )
        result.malformed += 1;
      else result.failed += 1;
    }
  }

  if (result.failed === 0) await writeCleanupState(batch.next);
  return result;
}
