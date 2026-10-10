import { NextResponse } from "next/server";
import { z } from "zod";
import { publishedSnapshotV2Schema } from "@/lib/validation/schemas";
import {
  capabilityVerifier,
  createCapability,
  createPublicToken,
  createSharedRecord,
  publicationExpiration,
  publishedStoreErrorResponse,
  readPublishedSnapshot,
} from "@/lib/sharing/published-store";

const createSchema = z.object({ snapshot: publishedSnapshotV2Schema });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(
    body?.snapshot ? body : { snapshot: body },
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid shared setlist", details: parsed.error.flatten() },
      { status: 400 },
    );
  try {
    let token = createPublicToken();
    for (
      let attempt = 0;
      attempt < 4 && (await readPublishedSnapshot(token));
      attempt += 1
    )
      token = createPublicToken();
    const ownerCapability = createCapability();
    const now = new Date().toISOString();
    const expiresAt = publicationExpiration(new Date(now));
    const snapshot = { ...parsed.data.snapshot, publishedAt: now };
    const etag = await createSharedRecord({
      schemaVersion: 2,
      publicToken: token,
      revision: 1,
      snapshot,
      ownerVerifier: capabilityVerifier(ownerCapability),
      status: "active",
      lastConfirmedAt: now,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json(
      {
        token,
        url: `/s/${token}`,
        revision: 1,
        etag,
        ownerCapability,
        expiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unable to create shared setlist", error);
    const failure = publishedStoreErrorResponse(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}
