import { describe, expect, it } from "vitest";
import {
  getNashvilleReference,
  toNashvilleChordSymbol,
} from "@/core/chords/nashville";

describe("Nashville number conversion", () => {
  it.each([
    ["C", "1"],
    ["Dm", "2m"],
    ["Em7", "3m7"],
    ["Fadd9", "4add9"],
    ["G7", "57"],
    ["Am", "6m"],
    ["Bdim", "7dim"],
  ])("converts %s in C major to %s", (chord, expected) => {
    expect(toNashvilleChordSymbol(chord, "C", "relative-major")).toBe(expected);
  });

  it("preserves enharmonic spelling for chromatic degrees", () => {
    expect(toNashvilleChordSymbol("F#dim7", "C", "relative-major")).toBe(
      "♯4dim7",
    );
    expect(toNashvilleChordSymbol("Gb", "C", "relative-major")).toBe("♭5");
    expect(toNashvilleChordSymbol("Eb", "C", "relative-major")).toBe("♭3");
  });

  it("converts slash bass notes and normalizes equivalent quality aliases", () => {
    expect(toNashvilleChordSymbol("G/B", "G", "relative-major")).toBe("1/3");
    expect(toNashvilleChordSymbol("D/F#", "G", "relative-major")).toBe("5/7");
    expect(toNashvilleChordSymbol("GMajor", "G", "relative-major")).toBe("1");
    expect(toNashvilleChordSymbol("Gminor", "G", "relative-major")).toBe("1m");
  });

  it("supports both minor-key conventions", () => {
    expect(getNashvilleReference("Am", "relative-major")).toEqual({
      root: "C",
      tonicLabel: "1 = C",
    });
    expect(toNashvilleChordSymbol("Am", "Am", "relative-major")).toBe("6m");
    expect(toNashvilleChordSymbol("Dm", "Am", "relative-major")).toBe("2m");
    expect(toNashvilleChordSymbol("E", "Am", "relative-major")).toBe("3");

    expect(getNashvilleReference("Am", "tonic-one")).toEqual({
      root: "A",
      tonicLabel: "1m = Am",
    });
    expect(toNashvilleChordSymbol("Am", "Am", "tonic-one")).toBe("1m");
    expect(toNashvilleChordSymbol("F", "Am", "tonic-one")).toBe("♭6");
    expect(toNashvilleChordSymbol("C", "Am", "tonic-one")).toBe("♭3");
    expect(toNashvilleChordSymbol("G", "Am", "tonic-one")).toBe("♭7");
    expect(toNashvilleChordSymbol("E", "Am", "tonic-one")).toBe("5");
  });

  it("accepts legacy formatted keys and rejects unsupported input", () => {
    expect(toNashvilleChordSymbol("Am", "A Minor", "relative-major")).toBe(
      "6m",
    );
    expect(toNashvilleChordSymbol("not-a-chord", "C", "relative-major")).toBe(
      null,
    );
    expect(toNashvilleChordSymbol("C", "", "relative-major")).toBe(null);
  });
});
