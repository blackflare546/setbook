import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PerformanceView } from "@/components/performance/performance-view";
import { readPublishedPublication } from "@/lib/sharing/published-store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shared performance" };

export default async function SharedSetlistPerformancePage({
  params,
}: PageProps<"/shared/[token]/performance">) {
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
