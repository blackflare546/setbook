import type { Metadata } from "next";
import { SongEditor } from "@/components/songs/song-editor";

export const metadata: Metadata = { title: "New song" };

export default function NewSongPage() {
  return <SongEditor />;
}
