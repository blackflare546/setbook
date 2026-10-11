import { NextResponse } from "next/server";
import { z } from "zod";
import { publishedSnapshotV2Schema } from "@/lib/validation/schemas";
import {
  capabilityMatches,
  publicationExpiration,
  publishedStoreErrorResponse,
  readPublishedPublication,
  readSharedRecord,
  replaceSharedRecord,
  revokeAndDeleteSharedRecord,
} from "@/lib/sharing/published-store";
import { readJsonRequestBody } from "@/lib/sharing/request-body";

const updateSchema = z.object({
  snapshot: publishedSnapshotV2Schema,
  expectedRevision: z.number().int().positive(),
  expectedEtag: z.string().min(1),
});

function validToken(token: string) {
  return /^[A-Za-z0-9]{6,40}$/.test(token);
}

function bearer(request: Request): string | null {
  const value = request.headers.get("authorization");
  return value?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!validToken(token))
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  try {
    const publication = await readPublishedPublication(token);
    if (publication?.revision)
      return NextResponse.json(
        {
          ...publication.snapshot,
          revision: publication.revision,
          updatedAt: publication.updatedAt,
          expiresAt: publication.expiresAt,
        },
        { headers: { ETag: publication.etag!, "Cache-Control": "no-store" } },
      );
    return publication
      ? NextResponse.json(publication.snapshot, {
          headers: { "Cache-Control": "public, max-age=60" },
        })
      : NextResponse.json(
          { error: "Shared setlist not found" },
          { status: 404 },
        );
  } catch (error) {
    console.error("Unable to read shared setlist", error);
    const failure = publishedStoreErrorResponse(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}

async function update(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!validToken(token))
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  const bodyResult = await readJsonRequestBody(request);
  if (!bodyResult.ok)
    return NextResponse.json(
      { error: bodyResult.error },
      { status: bodyResult.status },
    );
  const parsed = updateSchema.safeParse(bodyResult.value);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid shared setlist", details: parsed.error.flatten() },
      { status: 400 },
    );
  try {
    const stored = await readSharedRecord(token);
    if (!stored)
      return NextResponse.json(
        {
          error:
            "The previous shared setlist file no longer exists. Publish again to create a new link.",
        },
        { status: 404 },
      );
    if (stored.record.status === "revoked")
      return NextResponse.json(
        {
          error:
            "The previous shared setlist is no longer available. Publish again to create a new link.",
        },
        { status: 404 },
      );
    const capability = bearer(request);
    if (!capabilityMatches(capability, stored.record.ownerVerifier))
      return NextResponse.json(
        { error: "Owner access required" },
        { status: 403 },
      );
    const now = new Date().toISOString();
    const expiresAt = publicationExpiration(new Date(now));
    // Public shares are read-only and only the owner capability can update
    // them. Advance from the authoritative server revision so stale metadata
    // in the owner's browser cannot permanently block publishing.
    const revision = stored.record.revision + 1;
    const replaced = await replaceSharedRecord(stored, {
      schemaVersion: 2,
      publicToken: stored.record.publicToken,
      revision,
      snapshot: { ...parsed.data.snapshot, publishedAt: now },
      ownerVerifier: stored.record.ownerVerifier,
      accessMode: stored.record.accessMode,
      editorVerifier: stored.record.editorVerifier,
      status: "active",
      lastConfirmedAt: now,
      expiresAt,
      createdAt: stored.record.createdAt,
      updatedAt: now,
    });
    return NextResponse.json({
      token,
      revision,
      etag: replaced.etag,
      updatedAt: now,
      expiresAt,
    });
  } catch (error) {
    console.error("Unable to update shared setlist", error);
    const failure = publishedStoreErrorResponse(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}

export const PATCH = update;
export const PUT = update;

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!validToken(token))
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  try {
    const stored = await readSharedRecord(token);
    if (!stored) {
      const legacy = await readPublishedPublication(token);
      if (legacy)
        return NextResponse.json(
          {
            error:
              "Legacy shared setlists cannot be deleted because they do not have an owner capability.",
          },
          { status: 409 },
        );
      return new NextResponse(null, { status: 204 });
    }
    if (!capabilityMatches(bearer(request), stored.record.ownerVerifier))
      return NextResponse.json(
        { error: "Owner access required" },
        { status: 403 },
      );
    await revokeAndDeleteSharedRecord(stored);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Unable to delete shared setlist", error);
    const failure = publishedStoreErrorResponse(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}
