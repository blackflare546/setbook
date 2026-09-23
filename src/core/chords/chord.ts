export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const NOTE_TO_INDEX: Record<string, number> = {
  C: 0,
  "B#": 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  "E#": 5,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

export interface ParsedChord {
  root: string;
  quality: string;
  bass?: string;
}

export const CHORD_QUALITY_PATTERN =
  "(?:maj7|min7|m7|add9|sus2|sus4|dim|aug|m6|m|6|7|5|2)?";
const CHORD_RE = new RegExp(
  `^([A-G](?:#|b)?)(${CHORD_QUALITY_PATTERN})(?:\\/([A-G](?:#|b)?))?$`,
);

export function parseChord(value: string): ParsedChord | null {
  const match = value.trim().match(CHORD_RE);
  if (!match || NOTE_TO_INDEX[match[1]] === undefined) return null;
  return { root: match[1], quality: match[2] ?? "", bass: match[3] };
}

export function isChord(value: string): boolean {
  return parseChord(value) !== null;
}

export function transposeNote(
  note: string,
  semitones: number,
  preferFlats = false,
): string {
  const flats = [
    "C",
    "Db",
    "D",
    "Eb",
    "E",
    "F",
    "Gb",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
  ];
  const index = NOTE_TO_INDEX[note];
  if (index === undefined) return note;
  const normalized = (((index + semitones) % 12) + 12) % 12;
  return (preferFlats ? flats : NOTE_NAMES)[normalized];
}
