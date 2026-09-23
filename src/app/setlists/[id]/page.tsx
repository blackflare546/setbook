import { SetlistEditor } from "@/components/setlists/setlist-editor";
export default async function SetlistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SetlistEditor id={id} />;
}
