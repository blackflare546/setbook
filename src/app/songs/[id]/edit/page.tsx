import type { Metadata } from "next";
import { SongEditor } from "@/components/songs/song-editor";

export const metadata: Metadata = { title: "Edit song" };

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SongEditor songId={id} />;
}
