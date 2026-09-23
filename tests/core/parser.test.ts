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
    "G",
    "F#",
    "Bb",
    "Am",
    "C5",
    "Dm6",
    "E7",
    "Fmaj7",
    "Gmin7",
    "Bdim",
    "Caug",
    "Dsus2",
    "Esus4",
    "Fadd9",
    "C/G",
    "D/F#",
    "C2",
    "D2",
  ])("accepts %s", (value) => expect(parseChord(value)).not.toBeNull());
  it.each(["Avenue", "Be", "Garden", "hello", "H7", "Amazing"])(
    "rejects ordinary word %s",
    (value) => expect(parseChord(value)).toBeNull(),
  );
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
  it("splits a compact chord prefix without changing the lyric", () => {
    const [line] = parseText("Em7The splendor of a King")[0].lines;
    expect(line.lyrics).toBe("The splendor of a King");
    expect(line.chords.map((chord) => [chord.symbol, chord.position])).toEqual([
      ["Em7", 0],
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
