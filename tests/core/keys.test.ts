import { describe, expect, it } from "vitest";
import {
  formatMusicalKey,
  MUSICAL_KEYS,
  parseMusicalKey,
  searchMusicalKeys,
  transposeMusicalKey,
} from "@/core/chords/keys";
import { semitoneDistance } from "@/core/transpose/transpose";

describe("musical keys", () => {
  it("provides normalized major and minor options from one source", () => {
    expect(MUSICAL_KEYS.some((key) => key.label === "G Major")).toBe(true);
    expect(MUSICAL_KEYS.some((key) => key.label === "E Minor")).toBe(true);
    expect(MUSICAL_KEYS.every((key) => parseMusicalKey(key.value))).toBe(true);
  });

  it("rejects arbitrary values", () => {
    expect(parseMusicalKey("whatever")).toBeNull();
    expect(parseMusicalKey("G-Major")).toBeNull();
  });

  it("searches the shared key list by root and mode", () => {
    expect(searchMusicalKeys("G").map((key) => key.label)).toEqual([
      "G Major",
      "G# Major",
      "Gb Major",
      "G Minor",
      "G# Minor",
      "Gb Minor",
    ]);
    expect(searchMusicalKeys("E minor").map((key) => key.label)).toEqual([
      "E Minor",
    ]);
    expect(searchMusicalKeys("F#").map((key) => key.label)).toEqual([
      "F# Major",
      "F# Minor",
    ]);
    expect(searchMusicalKeys("not a key")).toEqual([]);
  });

  it("formats normalized symbols for people", () => {
    expect(formatMusicalKey("G")).toBe("G Major");
    expect(formatMusicalKey("Em")).toBe("E Minor");
    expect(formatMusicalKey()).toBe("Not set");
  });

  it("transposes major and minor keys without changing mode", () => {
    expect(transposeMusicalKey("G", 2)).toBe("A");
    expect(transposeMusicalKey("Em", 2)).toBe("F#m");
    expect(semitoneDistance("G", "A")).toBe(2);
    expect(semitoneDistance("Em", "F#m")).toBe(2);
  });
});
