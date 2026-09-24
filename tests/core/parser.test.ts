import { describe, expect, it } from "vitest";
import {
  classifyLine,
  parseChord,
  parseChordLine,
  parseInlineLine,
  parseSong,
  parseText,
} from "@/core/parser/parser";

describe("chord parsing", () => {
  it.each([
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
  ])("accepts the common root %s", (value) =>
    expect(parseChord(value)).not.toBeNull(),
  );

  it.each([
    "C",
    "G",
    "F#",
    "Bb",
    "Am",
    "Em7",
    "D7",
    "Cmaj7",
    "C5",
    "CMajor",
    "Cmin",
    "Cminor",
    "Cadd2",
    "Cadd9",
    "Cadd11",
    "Cadd13",
    "Csus",
    "Csus2",
    "Csus4",
    "C6",
    "Cm6",
    "Dm6",
    "E7",
    "Fmaj7",
    "CM7",
    "Gmin7",
    "C9",
    "Cm9",
    "Cmin9",
    "Cmaj9",
    "C11",
    "Cm11",
    "Cmin11",
    "Cmaj11",
    "C13",
    "Cm13",
    "Cmin13",
    "Cmaj13",
    "Bdim",
    "Cdim7",
    "C°",
    "Caug",
    "C+",
    "Cm7b5",
    "Cø",
    "Dsus2",
    "Esus4",
    "Fadd9",
    "C7b5",
    "C7#5",
    "C7b9",
    "C7#9",
    "C7b13",
    "C7#11",
    "Cmaj7b5",
    "Cmaj7#11",
    "C/G",
    "D/F#",
    "Am/E",
    "G/B",
    "F#m7/C#",
    "Bbmaj7/D",
    "Cadd9/E",
    "C6/9",
    "C2",
    "D2",
  ])("accepts %s", (value) => expect(parseChord(value)).not.toBeNull());
  it.each(["Avenue", "Be", "Garden", "hello", "H7", "Amazing"])(
    "rejects ordinary word %s",
    (value) => expect(parseChord(value)).toBeNull(),
  );

  it("distinguishes slash qualities from slash bass notes", () => {
    expect(parseChord("C6/9")).toEqual({
      root: "C",
      quality: "6/9",
      bass: undefined,
    });
    expect(parseChord("F#m7/C#")).toEqual({
      root: "F#",
      quality: "m7",
      bass: "C#",
    });
  });
});

describe("line classification", () => {
  it("recognizes sections", () =>
    expect(classifyLine("[Chorus] ")).toBe("section"));
  it("recognizes chord-only rows", () =>
    expect(classifyLine("G  D/F#  Em7  Cadd9")).toBe("chords"));
  it("does not misclassify normal lyrics", () =>
    expect(classifyLine("A garden by the sea")).toBe("lyrics"));
  it("recognizes inline chords", () =>
    expect(classifyLine("[G]I found a [D]love")).toBe("inline"));
  it("recognizes section headings with chords", () =>
    expect(classifyLine("[Intro] G Em7 C2 D")).toBe("section"));
  it("recognizes compact chord and lyric rows", () =>
    expect(classifyLine("Em7The splendor of a King")).toBe("compact"));
  it.each([
    "And we sing",
    "As I am",
    "Be still",
    "Can you hear",
    "Garden song",
  ])("keeps ordinary lyric text as lyrics: %s", (line) =>
    expect(classifyLine(line)).toBe("lyrics"),
  );
});

describe("positioning", () => {
  it("removes inline tokens and stores positions", () => {
    const line = parseInlineLine("[G]I found a [D]love");
    expect(line.lyrics).toBe("I found a love");
    expect(line.chords.map((c) => [c.symbol, c.position])).toEqual([
      ["G", 0],
      ["D", 10],
    ]);
  });
  it("maps above-line chord columns to lyric positions", () => {
    const line = parseChordLine("G       D", "Amazing grace");
    expect(line.chords.map((c) => c.position)).toEqual([0, 8]);
  });
  it("keeps chord positions beyond the end of the lyric text", () => {
    const line = parseChordLine("E                 B", "Short lyric");
    expect(line.chords.map((chord) => [chord.symbol, chord.position])).toEqual([
      ["E", 0],
      ["B", 18],
    ]);
    expect(line.chords[1].position).toBeGreaterThan(line.lyrics.length);
  });
  it("preserves wide source coordinates without snapping to lyric words", () => {
    const line = parseChordLine(
      "E                 B        C#m   A   B",
      "Lift him up and shout his name over all",
    );
    expect(line.chords.map((chord) => [chord.symbol, chord.position])).toEqual([
      ["E", 0],
      ["B", 18],
      ["C#m", 27],
      ["A", 33],
      ["B", 37],
    ]);
  });
  it("preserves leading space and distant C# A B coordinates", () => {
    const line = parseChordLine(
      "        C#                         A        B",
      "Lift him up and shout his name over all",
    );
    expect(line.chords.map((chord) => [chord.symbol, chord.position])).toEqual([
      ["C#", 8],
      ["A", 35],
      ["B", 44],
    ]);
    expect(line.chords.at(-1)?.position).toBeGreaterThan(line.lyrics.length);
  });
  it("does not clamp an explicit position 42 to a shorter lyric", () => {
    const line = parseChordLine(
      `${" ".repeat(42)}B`,
      "123456789012345678901234567890",
    );
    expect(line.lyrics).toHaveLength(30);
    expect(line.chords[0].position).toBe(42);
  });
  it("splits a compact chord prefix without changing the lyric", () => {
    const [line] = parseText("Em7The splendor of a King")[0].lines;
    expect(line.lyrics).toBe("The splendor of a King");
    expect(line.chords.map((chord) => [chord.symbol, chord.position])).toEqual([
      ["Em7", 0],
    ]);
  });
  it.each([
    ["Em7The splendor of a King", "Em7", "The splendor of a King", 0],
    ["C2Let all the earth rejoice", "C2", "Let all the earth rejoice", 0],
    ["GHow great is our God", "G", "How great is our God", 0],
    [
      "        F#m7/C#Worthy of all praise",
      "F#m7/C#",
      "Worthy of all praise",
      8,
    ],
  ])(
    "uses the longest valid compact chord in %s",
    (source, symbol, lyrics, position) => {
      const [line] = parseText(source)[0].lines;
      expect(line.lyrics).toBe(lyrics);
      expect(
        line.chords.map((chord) => [chord.symbol, chord.position]),
      ).toEqual([[symbol, position]]);
    },
  );

  it("uses the authoritative grammar for complex inline chords", () => {
    const line = parseInlineLine("[Cmaj7#11]Shine [F#m7/C#]bright");
    expect(line.lyrics).toBe("Shine bright");
    expect(line.chords.map((chord) => chord.symbol)).toEqual([
      "Cmaj7#11",
      "F#m7/C#",
    ]);
  });
});

describe("song parsing", () => {
  const source =
    "[Verse 1]\nG       D\nAmazing grace\n\nChorus:\n[C]I once was [G]lost";
  it("detects sections and mixed layouts", () => {
    const sections = parseText(source);
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("Verse 1");
    expect(sections[1].type).toBe("chorus");
    expect(sections[1].lines[0].chords).toHaveLength(2);
  });
  it("creates a complete structured song", () => {
    const song = parseSong(source, {
      title: "Amazing Grace",
      artist: "Traditional",
      originalKey: "G",
    });
    expect(song.title).toBe("Amazing Grace");
    expect(song.sections[0].lines[0].lyrics).toBe("Amazing grace");
  });

  it("keeps leading chord coordinates after an inferred title preamble", () => {
    const song = parseSong(
      "Turn It Up\n\n[Chorus]\n        C#                         A        B\nLift him up and shout his name over all",
    );
    expect(
      song.sections[0].lines[0].chords.map((chord) => chord.position),
    ).toEqual([8, 35, 44]);
  });

  it("keeps chords placed after an inline section heading", () => {
    const [intro] = parseText("[Intro] G Em7 C2 D");
    expect(intro.title).toBe("Intro");
    expect(intro.lines[0].chords.map((chord) => chord.symbol)).toEqual([
      "G",
      "Em7",
      "C2",
      "D",
    ]);
  });

  it("parses the full How Great Is Our God regression chart", () => {
    const song = parseSong(HOW_GREAT_IS_OUR_GOD, {
      title: "How Great Is Our God",
    });
    const titles = song.sections.map((section) => section.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        "Intro",
        "Verse 1",
        "Verse 2",
        "Chorus",
        "Bridge",
        "Outro",
      ]),
    );
    const chords = song.sections.flatMap((section) =>
      section.lines.flatMap((line) => line.chords),
    );
    expect(chords.some((chord) => chord.symbol === "C2")).toBe(true);
    expect(chords.some((chord) => chord.symbol === "Em7")).toBe(true);
    const firstVerse = song.sections.find(
      (section) => section.title === "Verse 1",
    )!;
    expect(firstVerse.lines[0].lyrics).toBe(
      "The splendor of a King, clothed in majesty,",
    );
    expect(firstVerse.lines[0].chords.map((chord) => chord.symbol)).toEqual([
      "G",
      "Em7",
    ]);
    expect(firstVerse.lines[0].chords[1].position).toBeGreaterThan(0);
    expect(song.sourceText).toBe(HOW_GREAT_IS_OUR_GOD);
  });
});

const HOW_GREAT_IS_OUR_GOD = `How Great is our God,

[Intro] G Em7 C2 D

[Verse 1]
G                   Em7
The splendor of a King, clothed in majesty,
                    C2
Let all the earth rejoice, all the earth rejoice.

G                         Em7
He wraps Himself in light, and darkness tries to hide,
                    C2
And trembles at his voice, trembles at his voice.

[Chorus]
G
How great is our God, sing with me,
Em7
How great is our God, and all will see,
C           D            G
How great, how great is our God.

[Verse 2]
G                         Em7
Age to age He stands, and time is in His hands,
C2
Beginning and the end, beginning and the end.

G                     Em7
The Godhead, three in one: Father, Spirit, Son,
C2
The Lion and the Lamb, the Lion and the Lamb.

[Chorus]
G
How great is our God, sing with me,
Em7
How great is our God, and all will see,
C           D            G
How great, how great is our God.

[Bridge]
G
Name above all names,
Em7
Worthy of all praise,
C
My heart will sing
D            G
How great is our God.

G
Name above all names,
Em7
Worthy of all praise,
C
My heart will sing
D            G
How great is our God.

[Chorus]
G
How great is our God, sing with me,
Em7
How great is our God, and all will see,
C           D            G
How great, how great is our God.

[Outro]
G
How great is our God, sing with me,
Em7
How great is our God, and all will see,
C          D            G
How great, how great is our God.`;
