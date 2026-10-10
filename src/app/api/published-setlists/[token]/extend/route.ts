import { NextResponse } from "next/server";
import {
  capabilityMatches,
  publicationExpiration,
  publishedStoreErrorResponse,
  readSharedRecord,
  replaceSharedRecord,
} from "@/lib/sharing/published-store";

function validToken(token: string) {
  return /^[A-Za-z0-9]{6,40}$/.test(token);
}

function bearer(request: Request): string | null {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!validToken(token))
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  try {
    const stored = await readSharedRecord(token);
    if (!stored || stored.record.status === "revoked")
      return NextResponse.json(
        {
          error:
            "The previous shared setlist is no longer available. Publish again to create a new link.",
        },
        { status: 404 },
      );
    if (!capabilityMatches(bearer(request), stored.record.ownerVerifier))
      return NextResponse.json(
        { error: "Owner access required" },
        { status: 403 },
      );

    const now = new Date().toISOString();
    const expiresAt = publicationExpiration(new Date(now));
    const replaced = await replaceSharedRecord(stored, {
      ...stored.record,
      status: "active",
      lastConfirmedAt: now,
      expiresAt,
    });
    return NextResponse.json({
      token,
      revision: stored.record.revision,
      etag: replaced.etag,
      expiresAt,
    });
  } catch (error) {
    console.error("Unable to extend shared setlist", error);
    const failure = publishedStoreErrorResponse(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}
