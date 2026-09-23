import { SongEditor } from "@/components/songs/song-editor";

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SongEditor songId={id} />;
}
