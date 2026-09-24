import { describe, expect, it } from "vitest";
import {
  formatMusicalKey,
  MUSICAL_KEYS,
  parseMusicalKey,
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
