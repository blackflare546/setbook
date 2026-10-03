import { describe, expect, it } from "vitest";
import { parseSong } from "@/core/parser/parser";
import {
  arrangementToText,
  duplicateArrangementSection,
  parseSectionArrangement,
  removeArrangementSection,
  renameArrangementSection,
  reorderArrangement,
} from "@/core/parser/section-arrangement";

const SOURCE = `[Intro]
G

[Verse 1]
G       D
First verse lyric

[Chorus]
[C]Sing it [G]again

[Verse 2]
        C#                         A        B
Second verse lyric

[Chorus]
[C]Sing it [G]again

[Bridge]
Am
Bridge lyric

[Outro]
G
Last lyric`;

describe("Smart Paste section arrangement", () => {
  it("creates a badge model for every parsed section instance in order", () => {
    const arrangement = parseSectionArrangement(SOURCE);

    expect(arrangement.sections.map((item) => item.section.title)).toEqual([
      "Intro",
      "Verse 1",
      "Chorus",
      "Verse 2",
      "Chorus",
      "Bridge",
      "Outro",
    ]);
    expect(arrangement.sections[2].id).not.toBe(arrangement.sections[4].id);
    expect(arrangementToText(arrangement)).toBe(SOURCE);
  });

  it("reorders the section instance used by drag-and-drop with its exact content", () => {
    const arrangement = parseSectionArrangement(SOURCE);
    const chorus = arrangement.sections[2];
    const bridge = arrangement.sections[5];
    const moved = reorderArrangement(arrangement, bridge.id, chorus.id);
    const text = arrangementToText(moved);

    expect(moved.sections.map((item) => item.section.title)).toEqual([
      "Intro",
      "Verse 1",
      "Bridge",
      "Chorus",
      "Verse 2",
      "Chorus",
      "Outro",
    ]);
    expect(text.indexOf("Bridge lyric")).toBeLessThan(
      text.indexOf("Sing it [G]again"),
    );
    expect(bridge.section.lines[0].chords[0].symbol).toBe("Am");
  });

  it("renames only the heading and preserves lyrics and chord columns", () => {
    const arrangement = parseSectionArrangement(SOURCE);
    const verse = arrangement.sections[3];
    const beforePositions = verse.section.lines[0].chords.map(
      (chord) => chord.position,
    );
    const renamed = renameArrangementSection(
      arrangement,
      verse.id,
      "pre-chorus",
      "Pre-Chorus",
    );
    const text = arrangementToText(renamed);
    const reparsed = parseSong(text);
    const changed = reparsed.sections.find(
      (section) => section.title === "Pre-Chorus",
    );

    expect(text).toContain(
      "[Pre-Chorus]\n        C#                         A        B\nSecond verse lyric",
    );
    expect(changed?.lines[0].chords.map((chord) => chord.position)).toEqual(
      beforePositions,
    );
    expect(changed?.lines[0].lyrics).toBe("Second verse lyric");
  });

  it("removes only the selected section instance", () => {
    const arrangement = parseSectionArrangement(SOURCE);
    const firstChorus = arrangement.sections[2];
    const removed = removeArrangementSection(arrangement, firstChorus.id);

    expect(
      removed.sections.filter((item) => item.section.title === "Chorus"),
    ).toHaveLength(1);
    expect(
      arrangementToText(removed).match(/\[C\]Sing it \[G\]again/g),
    ).toHaveLength(1);
  });

  it("duplicates exact content as an independently editable instance", () => {
    const arrangement = parseSectionArrangement(SOURCE);
    const bridge = arrangement.sections[5];
    const duplicated = duplicateArrangementSection(arrangement, bridge.id);
    const original = duplicated.sections[5];
    const copy = duplicated.sections[6];

    expect(copy.source).toBe(original.source);
    expect(copy.id).not.toBe(original.id);
    expect(copy.section.lines[0].id).not.toBe(original.section.lines[0].id);
    expect(copy.section.lines[0].chords[0].id).not.toBe(
      original.section.lines[0].chords[0].id,
    );
    expect(arrangementToText(duplicated).match(/Bridge lyric/g)).toHaveLength(
      2,
    );

    const renamedCopy = renameArrangementSection(
      duplicated,
      copy.id,
      "outro",
      "Outro",
    );
    expect(renamedCopy.sections[5].section.title).toBe("Bridge");
    expect(renamedCopy.sections[6].section.title).toBe("Outro");
  });
});
