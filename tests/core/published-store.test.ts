import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PublishedStoreConfigurationError,
  publishedStoreErrorResponse,
  readPublishedSnapshot,
} from "@/lib/sharing/published-store";

afterEach(() => vi.unstubAllEnvs());

describe("published setlist storage configuration", () => {
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
});
