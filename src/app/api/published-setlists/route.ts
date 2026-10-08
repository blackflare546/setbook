import { NextResponse } from "next/server";
import { z } from "zod";
import { publishedSnapshotV2Schema } from "@/lib/validation/schemas";
import {
  capabilityVerifier,
  createCapability,
  createPublicToken,
  createSharedRecord,
  publishedStoreErrorResponse,
  readPublishedSnapshot,
} from "@/lib/sharing/published-store";

const createSchema = z.object({
  snapshot: publishedSnapshotV2Schema,
  accessMode: z.enum(["view", "editable"]).default("view"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(
    body?.snapshot ? body : { snapshot: body, accessMode: "view" },
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
    const editorCapability =
      parsed.data.accessMode === "editable" ? createCapability() : null;
    const now = new Date().toISOString();
    const snapshot = { ...parsed.data.snapshot, publishedAt: now };
    const etag = await createSharedRecord({
      schemaVersion: 2,
      publicToken: token,
      revision: 1,
      accessMode: parsed.data.accessMode,
      snapshot,
      ownerVerifier: capabilityVerifier(ownerCapability),
      editorVerifier: editorCapability
        ? capabilityVerifier(editorCapability)
        : null,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json(
      {
        token,
        url: `/s/${token}`,
        revision: 1,
        etag,
        accessMode: parsed.data.accessMode,
        ownerCapability,
        editorCapability,
        recoveryUrl: `/shared/${token}#owner=${ownerCapability}`,
        editorUrl: editorCapability
          ? `/shared/${token}#editor=${editorCapability}`
          : null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unable to create shared setlist", error);
    const failure = publishedStoreErrorResponse(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
