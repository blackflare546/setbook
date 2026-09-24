import type { ChartFontSettings } from "@/core/songs/chart-font-settings";

export interface SetlistSongEntry {
  id: string;
  songId: string;
  performanceKey?: string;
  arrangementCue: string;
}

export interface Setlist {
  id: string;
  name: string;
  venue: string;
  date?: string;
  notes: string;
  entries: SetlistSongEntry[];
  publishToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: "app";
  theme: "light" | "dark" | "system";
  performanceFontSize: number;
  chartFontSettings: ChartFontSettings;
}
