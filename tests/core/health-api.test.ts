import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("health API", () => {
  it("reports liveness without exposing configuration values", async () => {
    vi.stubEnv("BLOB_STORE_ID", "store-id");
    vi.stubEnv("SHARE_CAPABILITY_SECRET", "s".repeat(32));
    vi.stubEnv("CRON_SECRET", "c".repeat(32));
    vi.stubEnv("FORMSPREE_FORM_ID", "feedback-id");

    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(body).toEqual({
      status: "ok",
      service: "setbook",
      features: {
        publicSharing: true,
        cleanup: true,
        feedback: true,
      },
    });
    expect(JSON.stringify(body)).not.toContain("store-id");
    expect(JSON.stringify(body)).not.toContain("feedback-id");
  });

  it("keeps liveness healthy while identifying unavailable features", async () => {
    vi.stubEnv("BLOB_STORE_ID", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("SHARE_CAPABILITY_SECRET", "short");
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("FORMSPREE_FORM_ID", "");

    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      features: {
        publicSharing: false,
        cleanup: false,
        feedback: false,
      },
    });
  });
});
