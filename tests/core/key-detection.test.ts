import { describe, expect, it } from "vitest";
import { detectSongKey } from "@/core/chords/key-detection";
import { parseText } from "@/core/parser/parser";

function detect(chords: string) {
  return detectSongKey(parseText(`[Verse]\n${chords}`));
}

function detectChart(chart: string) {
  return detectSongKey(parseText(chart));
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

  it("uses repeated structural resolutions to distinguish B major from E major", () => {
    const result = detectChart(`[Verse 1]
E E E E C#m E
G#m E F# B

[Pre-Chorus]
E E E E G#m E
C#m E F# B

[Chorus 1]
E E E E B E
C#m G#m E F# B

[Verse 2]
E E E E C#m E
G#m E F# B

[Chorus 2]
E E E E B E
C#m G#m E F# B`);

    expect(result).toMatchObject({
      primary: { key: "B", mode: "major" },
      confidence: "confident",
    });
  });

  it("uses the complete diatonic vocabulary when repeated IV chords end phrases", () => {
    const result = detectChart(`[Intro]
D G D G
[Verse]
D                           G
Every tribe will see Your glory
D                   G
Every nation bow before You
D                           G
All our treasure turned to ashes
                D/F# G
In the light of You
[Pre-Chorus]
G  D/F#   Em D
As we're singing
A                  Bm
Holy is the Lord Almighty
              A
Only You are worthy
              G
Worthy of it all
[Verse]
D                           G
Every tribe will see Your glory
D                   G
Every nation bow before You, ohh-oh-oh-ohh
D                           G
All our treasure turned to ashes
                 D/F#       G
In the light of You, oh, ohh-oh-oh-ohh
[Pre-Chorus]
G  D/F#   Em D
As we're singing
A                  Bm
Holy is the Lord Almighty
              A
Only You are worthy
              G
Worthy of it all
[Chorus]
D
Praise and glory
D
Honor and strength
G
Unto our God
G
Unto our God

Bm
Matchless, endless
Bm
Love unrestrained
G
This is our God
G
Every tribe sing
[Bridge]
D
There is no one like our God
G
There is no one like our God

D
Wala kang katulad O Dios
G
Wala kang katulad O Dios

[Chorus]
D
Praise and glory
D
Honor and strength
G
Unto our God
G
Unto our God

Bm
Matchless, endless
Bm
Love unrestrained
G
This is our God
G
Every tribe sing`);

    expect(result).toMatchObject({
      primary: { key: "D", mode: "major" },
      confidence: "confident",
    });
  });

  it.each([
    ["G C G C", { key: "C", mode: "major" }],
    ["A D A D", { key: "D", mode: "major" }],
    ["C F C F", { key: "F", mode: "major" }],
  ])("recognizes repeated V to I resolutions in %s", (chords, expected) => {
    expect(detect(chords)).toMatchObject({
      primary: expected,
      confidence: "confident",
    });
  });

  it.each([
    ["Am F C Am F C", "C"],
    ["Em C G Em C G", "G"],
  ])("recognizes IV to I resolutions in %s", (chords, key) => {
    expect(detect(chords)).toMatchObject({
      primary: { key, mode: "major" },
      confidence: "confident",
    });
  });

  it.each([
    ["Dm G C Dm G C", "C"],
    ["Em A D Em A D", "D"],
  ])("recognizes ii to V to I progressions in %s", (chords, key) => {
    expect(detect(chords)).toMatchObject({
      primary: { key, mode: "major" },
      confidence: "confident",
    });
  });

  it("does not require the opening chord to be the tonic", () => {
    expect(detect("F G C Am F G C")).toMatchObject({
      primary: { key: "C", mode: "major" },
      confidence: "confident",
    });
    expect(detect("G Am F G C")).toMatchObject({
      primary: { key: "C", mode: "major" },
      confidence: "confident",
    });
  });

  it("lets repeated choruses establish the tonic", () => {
    expect(
      detectChart(`[Verse]
Am F C G

[Chorus 1]
F G C

[Chorus 2]
F G C`),
    ).toMatchObject({
      primary: { key: "C", mode: "major" },
      confidence: "confident",
    });
  });

  it("does not let a short interlude outweigh repeated harmonic structure", () => {
    expect(
      detectChart(`[Verse]
Dm G C

[Chorus 1]
F G C

[Interlude]
D D D D

[Chorus 2]
F G C`),
    ).toMatchObject({
      primary: { key: "C", mode: "major" },
      confidence: "confident",
    });
  });

  it("reduces extended chords to their basic harmonic qualities", () => {
    expect(detect("Gmaj7 Cadd9 D7 Em9 G6")).toMatchObject({
      primary: { key: "G", mode: "major" },
      confidence: "confident",
    });
  });

  it("handles extensions while preserving structural resolution", () => {
    expect(detect("Eadd9 F# B2 G#m7 Eadd9 F# B2")).toMatchObject({
      primary: { key: "B", mode: "major" },
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

  it("does not mutate song sections while detecting a key", () => {
    const sections = parseText(`[Verse]\nF G C\nWords here`);
    const before = structuredClone(sections);

    detectSongKey(sections);

    expect(sections).toEqual(before);
  });

  it.each([
    ["F# B C# D#m F#", "F#"],
    ["Bb Eb F Gm Bb", "Bb"],
    ["Db Gb Ab Bbm Db", "Db"],
  ])("preserves the likely accidental spelling for %s", (chords, key) => {
    expect(detect(chords)).toMatchObject({
      primary: { key, mode: "major" },
      confidence: "confident",
    });
  });
});
