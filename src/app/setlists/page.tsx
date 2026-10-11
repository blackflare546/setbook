import type { Metadata } from "next";
import { SetlistList } from "@/components/setlists/setlist-list";

export const metadata: Metadata = { title: "Setlists" };

export default function SetlistsPage() {
  return <SetlistList />;
}
