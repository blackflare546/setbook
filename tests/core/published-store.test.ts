import {
  BlobNotFoundError,
  BlobPreconditionFailedError,
  del,
  get,
  head,
  list,
  put,
} from "@vercel/blob";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PublishedStoreConfigurationError,
  publishedStoreErrorResponse,
  readPublishedSnapshot,
  capabilityMatches,
  capabilityVerifier,
  cleanupPublishedSetlists,
  createCapability,
  deleteSharedRecord,
  recordBlobPath,
  readSharedRecord,
  SHARED_SETLIST_BLOB_PREFIX,
  publicationExpiration,
  publicationRetentionDays,
  legacyBlobPath,
  isPublicationAvailable,
} from "@/lib/sharing/published-store";

vi.mock("@vercel/blob", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vercel/blob")>();
  return {
    ...actual,
    del: vi.fn(),
    get: vi.fn(),
    head: vi.fn(),
    list: vi.fn(),
    put: vi.fn(),
  };
});

function blobMetadata(pathname: string, etag: string) {
  return {
    url: `https://example.public.blob.vercel-storage.com/${pathname}`,
    downloadUrl: `https://example.public.blob.vercel-storage.com/${pathname}?download=1`,
    pathname,
    contentType: "application/json",
    contentDisposition: 'inline; filename="record.json"',
    size: 100,
    uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
    cacheControl: "public, max-age=60",
    etag,
  };
}

function blobGetResult(body: unknown, pathname: string, etag: string) {
  return {
    statusCode: 200 as const,
    stream: new Response(JSON.stringify(body)).body!,
    headers: new Headers({ "content-type": "application/json" }),
    blob: blobMetadata(pathname, etag),
  };
}

function cleanupRecord(expiresAt: string) {
  return {
    schemaVersion: 2 as const,
    publicToken: "expiredToken",
    revision: 1,
    snapshot: {
      version: 2 as const,
      name: "Expired",
      venue: "",
      songs: [],
      publishedAt: "2026-01-01T00:00:00.000Z",
    },
    ownerVerifier: "verifier",
    status: "active" as const,
    lastConfirmedAt: "2026-01-01T00:00:00.000Z",
    expiresAt,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("published setlist cleanup", () => {
  it("conditionally revokes and deletes only validated expired records", async () => {
    vi.stubEnv("BLOB_STORE_ID", "store_test");
    const pathname = recordBlobPath("expiredToken");
    vi.mocked(head)
      .mockRejectedValueOnce(new BlobNotFoundError())
      .mockResolvedValueOnce(blobMetadata(pathname, '"old-etag"'));
    vi.mocked(get).mockResolvedValueOnce(
      blobGetResult(
        cleanupRecord("2026-01-31T00:00:00.000Z"),
        pathname,
        '"old-etag"',
      ),
    );
    vi.mocked(list).mockResolvedValueOnce({
      blobs: [
        blobMetadata(pathname, '"old-etag"'),
        blobMetadata("unrelated/private.json", '"other"'),
      ],
      hasMore: false,
    });
    vi.mocked(put)
      .mockResolvedValueOnce({
        ...blobMetadata(pathname, '"revoked-etag"'),
      })
      .mockResolvedValueOnce({
        ...blobMetadata(
          "setbook-maintenance/published-setlists-cleanup.json",
          '"state-etag"',
        ),
      });
    vi.mocked(del).mockResolvedValue(undefined);

    await expect(
      cleanupPublishedSetlists(new Date("2026-02-01T00:00:00.000Z")),
    ).resolves.toMatchObject({
      scanned: 1,
      expired: 1,
      deleted: 1,
      failed: 0,
    });
    expect(del).toHaveBeenNthCalledWith(1, legacyBlobPath("expiredToken"));
    expect(del).toHaveBeenNthCalledWith(2, pathname, {
      ifMatch: '"revoked-etag"',
    });
    expect(del).toHaveBeenCalledTimes(2);
  });

  it("treats a concurrent owner refresh as a safe conflict", async () => {
    vi.stubEnv("BLOB_STORE_ID", "store_test");
    const pathname = recordBlobPath("expiredToken");
    vi.mocked(head)
      .mockRejectedValueOnce(new BlobNotFoundError())
      .mockResolvedValueOnce(blobMetadata(pathname, '"old-etag"'));
    vi.mocked(get).mockResolvedValueOnce(
      blobGetResult(
        cleanupRecord("2026-01-31T00:00:00.000Z"),
        pathname,
        '"old-etag"',
      ),
    );
    vi.mocked(list).mockResolvedValueOnce({
      blobs: [blobMetadata(pathname, '"old-etag"')],
      hasMore: false,
    });
    vi.mocked(put)
      .mockRejectedValueOnce(new BlobPreconditionFailedError())
      .mockResolvedValueOnce({
        ...blobMetadata(
          "setbook-maintenance/published-setlists-cleanup.json",
          '"state-etag"',
        ),
      });

    await expect(
      cleanupPublishedSetlists(new Date("2026-02-01T00:00:00.000Z")),
    ).resolves.toMatchObject({ conflicts: 1, deleted: 0, failed: 0 });
    expect(del).not.toHaveBeenCalled();
  });

  it("leaves a failed deletion revoked and safely retries it", async () => {
    vi.stubEnv("BLOB_STORE_ID", "store_test");
    const pathname = recordBlobPath("expiredToken");
    const record = cleanupRecord("2026-01-31T00:00:00.000Z");
    vi.mocked(head)
      .mockRejectedValueOnce(new BlobNotFoundError())
      .mockResolvedValueOnce(blobMetadata(pathname, '"old-etag"'));
    vi.mocked(get).mockResolvedValueOnce(
      blobGetResult(record, pathname, '"old-etag"'),
    );
    vi.mocked(list).mockResolvedValueOnce({
      blobs: [blobMetadata(pathname, '"old-etag"')],
      hasMore: false,
    });
    vi.mocked(put).mockResolvedValueOnce({
      ...blobMetadata(pathname, '"revoked-etag"'),
    });
    vi.mocked(del).mockRejectedValueOnce(new Error("temporary failure"));

    await expect(
      cleanupPublishedSetlists(new Date("2026-02-01T00:00:00.000Z")),
    ).resolves.toMatchObject({ failed: 1, deleted: 0 });
    expect(put).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    vi.mocked(head)
      .mockRejectedValueOnce(new BlobNotFoundError())
      .mockResolvedValueOnce(blobMetadata(pathname, '"revoked-etag"'));
    vi.mocked(get).mockResolvedValueOnce(
      blobGetResult(
        { ...record, status: "revoked" },
        pathname,
        '"revoked-etag"',
      ),
    );
    vi.mocked(list).mockResolvedValueOnce({
      blobs: [blobMetadata(pathname, '"revoked-etag"')],
      hasMore: false,
    });
    vi.mocked(del).mockResolvedValue(undefined);
    vi.mocked(put).mockResolvedValueOnce({
      ...blobMetadata(
        "setbook-maintenance/published-setlists-cleanup.json",
        '"state-etag"',
      ),
    });

    await expect(
      cleanupPublishedSetlists(new Date("2026-02-01T00:00:00.000Z")),
    ).resolves.toMatchObject({ failed: 0, deleted: 1 });
    expect(del).toHaveBeenCalledTimes(2);
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("published setlist storage configuration", () => {
  it("uses one clear Blob prefix without requiring a manual folder", () => {
    expect(SHARED_SETLIST_BLOB_PREFIX).toBe("setbook-shared-setlists");
    expect(recordBlobPath("publicToken123")).toBe(
      "setbook-shared-setlists/publicToken123.json",
    );
  });

  it("verifies high-entropy capabilities without storing the raw value", () => {
    const capability = createCapability();
    const verifier = capabilityVerifier(capability);
    expect(verifier).not.toContain(capability);
    expect(capabilityMatches(capability, verifier)).toBe(true);
    expect(capabilityMatches(createCapability(), verifier)).toBe(false);
  });
  it("never falls back to the deployment filesystem on Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("BLOB_STORE_ID", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");

    await expect(readPublishedSnapshot("missing1")).rejects.toBeInstanceOf(
      PublishedStoreConfigurationError,
    );
  });

  it("returns an actionable service error for missing Blob configuration", () => {
    expect(
      publishedStoreErrorResponse(new PublishedStoreConfigurationError()),
    ).toEqual({
      error:
        "Public sharing is not configured. Connect a Vercel Blob store to this project and redeploy.",
      status: 503,
    });
  });

  it("treats an already-missing Blob as successfully deleted", async () => {
    vi.stubEnv("BLOB_STORE_ID", "store_test");
    vi.mocked(del).mockRejectedValueOnce(new BlobNotFoundError());

    await expect(
      deleteSharedRecord({
        pathname: recordBlobPath("missingToken"),
        location: "current",
        etag: '"missing-etag"',
        record: {
          schemaVersion: 2,
          publicToken: "missingToken",
          revision: 1,
          snapshot: {
            version: 2,
            name: "Missing",
            venue: "",
            songs: [],
            publishedAt: "2026-01-01T00:00:00.000Z",
          },
          ownerVerifier: "verifier",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    ).resolves.toBeUndefined();
  });

  it("treats a missing Blob read as a missing shared record", async () => {
    vi.stubEnv("BLOB_STORE_ID", "store_test");
    vi.mocked(head)
      .mockRejectedValueOnce(new BlobNotFoundError())
      .mockRejectedValueOnce(new BlobNotFoundError());

    await expect(readSharedRecord("missingToken")).resolves.toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it("uses a configurable positive retention period", () => {
    vi.stubEnv("PUBLISHED_SETLIST_RETENTION_DAYS", "45");
    expect(publicationRetentionDays()).toBe(45);
    expect(publicationExpiration(new Date("2026-01-01T00:00:00.000Z"))).toBe(
      "2026-02-15T00:00:00.000Z",
    );
  });

  it("rejects invalid retention configuration", () => {
    vi.stubEnv("PUBLISHED_SETLIST_RETENTION_DAYS", "0");
    expect(() => publicationRetentionDays()).toThrow(
      "PUBLISHED_SETLIST_RETENTION_DAYS must be a positive integer",
    );
  });

  it("keeps grandfathered records active and expires confirmed records", () => {
    const record = cleanupRecord("2026-01-31T00:00:00.000Z");
    expect(
      isPublicationAvailable(
        { ...record, expiresAt: undefined },
        new Date("2030-01-01T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      isPublicationAvailable(record, new Date("2026-02-01T00:00:00.000Z")),
    ).toBe(false);
    expect(
      isPublicationAvailable(
        { ...record, status: "revoked" },
        new Date("2026-01-02T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("does not expose a revoked v2 record through legacy fallback", async () => {
    vi.stubEnv("BLOB_STORE_ID", "store_test");
    const pathname = recordBlobPath("expiredToken");
    vi.mocked(head).mockResolvedValueOnce(
      blobMetadata(pathname, '"revoked-etag"'),
    );
    vi.mocked(get).mockResolvedValueOnce(
      blobGetResult(
        { ...cleanupRecord("2030-01-01T00:00:00.000Z"), status: "revoked" },
        pathname,
        '"revoked-etag"',
      ),
    );

    await expect(readPublishedSnapshot("expiredToken")).resolves.toBeNull();
    expect(head).toHaveBeenCalledTimes(1);
  });

  it("reads a legacy snapshot only when no v2 record exists", async () => {
    vi.stubEnv("BLOB_STORE_ID", "store_test");
    const pathname = legacyBlobPath("legacyToken");
    vi.mocked(head)
      .mockRejectedValueOnce(new BlobNotFoundError())
      .mockRejectedValueOnce(new BlobNotFoundError())
      .mockResolvedValueOnce(blobMetadata(pathname, '"legacy-etag"'));
    vi.mocked(get).mockResolvedValueOnce(
      blobGetResult(
        {
          version: 1,
          name: "Legacy",
          venue: "",
          songs: [],
          publishedAt: "2025-01-01T00:00:00.000Z",
        },
        pathname,
        '"legacy-etag"',
      ),
    );

    await expect(readPublishedSnapshot("legacyToken")).resolves.toMatchObject({
      version: 1,
      name: "Legacy",
    });
  });
});
