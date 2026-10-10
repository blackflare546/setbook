import { cleanupPublishedSetlists } from "@/lib/sharing/published-store";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await cleanupPublishedSetlists();
    console.info("Published setlist cleanup completed", result);
    return Response.json(result, { status: result.failed ? 503 : 200 });
  } catch (error) {
    console.error("Published setlist cleanup failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "Cleanup failed" }, { status: 503 });
  }
}
