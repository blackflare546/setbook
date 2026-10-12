import type { Metadata } from "next";
import { SongViewer } from "@/components/songs/song-viewer";

export const metadata: Metadata = { title: "Song chart" };

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SongViewer id={id} />;
}
