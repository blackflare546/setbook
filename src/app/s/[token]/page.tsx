import { notFound } from "next/navigation";
import { readPublishedPublication } from "@/lib/sharing/published-store";
import { PerformanceView } from "@/components/performance/performance-view";
export const dynamic = "force-dynamic";
export default async function SharedSetlistPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const publication = await readPublishedPublication(token);
  if (!publication) notFound();
  return (
    <PerformanceView
      snapshot={publication.snapshot}
      publicMode
      publicToken={token}
    />
  );
}
