import type {
  ChartColors,
  ChartFontSettings,
  ChartLayout,
} from "@/core/songs/chart-font-settings";

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
  shareBinding?: {
    publicToken: string;
    ownerCapability: string;
    revision: number;
    etag: string;
    sharedBy?: string;
    includeNotes: boolean;
    includeLinks: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FollowedSharedSetlist {
  publicToken: string;
  snapshot: import("@/lib/validation/schemas").PublishedSnapshot;
  revision: number;
  etag: string;
  status: "current" | "update-available" | "offline" | "unavailable";
  followedAt: string;
  lastCheckedAt: string;
}

export interface AppSettings {
  id: "app";
  theme: "light" | "dark" | "system";
  performanceFontSize: number;
  chartFontSettings: ChartFontSettings;
  chartColors: ChartColors;
  chartLayout: ChartLayout;
  hasSeenLandingPage: boolean;
}
