import type { Chord, SongSection } from "@/core/songs/types";
import { parseChord, transposeNote } from "@/core/chords/chord";
import { musicalKeyRoot } from "@/core/chords/keys";

export function transposeChordSymbol(
  symbol: string,
  semitones: number,
): string {
  const parsed = parseChord(symbol);
  if (!parsed) return symbol;
  const preferFlats = parsed.root.includes("b");
  const root = transposeNote(parsed.root, semitones, preferFlats);
  const bass = parsed.bass
    ? `/${transposeNote(parsed.bass, semitones, parsed.bass.includes("b"))}`
    : "";
  return `${root}${parsed.quality}${bass}`;
}

export function transposeChord(chord: Chord, semitones: number): Chord {
  return { ...chord, symbol: transposeChordSymbol(chord.symbol, semitones) };
}

export function transposeSections(
  sections: SongSection[],
  semitones: number,
): SongSection[] {
  return sections.map((section) => ({
    ...section,
    lines: section.lines.map((line) => ({
      ...line,
      chords: line.chords.map((chord) => transposeChord(chord, semitones)),
    })),
  }));
}

export function semitoneDistance(from: string, to: string): number {
  const chromatic = [
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
  ];
  const normalize = (key: string) => {
    const root = musicalKeyRoot(key);
    return root ? transposeNote(root, 0) : key;
  };
  const start = chromatic.indexOf(normalize(from));
  const end = chromatic.indexOf(normalize(to));
  if (start < 0 || end < 0) return 0;
  return (end - start + 12) % 12;
}
