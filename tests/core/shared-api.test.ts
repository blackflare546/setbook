import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as createShare } from "@/app/api/published-setlists/route";
import {
  DELETE as deleteShare,
  GET as getShare,
  PATCH as updateShare,
} from "@/app/api/published-setlists/[token]/route";
import { POST as extendShare } from "@/app/api/published-setlists/[token]/extend/route";
import { createPublishedSnapshot } from "@/lib/sharing/snapshot";

function snapshot() {
  return createPublishedSnapshot(
    {
      id: "set",
      name: "Friday",
      venue: "Club",
      notes: "Band notes",
      entries: [
        {
          id: "entry",
          songId: "song",
          performanceKey: "A",
          arrangementCue: "Count four",
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    [
      {
        id: "song",
        title: "Song",
        artist: "Artist",
        originalKey: "G",
        capo: null,
        tags: [],
        sections: [],
        notes: "",
        links: {},
        sourceText: "",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    { includeNotes: true, includeLinks: false },
  );
}

afterEach(() => vi.useRealTimers());

describe("shared setlist owner access", () => {
  it("keeps public reads redacted and permits only the owner to update or delete", async () => {
    const createdResponse = await createShare(
      new Request("http://localhost/api/published-setlists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot: snapshot() }),
      }),
    );
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json();
    expect(created.ownerCapability).toBeTruthy();
    expect(created.expiresAt).toBeTruthy();
    expect(created.editorCapability).toBeUndefined();
    expect(created.recoveryUrl).toBeUndefined();
    const context = { params: Promise.resolve({ token: created.token }) };

    const publicResponse = await getShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`),
      context,
    );
    const publicBody = await publicResponse.json();
    expect(publicBody.ownerCapability).toBeUndefined();
    expect(publicBody.editorCapability).toBeUndefined();
    expect(publicBody.accessMode).toBeUndefined();
    expect(publicBody.revision).toBe(1);
    expect(publicBody.expiresAt).toBeUndefined();

    const deniedExtend = await extendShare(
      new Request(
        `http://localhost/api/published-setlists/${created.token}/extend`,
        {
          method: "POST",
          headers: { authorization: "Bearer former-editor-capability" },
        },
      ),
      context,
    );
    expect(deniedExtend.status).toBe(403);

    const extended = await extendShare(
      new Request(
        `http://localhost/api/published-setlists/${created.token}/extend`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${created.ownerCapability}`,
          },
        },
      ),
      context,
    );
    expect(extended.status).toBe(200);
    const extendedBody = await extended.json();
    expect(extendedBody.revision).toBe(1);
    expect(extendedBody.expiresAt).toBeTruthy();

    const denied = await updateShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer former-editor-capability",
        },
        body: JSON.stringify({
          snapshot: { ...snapshot(), name: "Denied" },
          expectedRevision: 1,
          expectedEtag: created.etag,
        }),
      }),
      context,
    );
    expect(denied.status).toBe(403);

    const updated = await updateShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${created.ownerCapability}`,
        },
        body: JSON.stringify({
          snapshot: { ...snapshot(), name: "Owner update" },
          expectedRevision: 1,
          // Vercel upload and metadata responses can format an equivalent
          // ETag differently. Revision validation plus the server-side ETag
          // must allow this owner update.
          expectedEtag: 'W/"client-formatted-etag"',
        }),
      }),
      context,
    );
    expect(updated.status).toBe(200);
    const updateResult = await updated.json();

    const updatedAgain = await updateShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${created.ownerCapability}`,
        },
        body: JSON.stringify({
          snapshot: { ...snapshot(), name: "Immediate second update" },
          expectedRevision: 2,
          expectedEtag: updateResult.etag,
        }),
      }),
      context,
    );
    expect(updatedAgain.status).toBe(200);
    const secondUpdateResult = await updatedAgain.json();
    expect(secondUpdateResult.revision).toBe(3);

    const staleOwnerMetadataUpdate = await updateShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${created.ownerCapability}`,
        },
        body: JSON.stringify({
          snapshot: { ...snapshot(), name: "Stale update" },
          expectedRevision: 1,
          expectedEtag: created.etag,
        }),
      }),
      context,
    );
    expect(staleOwnerMetadataUpdate.status).toBe(200);
    const staleMetadataResult = await staleOwnerMetadataUpdate.json();
    expect(staleMetadataResult.revision).toBe(4);

    const nonOwnerDelete = await deleteShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`, {
        method: "DELETE",
        headers: {
          authorization: "Bearer former-editor-capability",
          "if-match": staleMetadataResult.etag,
        },
      }),
      context,
    );
    expect(nonOwnerDelete.status).toBe(403);

    const deleted = await deleteShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${created.ownerCapability}`,
        },
      }),
      context,
    );
    expect(deleted.status).toBe(204);

    const missingUpdate = await updateShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${created.ownerCapability}`,
        },
        body: JSON.stringify({
          snapshot: snapshot(),
          expectedRevision: 4,
          expectedEtag: staleMetadataResult.etag,
        }),
      }),
      context,
    );
    expect(missingUpdate.status).toBe(404);

    const repeatedDelete = await deleteShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`, {
        method: "DELETE",
      }),
      context,
    );
    expect(repeatedDelete.status).toBe(204);
  });

  it("hides an expired publication and lets its owner extend it before cleanup", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const createdResponse = await createShare(
      new Request("http://localhost/api/published-setlists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot: snapshot() }),
      }),
    );
    const created = await createdResponse.json();
    const context = { params: Promise.resolve({ token: created.token }) };

    vi.setSystemTime(new Date("2026-02-01T00:00:00.000Z"));
    const expired = await getShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`),
      context,
    );
    expect(expired.status).toBe(404);

    const extended = await extendShare(
      new Request(
        `http://localhost/api/published-setlists/${created.token}/extend`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${created.ownerCapability}`,
          },
        },
      ),
      context,
    );
    expect(extended.status).toBe(200);
    const extension = await extended.json();
    expect(extension.revision).toBe(1);
    expect(extension.expiresAt).toBe("2026-03-03T00:00:00.000Z");

    const restored = await getShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`),
      context,
    );
    expect(restored.status).toBe(200);

    const deleted = await deleteShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${created.ownerCapability}`,
        },
      }),
      context,
    );
    expect(deleted.status).toBe(204);
  });
});
