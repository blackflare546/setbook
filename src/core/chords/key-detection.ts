import {
  noteToPitchClass,
  parseChord,
  type ParsedChord,
} from "@/core/chords/chord";
import { MUSICAL_KEYS, type KeyMode } from "@/core/chords/keys";
import type { SongSection } from "@/core/songs/types";

// Candidates within three points are intentionally presented as ambiguous.
export const AMBIGUOUS_SCORE_DIFFERENCE = 3;

export interface DetectedKeyCandidate {
  key: string;
  mode: KeyMode;
}

export interface KeyDetectionResult {
  primary: DetectedKeyCandidate | null;
  alternatives: DetectedKeyCandidate[];
  confidence: "confident" | "ambiguous" | "unknown";
}

type HarmonicQuality = "major" | "minor" | "diminished" | "other";

interface ChordObservation {
  chord: ParsedChord;
  pitch: number;
  sectionEnding: boolean;
  songEnding: boolean;
}

interface ScoredKey extends DetectedKeyCandidate {
  score: number;
  pitch: number;
  order: number;
}

const MAJOR_FAMILY: Array<[number, HarmonicQuality]> = [
  [0, "major"],
  [2, "minor"],
  [4, "minor"],
  [5, "major"],
  [7, "major"],
  [9, "minor"],
  [11, "diminished"],
];

const MINOR_FAMILY: Array<[number, HarmonicQuality]> = [
  [0, "minor"],
  [2, "diminished"],
  [3, "major"],
  [5, "minor"],
  [7, "minor"],
  [8, "major"],
  [10, "major"],
];

function harmonicQuality(quality: string): HarmonicQuality {
  if (["dim", "dim7", "°", "m7b5", "ø"].includes(quality))
    return "diminished";
  if (/^(?:m(?!aj)|min|minor)/.test(quality)) return "minor";
  if (["aug", "+"].includes(quality)) return "other";
  return "major";
}

function collectObservations(sections: SongSection[]): ChordObservation[] {
  const observations: ChordObservation[] = [];
  const sectionEndingIndexes = new Set<number>();

  for (const section of sections) {
    let finalIndex = -1;
    for (const line of section.lines) {
      for (const chord of [...line.chords].sort(
        (left, right) => left.position - right.position,
      )) {
        const parsed = parseChord(chord.symbol);
        const pitch = parsed ? noteToPitchClass(parsed.root) : null;
        if (!parsed || pitch === null) continue;
        observations.push({
          chord: parsed,
          pitch,
          sectionEnding: false,
          songEnding: false,
        });
        finalIndex = observations.length - 1;
      }
    }
    if (finalIndex >= 0) sectionEndingIndexes.add(finalIndex);
  }

  for (const index of sectionEndingIndexes) {
    observations[index].sectionEnding = true;
  }
  if (observations.length) observations.at(-1)!.songEnding = true;
  return observations;
}

function scaleDegree(pitch: number, tonic: number): number {
  return (pitch - tonic + 12) % 12;
}

function familyQuality(mode: KeyMode, degree: number): HarmonicQuality | null {
  return (
    (mode === "major" ? MAJOR_FAMILY : MINOR_FAMILY).find(
      ([interval]) => interval === degree,
    )?.[1] ?? null
  );
}

function matchesFamily(
  mode: KeyMode,
  degree: number,
  quality: HarmonicQuality,
): boolean {
  if (familyQuality(mode, degree) === quality) return true;
  return mode === "minor" && degree === 7 && quality === "major";
}

function scoreKey(
  observations: ChordObservation[],
  key: (typeof MUSICAL_KEYS)[number],
  order: number,
): ScoredKey {
  const tonic = noteToPitchClass(key.root)!;
  let score = 0;
  const degrees: number[] = [];

  for (const observation of observations) {
    const degree = scaleDegree(observation.pitch, tonic);
    const quality = harmonicQuality(observation.chord.quality);
    degrees.push(degree);
    if (!matchesFamily(key.mode, degree, quality)) {
      score -= 1;
      continue;
    }

    score += 3;
    if (degree === 0) {
      score += 4;
      if (observation.chord.root === key.root) score += 0.25;
      if (observation.sectionEnding) score += 1;
      if (observation.songEnding) score += 1;
    }
    if (degree === 7 && quality === "major") score += 1;
  }

  for (let index = 1; index < degrees.length; index += 1) {
    const previous = degrees[index - 1];
    const current = degrees[index];
    if (previous === 7 && current === 0) score += 4;
    if (previous === 0 && current === 5) score += 2;
    if (previous === 5 && current === 7) score += 2;
    if (previous === 0 && current === 7) score += 2;
    if (key.mode === "major" && previous === 7 && current === 9) score += 2;
    if (key.mode === "minor" && previous === 10 && current === 0) score += 1;
  }

  return { key: key.root, mode: key.mode, score, pitch: tonic, order };
}

function asCandidate(candidate: ScoredKey): DetectedKeyCandidate {
  return { key: candidate.key, mode: candidate.mode };
}

export function detectSongKey(sections: SongSection[]): KeyDetectionResult {
  const observations = collectObservations(sections);
  const distinctRoots = new Set(observations.map(({ pitch }) => pitch));
  if (observations.length < 3 || distinctRoots.size < 2) {
    return { primary: null, alternatives: [], confidence: "unknown" };
  }

  const enharmonicCandidates = new Map<string, ScoredKey>();
  MUSICAL_KEYS.forEach((key, order) => {
    const candidate = scoreKey(observations, key, order);
    const id = `${candidate.pitch}:${candidate.mode}`;
    const existing = enharmonicCandidates.get(id);
    if (
      !existing ||
      candidate.score > existing.score ||
      (candidate.score === existing.score && candidate.order < existing.order)
    ) {
      enharmonicCandidates.set(id, candidate);
    }
  });

  const ranked = [...enharmonicCandidates.values()].sort(
    (left, right) => right.score - left.score || left.order - right.order,
  );
  const primary = ranked[0];
  if (!primary || primary.score < 10) {
    return { primary: null, alternatives: [], confidence: "unknown" };
  }

  const alternatives = ranked
    .slice(1)
    .filter(
      (candidate) =>
        primary.score - candidate.score <= AMBIGUOUS_SCORE_DIFFERENCE,
    )
    .slice(0, 2);

  return {
    primary: asCandidate(primary),
    alternatives: alternatives.map(asCandidate),
    confidence: alternatives.length ? "ambiguous" : "confident",
  };
}
