import { describe, expect, it } from "vitest";
import { POST as createShare } from "@/app/api/published-setlists/route";
import {
  DELETE as deleteShare,
  GET as getShare,
  PATCH as updateShare,
} from "@/app/api/published-setlists/[token]/route";
import { createPublishedSnapshot } from "@/lib/sharing/snapshot";
import { POST as updateAccess } from "@/app/api/published-setlists/[token]/access/route";

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

describe("shared setlist API capabilities", () => {
  it("keeps public reads redacted and enforces editor/owner permissions", async () => {
    const createdResponse = await createShare(
      new Request("http://localhost/api/published-setlists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot: snapshot(), accessMode: "editable" }),
      }),
    );
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json();
    const context = { params: Promise.resolve({ token: created.token }) };

    const publicResponse = await getShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`),
      context,
    );
    const publicBody = await publicResponse.json();
    expect(publicBody.ownerCapability).toBeUndefined();
    expect(publicBody.editorCapability).toBeUndefined();
    expect(publicBody.revision).toBe(1);

    const denied = await updateShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
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
          authorization: `Bearer ${created.editorCapability}`,
        },
        body: JSON.stringify({
          snapshot: { ...snapshot(), name: "Editor update" },
          expectedRevision: 1,
          expectedEtag: created.etag,
        }),
      }),
      context,
    );
    expect(updated.status).toBe(200);
    const updateResult = await updated.json();

    const disabled = await updateAccess(
      new Request(
        `http://localhost/api/published-setlists/${created.token}/access`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${created.ownerCapability}`,
          },
          body: JSON.stringify({
            action: "set-mode",
            mode: "view",
            expectedRevision: updateResult.revision,
            expectedEtag: updateResult.etag,
          }),
        },
      ),
      context,
    );
    expect(disabled.status).toBe(200);
    const disabledResult = await disabled.json();

    const revokedEditor = await updateShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${created.editorCapability}`,
        },
        body: JSON.stringify({
          snapshot: { ...snapshot(), name: "Revoked editor" },
          expectedRevision: disabledResult.revision,
          expectedEtag: disabledResult.etag,
        }),
      }),
      context,
    );
    expect(revokedEditor.status).toBe(403);

    const editorDelete = await deleteShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${created.editorCapability}`,
          "if-match": disabledResult.etag,
        },
      }),
      context,
    );
    expect(editorDelete.status).toBe(403);

    const deleted = await deleteShare(
      new Request(`http://localhost/api/published-setlists/${created.token}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${created.ownerCapability}`,
          "if-match": disabledResult.etag,
        },
      }),
      context,
    );
    expect(deleted.status).toBe(204);
  });
});
