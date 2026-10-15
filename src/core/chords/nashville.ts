import { noteToPitchClass, parseChord } from "@/core/chords/chord";
import { parseMusicalKey, type KeyMode } from "@/core/chords/keys";
import type { NashvilleMinorMode } from "@/core/songs/chart-font-settings";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const NATURAL_PITCH_CLASSES: Record<(typeof LETTERS)[number], number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const;

interface ResolvedKey {
  root: string;
  mode: KeyMode;
}

export interface NashvilleReference {
  root: string;
  tonicLabel: string;
}

function normalizePitchClass(value: number): number {
  return ((value % 12) + 12) % 12;
}

function resolveKey(value: string): ResolvedKey | null {
  const normalized = parseMusicalKey(value);
  if (normalized) return normalized;

  const label = value.trim().match(/^([A-G](?:#|b)?)\s+(Major|Minor)$/i);
  if (!label || noteToPitchClass(label[1]) === null) return null;
  return {
    root: `${label[1][0].toUpperCase()}${label[1].slice(1)}`,
    mode: label[2].toLowerCase() === "minor" ? "minor" : "major",
  };
}

function spellPitchClassForLetter(pitchClass: number, letter: string): string {
  const natural =
    NATURAL_PITCH_CLASSES[letter as keyof typeof NATURAL_PITCH_CLASSES];
  if (natural === undefined) return letter;
  const difference = normalizePitchClass(pitchClass - natural);
  if (difference === 0) return letter;
  if (difference === 1) return `${letter}#`;
  if (difference === 11) return `${letter}b`;
  return letter;
}

function relativeMajorRoot(minorRoot: string): string | null {
  const pitchClass = noteToPitchClass(minorRoot);
  const letterIndex = LETTERS.indexOf(minorRoot[0] as (typeof LETTERS)[number]);
  if (pitchClass === null || letterIndex < 0) return null;
  const targetLetter = LETTERS[(letterIndex + 2) % LETTERS.length];
  return spellPitchClassForLetter(pitchClass + 3, targetLetter);
}

export function getNashvilleReference(
  key: string,
  minorMode: NashvilleMinorMode,
): NashvilleReference | null {
  const resolved = resolveKey(key);
  if (!resolved) return null;

  if (resolved.mode === "minor" && minorMode === "relative-major") {
    const root = relativeMajorRoot(resolved.root);
    return root ? { root, tonicLabel: `1 = ${root}` } : null;
  }

  return {
    root: resolved.root,
    tonicLabel:
      resolved.mode === "minor"
        ? `1m = ${resolved.root}m`
        : `1 = ${resolved.root}`,
  };
}

function degreeForNote(note: string, referenceRoot: string): string | null {
  const notePitchClass = noteToPitchClass(note);
  const referencePitchClass = noteToPitchClass(referenceRoot);
  const noteLetterIndex = LETTERS.indexOf(note[0] as (typeof LETTERS)[number]);
  const referenceLetterIndex = LETTERS.indexOf(
    referenceRoot[0] as (typeof LETTERS)[number],
  );
  if (
    notePitchClass === null ||
    referencePitchClass === null ||
    noteLetterIndex < 0 ||
    referenceLetterIndex < 0
  )
    return null;

  const degreeIndex =
    (noteLetterIndex - referenceLetterIndex + LETTERS.length) % LETTERS.length;
  const expectedPitchClass = normalizePitchClass(
    referencePitchClass + MAJOR_SCALE_INTERVALS[degreeIndex],
  );
  let alteration = normalizePitchClass(notePitchClass - expectedPitchClass);
  if (alteration > 6) alteration -= 12;
  if (Math.abs(alteration) > 2) return null;

  const accidental =
    alteration < 0 ? "♭".repeat(Math.abs(alteration)) : "♯".repeat(alteration);
  return `${accidental}${degreeIndex + 1}`;
}

function normalizeQuality(quality: string): string {
  if (quality === "" || quality === "Major") return "";
  if (quality === "min" || quality === "minor") return "m";
  if (quality === "M7") return "maj7";
  return quality;
}

export function toNashvilleChordSymbol(
  symbol: string,
  key: string,
  minorMode: NashvilleMinorMode,
): string | null {
  const chord = parseChord(symbol);
  const reference = getNashvilleReference(key, minorMode);
  if (!chord || !reference) return null;

  const root = degreeForNote(chord.root, reference.root);
  const bass = chord.bass ? degreeForNote(chord.bass, reference.root) : null;
  if (!root || (chord.bass && !bass)) return null;

  return `${root}${normalizeQuality(chord.quality)}${bass ? `/${bass}` : ""}`;
}
