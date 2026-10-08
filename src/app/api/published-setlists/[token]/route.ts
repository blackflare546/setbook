import { NextResponse } from "next/server";
import { z } from "zod";
import { publishedSnapshotV2Schema } from "@/lib/validation/schemas";
import {
  capabilityMatches,
  deleteSharedRecord,
  publishedStoreErrorResponse,
  readPublishedSnapshot,
  readSharedRecord,
  replaceSharedRecord,
} from "@/lib/sharing/published-store";

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
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!validToken(token))
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  try {
    const stored = await readSharedRecord(token);
    if (stored)
      return NextResponse.json(
        {
          ...stored.record.snapshot,
          revision: stored.record.revision,
          updatedAt: stored.record.updatedAt,
        },
        { headers: { ETag: stored.etag, "Cache-Control": "no-store" } },
      );
    const snapshot = await readPublishedSnapshot(token);
    return snapshot
      ? NextResponse.json(snapshot, {
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
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
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
          error: "Legacy shared setlists are read-only. Upgrade sharing first.",
        },
        { status: 409 },
      );
    const capability = bearer(request);
    if (!capabilityMatches(capability, stored.record.ownerVerifier))
      return NextResponse.json(
        { error: "Owner access required" },
        { status: 403 },
      );
    if (
      parsed.data.expectedRevision !== stored.record.revision ||
      parsed.data.expectedEtag !== stored.etag
    )
      return NextResponse.json(
        {
          error:
            "Someone updated this setlist. Load the latest version before saving.",
        },
        { status: 409 },
      );
    const now = new Date().toISOString();
    const revision = stored.record.revision + 1;
    const etag = await replaceSharedRecord(
      {
        schemaVersion: 2,
        publicToken: stored.record.publicToken,
        revision,
        snapshot: { ...parsed.data.snapshot, publishedAt: now },
        ownerVerifier: stored.record.ownerVerifier,
        createdAt: stored.record.createdAt,
        updatedAt: now,
      },
      stored.etag,
    );
    return NextResponse.json({ token, revision, etag, updatedAt: now });
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!validToken(token))
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  try {
    const stored = await readSharedRecord(token);
    if (!stored)
      return NextResponse.json(
        { error: "Legacy shared setlists are read-only." },
        { status: 409 },
      );
    if (!capabilityMatches(bearer(request), stored.record.ownerVerifier))
      return NextResponse.json(
        { error: "Owner access required" },
        { status: 403 },
      );
    const expectedEtag = request.headers.get("if-match");
    if (!expectedEtag || expectedEtag !== stored.etag)
      return NextResponse.json(
        { error: "Someone updated this setlist. Refresh before deleting." },
        { status: 409 },
      );
    await deleteSharedRecord(token, expectedEtag);
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
