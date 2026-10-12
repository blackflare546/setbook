import type { Metadata } from "next";
import { SharedSetlistView } from "@/components/setlists/shared-setlist-view";

export const metadata: Metadata = { title: "Shared setlist" };

export default async function SharedSetlistAppPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedSetlistView token={token} />;
}
