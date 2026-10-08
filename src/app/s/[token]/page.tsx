import { notFound } from "next/navigation";
import {
  readPublishedSnapshot,
  readSharedRecord,
} from "@/lib/sharing/published-store";
import { PerformanceView } from "@/components/performance/performance-view";
export const dynamic = "force-dynamic";
export default async function SharedSetlistPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const snapshot = await readPublishedSnapshot(token);
  if (!snapshot) notFound();
  const stored = await readSharedRecord(token);
  return (
    <PerformanceView
      snapshot={snapshot}
      publicMode
      publicToken={token}
      publicRevision={stored?.record.revision ?? 1}
    />
  );
}
