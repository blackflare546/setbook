import { describe, expect, it } from "vitest";
import {
  layoutChartLine,
  type DisplayChord,
} from "@/core/songs/chart-line-layout";
import type { SongLine } from "@/core/songs/types";

function line(lyrics: string, chords: DisplayChord[] = []): SongLine {
  return {
    id: "line",
    lyrics,
    chords: chords.map(({ id, symbol, position }) => ({ id, symbol, position })),
  };
}

function chord(
  id: string,
  symbol: string,
  position: number,
  displaySymbol = symbol,
): DisplayChord {
  return { id, symbol, position, displaySymbol };
}

describe("responsive chart line layout", () => {
  it("leaves a line intact when it fits", () => {
    const chords = [chord("g", "G", 6)];
    const source = line("Hello world", chords);

    expect(layoutChartLine(source, chords, 1, 20)).toEqual([
      expect.objectContaining({
        startColumn: 0,
        endColumn: 11,
        lyrics: "Hello world",
        columns: 11,
        overflows: false,
        chords: [expect.objectContaining({ renderedPosition: 6 })],
      }),
    ]);
    expect(source.lyrics).toBe("Hello world");
    expect(source.chords[0].position).toBe(6);
  });

  it("prefers a word boundary and rebases continuation chords", () => {
    const chords = [chord("c", "C", 6)];
    const fragments = layoutChartLine(
      line("Hello gentle world", chords),
      chords,
      1,
      12,
    );

    expect(fragments.map((fragment) => fragment.lyrics)).toEqual([
      "Hello ",
      "gentle world",
    ]);
    expect(fragments[1].chords[0]).toMatchObject({
      position: 6,
      renderedPosition: 0,
    });
  });

  it("hard-wraps a lyric token that is wider than the viewport", () => {
    const source = line("abcdefghijkl");
    expect(
      layoutChartLine(source, [], 1, 5).map((fragment) => fragment.lyrics),
    ).toEqual(["abcde", "fghij", "kl"]);
  });

  it("preserves leading spaces instead of isolating them", () => {
    const source = line("    Lead us home");
    expect(
      layoutChartLine(source, [], 1, 10).map((fragment) => fragment.lyrics),
    ).toEqual(["    Lead ", "us home"]);
  });

  it("keeps chord-only rows and chords beyond the lyric end", () => {
    const distant = chord("distant", "B", 18);
    const fragments = layoutChartLine(
      line("Short lyric", [distant]),
      [distant],
      1,
      10,
    );
    const chordFragment = fragments.find((fragment) => fragment.chords.length);
    expect(chordFragment?.chords[0]).toMatchObject({
      position: 18,
      renderedPosition: 2,
    });

    const chordOnly = chord("only", "C#m", 12);
    const chordOnlyFragments = layoutChartLine(
      line("", [chordOnly]),
      [chordOnly],
      1,
      8,
    );
    expect(chordOnlyFragments.at(-1)?.chords[0]).toMatchObject({
      position: 12,
      renderedPosition: 4,
    });
  });

  it("keeps adjacent chord anchors on the correct fragments", () => {
    const chords = [chord("c", "C", 4), chord("g", "G", 8)];
    const fragments = layoutChartLine(
      line("one two three four", chords),
      chords,
      1,
      10,
    );

    expect(fragments[0].chords[0]).toMatchObject({
      position: 4,
      renderedPosition: 4,
    });
    expect(fragments[1].chords[0]).toMatchObject({
      position: 8,
      renderedPosition: 0,
    });
  });

  it("uses displayed chord width and allows an indivisible chord to scroll", () => {
    const expanded = chord("expanded", "C", 0, "Cmaj7#11");
    const fragments = layoutChartLine(
      line("Sing", [expanded]),
      [expanded],
      1.5,
      8,
    );
    const [fragment] = fragments;

    expect(fragments).toHaveLength(1);
    expect(fragment.columns).toBe(12);
    expect(fragment.overflows).toBe(true);
    expect(fragment.chords[0].renderedPosition).toBe(0);
  });

  it("preserves blank rows", () => {
    expect(layoutChartLine(line(""), [], 1, 8)).toEqual([
      expect.objectContaining({
        lyrics: "",
        columns: 1,
        chords: [],
        overflows: false,
      }),
    ]);
  });
});
