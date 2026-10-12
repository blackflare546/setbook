import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function hasValue(name: string) {
  return Boolean(process.env[name]?.trim());
}

function hasSecret(name: string) {
  return (process.env[name]?.trim().length ?? 0) >= 32;
}

export function GET() {
  const hasPublishedStore =
    hasValue("BLOB_STORE_ID") || hasValue("BLOB_READ_WRITE_TOKEN");

  return NextResponse.json(
    {
      status: "ok",
      service: "setbook",
      features: {
        publicSharing:
          hasPublishedStore && hasSecret("SHARE_CAPABILITY_SECRET"),
        cleanup: hasSecret("CRON_SECRET"),
        feedback: hasValue("FORMSPREE_FORM_ID"),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
