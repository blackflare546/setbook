import type { Metadata } from "next";
import { LocalPerformance } from "@/components/performance/local-performance";

export const metadata: Metadata = { title: "Performance" };

export default async function PerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LocalPerformance id={id} />;
}
