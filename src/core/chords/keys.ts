import { parseChord, transposeNote } from "@/core/chords/chord";

export type KeyMode = "major" | "minor";

export interface MusicalKeyOption {
  value: string;
  root: string;
  mode: KeyMode;
  label: string;
}

const KEY_ROOTS = [
  "C",
  "C#",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

export const MUSICAL_KEYS: MusicalKeyOption[] = [
  ...KEY_ROOTS.map((root) => ({
    value: root,
    root,
    mode: "major" as const,
    label: `${root} Major`,
  })),
  ...KEY_ROOTS.map((root) => ({
    value: `${root}m`,
    root,
    mode: "minor" as const,
    label: `${root} Minor`,
  })),
];

const KEY_BY_VALUE = new Map(MUSICAL_KEYS.map((key) => [key.value, key]));

export function parseMusicalKey(value: string): MusicalKeyOption | null {
  return KEY_BY_VALUE.get(value) ?? null;
}

export function formatMusicalKey(value?: string): string {
  if (!value) return "Not set";
  const key = parseMusicalKey(value);
  if (key) return key.label;
  const parsed = parseChord(value);
  if (parsed && (parsed.quality === "" || parsed.quality === "m")) {
    return `${parsed.root} ${parsed.quality === "m" ? "Minor" : "Major"}`;
  }
  return value;
}

export function transposeMusicalKey(value: string, semitones: number): string {
  const key = parseMusicalKey(value);
  const parsed = parseChord(value);
  const root = key?.root ?? parsed?.root;
  const mode = key?.mode ?? (parsed?.quality === "m" ? "minor" : "major");
  if (!root || (parsed && !["", "m"].includes(parsed.quality))) return value;
  const transposedRoot = transposeNote(root, semitones, root.includes("b"));
  return `${transposedRoot}${mode === "minor" ? "m" : ""}`;
}

export function musicalKeyRoot(value: string): string | null {
  return parseMusicalKey(value)?.root ?? parseChord(value)?.root ?? null;
}
