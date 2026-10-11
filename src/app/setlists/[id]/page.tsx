import type { Metadata } from "next";
import { SetlistEditor } from "@/components/setlists/setlist-editor";

export const metadata: Metadata = { title: "Edit setlist" };

export default async function SetlistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SetlistEditor id={id} />;
}
