import {
  noteToPitchClass,
  parseChord,
  type ParsedChord,
} from "@/core/chords/chord";
import { MUSICAL_KEYS, type KeyMode } from "@/core/chords/keys";
import type { SectionType, SongSection } from "@/core/songs/types";

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
  sectionIndex: number;
  sectionType: SectionType;
  sectionOpening: boolean;
  phraseEnding: boolean;
  sectionEnding: boolean;
  songEnding: boolean;
}

interface AnalyzedObservation extends ChordObservation {
  degree: number;
  quality: HarmonicQuality;
  familyMatch: boolean;
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
  if (["dim", "dim7", "°", "m7b5", "ø"].includes(quality)) return "diminished";
  if (/^(?:m(?!aj)|min|minor)/.test(quality)) return "minor";
  if (["aug", "+"].includes(quality)) return "other";
  return "major";
}

function collectObservations(sections: SongSection[]): ChordObservation[] {
  const observations: ChordObservation[] = [];

  sections.forEach((section, sectionIndex) => {
    const sectionStart = observations.length;
    const phraseEndingIndexes: number[] = [];

    for (const line of section.lines) {
      let finalChordIndex = -1;
      for (const chord of [...line.chords].sort(
        (left, right) => left.position - right.position,
      )) {
        const parsed = parseChord(chord.symbol);
        const pitch = parsed ? noteToPitchClass(parsed.root) : null;
        if (!parsed || pitch === null) continue;
        observations.push({
          chord: parsed,
          pitch,
          sectionIndex,
          sectionType: section.type,
          sectionOpening: observations.length === sectionStart,
          phraseEnding: false,
          sectionEnding: false,
          songEnding: false,
        });
        finalChordIndex = observations.length - 1;
      }
      if (finalChordIndex >= 0) phraseEndingIndexes.push(finalChordIndex);
    }

    for (const index of phraseEndingIndexes) {
      observations[index].phraseEnding = true;
    }
    if (observations.length > sectionStart) {
      observations.at(-1)!.sectionEnding = true;
    }
  });

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
  // Harmonic minor commonly raises scale degree seven to make a major V.
  return mode === "minor" && degree === 7 && quality === "major";
}

function sectionEndingWeight(type: SectionType): number {
  if (type === "chorus") return 6;
  if (type === "verse" || type === "pre-chorus") return 4;
  if (type === "outro") return 6;
  return 3;
}

function isAdjacent(
  previous: AnalyzedObservation,
  current: AnalyzedObservation,
): boolean {
  return previous.sectionIndex === current.sectionIndex;
}

function scoreKey(
  observations: ChordObservation[],
  key: (typeof MUSICAL_KEYS)[number],
  order: number,
): ScoredKey {
  const tonic = noteToPitchClass(key.root)!;
  let score = 0;
  const analyzed: AnalyzedObservation[] = observations.map((observation) => {
    const degree = scaleDegree(observation.pitch, tonic);
    const quality = harmonicQuality(observation.chord.quality);
    return {
      ...observation,
      degree,
      quality,
      familyMatch: matchesFamily(key.mode, degree, quality),
    };
  });

  for (const observation of analyzed) {
    if (!observation.familyMatch) {
      score -= 5;
      continue;
    }

    // Family membership is useful, but deliberately weaker than structural
    // evidence such as cadences and endings.
    score += 1.5;
    if (observation.degree === 0) {
      score += 2;
      if (observation.chord.root === key.root) score += 0.25;
      if (observation.sectionOpening) score += 1;
      if (observation.phraseEnding) score += 2;
      if (observation.sectionEnding) {
        score += sectionEndingWeight(observation.sectionType);
      }
      if (observation.songEnding) score += 1;
    }
  }

  if (analyzed.every((observation) => observation.familyMatch)) score += 5;

  for (let index = 1; index < analyzed.length; index += 1) {
    const previous = analyzed[index - 1];
    const current = analyzed[index];
    if (!isAdjacent(previous, current)) continue;

    const resolvesToTonic = current.degree === 0;
    const dominantToTonic = previous.degree === 7 && resolvesToTonic;
    const predominantToTonic = previous.degree === 5 && resolvesToTonic;

    if (dominantToTonic && previous.quality === "major") {
      score += 7;
      if (current.phraseEnding) score += 7;
      if (current.sectionEnding) score += 4;
    } else if (
      dominantToTonic &&
      key.mode === "minor" &&
      previous.quality === "minor"
    ) {
      score += 8;
      if (current.phraseEnding) score += 2;
      if (current.sectionEnding) score += 2;
    }

    if (predominantToTonic && previous.quality === "major") {
      score += current.phraseEnding ? 6 : 3;
    }

    // ii - V is meaningful preparation, but is weaker than the resolution.
    if (previous.degree === 2 && current.degree === 7) score += 3;

    const beforePrevious = analyzed[index - 2];
    if (
      beforePrevious &&
      isAdjacent(beforePrevious, previous) &&
      beforePrevious.degree === 2 &&
      previous.degree === 7 &&
      resolvesToTonic &&
      previous.quality === "major"
    ) {
      score += 8;
    }

    // Common functional motion helps break otherwise equal family matches.
    if (previous.degree === 5 && current.degree === 7) score += 2;
    if (previous.degree === 0 && current.degree === 5) score += 1;
    if (previous.degree === 0 && current.degree === 7) score += 1;
    if (key.mode === "major" && previous.degree === 7 && current.degree === 9)
      score += 9;
    if (key.mode === "minor" && previous.degree === 10 && current.degree === 0)
      score += 2;
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
