import { describe, expect, it, vi } from "vitest";
import {
  deletePublishedSetlistByToken,
  extendPublishedSetlist,
  publishSharedSetlist,
} from "@/lib/sharing/published-client";
import type { PublishedSnapshotV2 } from "@/lib/validation/schemas";

const snapshot: PublishedSnapshotV2 = {
  version: 2,
  name: "Sunday service",
  venue: "Main room",
  songs: [],
  publishedAt: "2026-10-09T00:00:00.000Z",
};

const binding = {
  publicToken: "oldPublicToken",
  ownerCapability: "oldOwnerCapability",
  revision: 3,
  etag: '"old-etag"',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("publishing shared setlists", () => {
  it("creates a new shared record", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          token: "newPublicToken",
          ownerCapability: "newOwnerCapability",
          revision: 1,
          etag: '"new-etag"',
          expiresAt: "2026-11-08T00:00:00.000Z",
        },
        201,
      ),
    );

    await expect(
      publishSharedSetlist(snapshot, undefined, request),
    ).resolves.toEqual({
      token: "newPublicToken",
      ownerCapability: "newOwnerCapability",
      revision: 1,
      etag: '"new-etag"',
      expiresAt: "2026-11-08T00:00:00.000Z",
      createdReplacement: false,
    });
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][1]?.method).toBe("POST");
  });

  it("updates an existing record without replacing its owner capability", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        token: binding.publicToken,
        revision: 4,
        etag: '"updated-etag"',
        expiresAt: "2026-11-08T00:00:00.000Z",
      }),
    );

    await expect(
      publishSharedSetlist(snapshot, binding, request),
    ).resolves.toEqual({
      token: binding.publicToken,
      ownerCapability: binding.ownerCapability,
      revision: 4,
      etag: '"updated-etag"',
      expiresAt: "2026-11-08T00:00:00.000Z",
      createdReplacement: false,
    });
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][1]?.method).toBe("PATCH");
  });

  it("creates a replacement link when the previous Blob was deleted", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ error: "Shared setlist not found" }, 404),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            token: "replacementToken",
            ownerCapability: "replacementCapability",
            revision: 1,
            etag: '"replacement-etag"',
            expiresAt: "2026-11-08T00:00:00.000Z",
          },
          201,
        ),
      );

    await expect(
      publishSharedSetlist(snapshot, binding, request),
    ).resolves.toEqual({
      token: "replacementToken",
      ownerCapability: "replacementCapability",
      revision: 1,
      etag: '"replacement-etag"',
      expiresAt: "2026-11-08T00:00:00.000Z",
      createdReplacement: true,
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls.map((call) => call[1]?.method)).toEqual([
      "PATCH",
      "POST",
    ]);
  });

  it("does not replace a record after a non-missing error", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ error: "Owner access required" }, 403));

    await expect(
      publishSharedSetlist(snapshot, binding, request),
    ).rejects.toThrow("Owner access required");
    expect(request).toHaveBeenCalledOnce();
  });
});

describe("extending shared setlists", () => {
  it("uses the owner capability and returns updated lifecycle metadata", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        revision: 3,
        etag: '"extended-etag"',
        expiresAt: "2026-11-08T00:00:00.000Z",
      }),
    );

    await expect(
      extendPublishedSetlist("publicToken", "ownerCapability", request),
    ).resolves.toEqual({
      revision: 3,
      etag: '"extended-etag"',
      expiresAt: "2026-11-08T00:00:00.000Z",
    });
    expect(request).toHaveBeenCalledWith(
      "/api/published-setlists/publicToken/extend",
      {
        method: "POST",
        headers: { authorization: "Bearer ownerCapability" },
      },
    );
  });
});

describe("deleting shared setlists", () => {
  it("uses owner authorization without a stale ETag precondition", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));

    await expect(
      deletePublishedSetlistByToken("publicToken", "ownerCapability", request),
    ).resolves.toBeUndefined();

    expect(request).toHaveBeenCalledWith(
      "/api/published-setlists/publicToken",
      {
        method: "DELETE",
        headers: { authorization: "Bearer ownerCapability" },
      },
    );
  });
});
