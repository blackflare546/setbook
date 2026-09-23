import type { Metadata } from "next";
import { SongLibrary } from "@/components/songs/song-library";
export const metadata: Metadata = { title: "Song library" };
export default function LibraryPage() {
  return <SongLibrary />;
}
