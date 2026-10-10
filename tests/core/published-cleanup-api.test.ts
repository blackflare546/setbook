import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/cron/published-setlists-cleanup/route";
import { cleanupPublishedSetlists } from "@/lib/sharing/published-store";

vi.mock("@/lib/sharing/published-store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/sharing/published-store")>();
  return { ...actual, cleanupPublishedSetlists: vi.fn() };
});

const emptyResult = {
  scanned: 0,
  active: 0,
  expired: 0,
  deleted: 0,
  missing: 0,
  conflicts: 0,
  malformed: 0,
  failed: 0,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("published setlist cleanup route", () => {
  it("fails closed when the cron secret is absent or incorrect", async () => {
    expect(
      (
        await GET(
          new Request("http://localhost/api/cron/published-setlists-cleanup"),
        )
      ).status,
    ).toBe(401);

    vi.stubEnv("CRON_SECRET", "expected-secret");
    expect(
      (
        await GET(
          new Request("http://localhost/api/cron/published-setlists-cleanup", {
            headers: { authorization: "Bearer wrong-secret" },
          }),
        )
      ).status,
    ).toBe(401);
    expect(cleanupPublishedSetlists).not.toHaveBeenCalled();
  });

  it("returns aggregate counts for an authorized run", async () => {
    vi.stubEnv("CRON_SECRET", "expected-secret");
    vi.mocked(cleanupPublishedSetlists).mockResolvedValueOnce({
      ...emptyResult,
      scanned: 3,
      deleted: 1,
    });
    const response = await GET(
      new Request("http://localhost/api/cron/published-setlists-cleanup", {
        headers: { authorization: "Bearer expected-secret" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ scanned: 3, deleted: 1 });
  });

  it("reports retryable partial failures without exposing record data", async () => {
    vi.stubEnv("CRON_SECRET", "expected-secret");
    vi.mocked(cleanupPublishedSetlists).mockResolvedValueOnce({
      ...emptyResult,
      scanned: 1,
      failed: 1,
    });
    const response = await GET(
      new Request("http://localhost/api/cron/published-setlists-cleanup", {
        headers: { authorization: "Bearer expected-secret" },
      }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ...emptyResult,
      scanned: 1,
      failed: 1,
    });
  });
});
