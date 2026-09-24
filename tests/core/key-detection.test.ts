import { describe, expect, it } from "vitest";
import { detectSongKey } from "@/core/chords/key-detection";
import { parseText } from "@/core/parser/parser";

function detect(chords: string) {
  return detectSongKey(parseText(`[Verse]\n${chords}`));
}

describe("deterministic song key detection", () => {
  it.each([
    ["G C D Em", { key: "G", mode: "major" }],
    ["D A Bm G", { key: "D", mode: "major" }],
  ])("detects a major key from %s", (chords, expected) => {
    const result = detect(chords);
    expect(result.confidence).toBe("confident");
    expect(result.primary).toEqual(expected);
  });

  it("detects a natural minor key", () => {
    expect(detect("Am Dm Em Am")).toMatchObject({
      primary: { key: "A", mode: "minor" },
      confidence: "confident",
    });
  });

  it("marks a relative major and minor progression as ambiguous", () => {
    const result = detect("Am F C G");
    expect(result.confidence).toBe("ambiguous");
    expect([result.primary, ...result.alternatives]).toEqual(
      expect.arrayContaining([
        { key: "C", mode: "major" },
        { key: "A", mode: "minor" },
      ]),
    );
  });

  it("reduces extended chords to their basic harmonic qualities", () => {
    expect(detect("Gmaj7 Cadd9 D7 Em9 G6")).toMatchObject({
      primary: { key: "G", mode: "major" },
      confidence: "confident",
    });
  });

  it("uses slash-chord roots rather than bass notes", () => {
    expect(detect("D/F# A/E Bm/F# G/B D/F#")).toMatchObject({
      primary: { key: "D", mode: "major" },
      confidence: "confident",
    });
  });

  it("recognizes diminished leading-tone chords", () => {
    expect(detect("C Dm Em F G Am Bdim C")).toMatchObject({
      primary: { key: "C", mode: "major" },
      confidence: "confident",
    });
  });

  it("allows a harmonic-minor major dominant", () => {
    expect(detect("Am Dm E E7 Am")).toMatchObject({
      primary: { key: "A", mode: "minor" },
      confidence: "confident",
    });
  });

  it("tolerates a borrowed chord without rejecting the likely key", () => {
    expect(detect("G C D F Em G")).toMatchObject({
      primary: { key: "G", mode: "major" },
      confidence: "confident",
    });
  });

  it("returns unknown when there is insufficient chord information", () => {
    expect(detect("G")).toEqual({
      primary: null,
      alternatives: [],
      confidence: "unknown",
    });
  });

  it.each([
    ["F# B C# D#m F#", "F#"],
    ["Bb Eb F Gm Bb", "Bb"],
  ])("preserves the likely accidental spelling for %s", (chords, key) => {
    expect(detect(chords)).toMatchObject({
      primary: { key, mode: "major" },
      confidence: "confident",
    });
  });
});
