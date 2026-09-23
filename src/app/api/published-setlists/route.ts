import { NextResponse } from "next/server";
import { publishedSnapshotSchema } from "@/lib/validation/schemas";
import {
  createPublicToken,
  readPublishedSnapshot,
  savePublishedSnapshot,
} from "@/lib/sharing/published-store";

export async function POST(request: Request) {
  const parsed = publishedSnapshotSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid published setlist", details: parsed.error.flatten() },
      { status: 400 },
    );
  let token = createPublicToken();
  for (
    let attempt = 0;
    attempt < 4 && (await readPublishedSnapshot(token));
    attempt += 1
  )
    token = createPublicToken();
  await savePublishedSnapshot(token, parsed.data);
  return NextResponse.json({ token, url: `/s/${token}` }, { status: 201 });
}
