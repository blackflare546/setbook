import { NextResponse } from "next/server";
import { publishedSnapshotSchema } from "@/lib/validation/schemas";
import {
  deletePublishedSnapshot,
  publishedStoreErrorResponse,
  readPublishedSnapshot,
  savePublishedSnapshot,
} from "@/lib/sharing/published-store";

function validToken(token: string) {
  return /^[A-Za-z0-9]{6,24}$/.test(token);
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!validToken(token))
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  try {
    const snapshot = await readPublishedSnapshot(token);
    return snapshot
      ? NextResponse.json(snapshot)
      : NextResponse.json(
          { error: "Published setlist not found" },
          { status: 404 },
        );
  } catch (error) {
    console.error("Unable to read published setlist", error);
    const failure = publishedStoreErrorResponse(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!validToken(token))
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  const parsed = publishedSnapshotSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid published setlist", details: parsed.error.flatten() },
      { status: 400 },
    );
  try {
    if (!(await readPublishedSnapshot(token)))
      return NextResponse.json(
        { error: "Published setlist not found" },
        { status: 404 },
      );
    await savePublishedSnapshot(token, parsed.data);
    return NextResponse.json({ token, url: `/s/${token}` });
  } catch (error) {
    console.error("Unable to update published setlist", error);
    const failure = publishedStoreErrorResponse(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!validToken(token))
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  try {
    await deletePublishedSnapshot(token);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Unable to delete published setlist", error);
    const failure = publishedStoreErrorResponse(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}
