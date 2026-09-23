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
});
