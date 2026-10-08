import { NextResponse } from "next/server";
import { z } from "zod";
import {
  capabilityMatches,
  capabilityVerifier,
  createCapability,
  publishedStoreErrorResponse,
  readSharedRecord,
  replaceSharedRecord,
} from "@/lib/sharing/published-store";

const requestSchema = z.object({
  action: z.enum(["set-mode", "rotate-editor", "rotate-owner"]),
  mode: z.enum(["view", "editable"]).optional(),
  expectedRevision: z.number().int().positive(),
  expectedEtag: z.string().min(1),
});

function bearer(request: Request): string | null {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid access request" }, { status: 400 });
  try {
    const stored = await readSharedRecord(token);
    if (!stored)
      return NextResponse.json({ error: "Shared setlist not found" }, { status: 404 });
    if (!capabilityMatches(bearer(request), stored.record.ownerVerifier))
      return NextResponse.json({ error: "Owner access required" }, { status: 403 });
    if (
      parsed.data.expectedRevision !== stored.record.revision ||
      parsed.data.expectedEtag !== stored.etag
    )
      return NextResponse.json(
        { error: "Someone updated this setlist. Refresh and try again." },
        { status: 409 },
      );

    let ownerCapability: string | null = null;
    let editorCapability: string | null = null;
    let accessMode = stored.record.accessMode;
    let ownerVerifier = stored.record.ownerVerifier;
    let editorVerifier = stored.record.editorVerifier;

    if (parsed.data.action === "set-mode") {
      if (!parsed.data.mode)
        return NextResponse.json({ error: "Mode is required" }, { status: 400 });
      accessMode = parsed.data.mode;
      if (accessMode === "view") editorVerifier = null;
      else {
        editorCapability = createCapability();
        editorVerifier = capabilityVerifier(editorCapability);
      }
    } else if (parsed.data.action === "rotate-editor") {
      if (accessMode !== "editable")
        return NextResponse.json(
          { error: "Enable editing before rotating the editor link" },
          { status: 409 },
        );
      editorCapability = createCapability();
      editorVerifier = capabilityVerifier(editorCapability);
    } else {
      ownerCapability = createCapability();
      ownerVerifier = capabilityVerifier(ownerCapability);
    }

    const now = new Date().toISOString();
    const revision = stored.record.revision + 1;
    const etag = await replaceSharedRecord(
      {
        ...stored.record,
        revision,
        accessMode,
        ownerVerifier,
        editorVerifier,
        updatedAt: now,
      },
      stored.etag,
    );
    return NextResponse.json({
      token,
      revision,
      etag,
      accessMode,
      editorCapability,
      editorUrl: editorCapability
        ? `/shared/${token}#editor=${editorCapability}`
        : null,
      ownerCapability,
      recoveryUrl: ownerCapability
        ? `/shared/${token}#owner=${ownerCapability}`
        : null,
    });
  } catch (error) {
    console.error("Unable to update shared access", error);
    const failure = publishedStoreErrorResponse(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
