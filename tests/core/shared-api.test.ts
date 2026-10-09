import { describe, expect, it } from "vitest";
import { POST as createShare } from "@/app/api/published-setlists/route";
import {
  DELETE as deleteShare,
  GET as getShare,
  PATCH as updateShare,
} from "@/app/api/published-setlists/[token]/route";
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
          expectedEtag: created.etag,
        }),
      }),
      context,
    );
    expect(updated.status).toBe(200);
    const updateResult = await updated.json();

    const nonOwnerDelete = await deleteShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`, {
        method: "DELETE",
        headers: {
          authorization: "Bearer former-editor-capability",
          "if-match": updateResult.etag,
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
          "if-match": updateResult.etag,
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
          expectedRevision: 2,
          expectedEtag: updateResult.etag,
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
});
