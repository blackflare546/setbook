export const SECTION_TYPES = [
  "intro",
  "verse",
  "pre-chorus",
  "chorus",
  "bridge",
  "instrumental",
  "outro",
  "other",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export interface Chord {
  id: string;
  symbol: string;
  position: number;
}

export interface SongLine {
  id: string;
  lyrics: string;
  chords: Chord[];
}

export interface SongSection {
  id: string;
  type: SectionType;
  title: string;
  lines: SongLine[];
}

export interface SongLinks {
  audio?: string;
  reference?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  originalKey: string;
  tags: string[];
  sections: SongSection[];
  notes: string;
  links: SongLinks;
  sourceText: string;
  createdAt: string;
  updatedAt: string;
}

export const newId = () => crypto.randomUUID();

export function createEmptySong(): Song {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: "Untitled song",
    artist: "",
    originalKey: "",
    tags: [],
    sections: [
      {
        id: newId(),
        type: "verse",
        title: "Verse 1",
        lines: [{ id: newId(), lyrics: "", chords: [] }],
      },
    ],
    notes: "",
    links: {},
    sourceText: "",
    createdAt: now,
    updatedAt: now,
  };
}
