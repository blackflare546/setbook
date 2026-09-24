import { describe, expect, it } from "vitest";
import {
  transposeChordSymbol,
  transposeSections,
} from "@/core/transpose/transpose";

describe("transposition", () => {
  it.each([
    ["G", 2, "A"],
    ["C/G", 2, "D/A"],
    ["F#m7", 2, "G#m7"],
    ["Bb", 2, "C"],
    ["F#m7/C#", 2, "G#m7/D#"],
    ["Cmaj7#11", 2, "Dmaj7#11"],
    ["Bm7b5", 2, "C#m7b5"],
  ])("transposes %s by %i", (input, steps, output) =>
    expect(transposeChordSymbol(input as string, steps as number)).toBe(output),
  );
  it("does not alter lyrics or mutate input", () => {
    const sections = [
      {
        id: "s",
        type: "verse" as const,
        title: "Verse",
        lines: [
          {
            id: "l",
            lyrics: "Stay G here",
            chords: [{ id: "c", symbol: "G", position: 5 }],
          },
        ],
      },
    ];
    const result = transposeSections(sections, 2);
    expect(result[0].lines[0].lyrics).toBe("Stay G here");
    expect(result[0].lines[0].chords[0].symbol).toBe("A");
    expect(sections[0].lines[0].chords[0].symbol).toBe("G");
  });
});
