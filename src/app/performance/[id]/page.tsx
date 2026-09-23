import { LocalPerformance } from "@/components/performance/local-performance";
export default async function PerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LocalPerformance id={id} />;
}
