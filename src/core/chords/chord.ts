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

const COMMON_ROOTS = new Set([
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
]);

const SIMPLE_QUALITIES = new Set([
  "",
  "Major",
  "m",
  "min",
  "minor",
  "5",
  "2",
  "add2",
  "add9",
  "add11",
  "add13",
  "sus",
  "sus2",
  "sus4",
  "6",
  "m6",
  "7",
  "m7",
  "min7",
  "maj7",
  "M7",
  "9",
  "m9",
  "min9",
  "maj9",
  "11",
  "m11",
  "min11",
  "maj11",
  "13",
  "m13",
  "min13",
  "maj13",
  "dim",
  "dim7",
  "°",
  "aug",
  "+",
  "m7b5",
  "ø",
  "6/9",
]);

const ALTERED_QUALITY_RE =
  /^(?:7|9|11|13|m7|min7|m9|min9|m11|min11|m13|min13|maj7|maj9|maj11|maj13)(?:(?:b|#)(?:5|9|11|13))+$/;

function isValidQuality(quality: string): boolean {
  return SIMPLE_QUALITIES.has(quality) || ALTERED_QUALITY_RE.test(quality);
}

export function parseChord(value: string): ParsedChord | null {
  const token = value.trim();
  const rootMatch = token.match(/^([A-G](?:#|b)?)/);
  if (!rootMatch || !COMMON_ROOTS.has(rootMatch[1])) return null;

  const root = rootMatch[1];
  let quality = token.slice(root.length);
  let bass: string | undefined;
  const bassMatch = quality.match(/^(.*)\/([A-G](?:#|b)?)$/);
  if (bassMatch && COMMON_ROOTS.has(bassMatch[2])) {
    quality = bassMatch[1];
    bass = bassMatch[2];
  }
  if (!isValidQuality(quality)) return null;
  return { root, quality, bass };
}

export function parseChordPrefix(
  value: string,
): { symbol: string; chord: ParsedChord; rest: string } | null {
  for (let end = value.length - 1; end >= 1; end -= 1) {
    const symbol = value.slice(0, end);
    const rest = value.slice(end);
    const chord = parseChord(symbol);
    if (chord && /^\p{Lu}/u.test(rest)) return { symbol, chord, rest };
  }
  return null;
}

export function isChord(value: string): boolean {
  return parseChord(value) !== null;
}

export function noteToPitchClass(note: string): number | null {
  return NOTE_TO_INDEX[note] ?? null;
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
