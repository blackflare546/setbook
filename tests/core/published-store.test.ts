import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PublishedStoreConfigurationError,
  publishedStoreErrorResponse,
  readPublishedSnapshot,
  capabilityMatches,
  capabilityVerifier,
  createCapability,
} from "@/lib/sharing/published-store";

afterEach(() => vi.unstubAllEnvs());

describe("published setlist storage configuration", () => {
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
});
